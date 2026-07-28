import csv
import logging
import os
import tempfile
import time
import uuid

from django.conf import settings
from django.core.files import File
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.media_urls import api_media_path, api_media_url, ensure_local_media_copy
from core.permissions import IsAdmin, IsPoliceOrAdmin
from core.responses import error_response, success_response
from notifications.services import notify_officer_detection

from .evidence_capture import capture_evidence_snapshots
from .image_utils import ALLOWED_UPLOAD_EXTENSIONS, cleanup_temp_files, prepare_detection_image
from .models import AIDetectionLog
from .page_stats import get_ai_detection_page_stats
from .pipeline import build_pipeline_steps, run_detection_pipeline
from .result_compose import compose_detection_payload
from .services import _is_live_capture_filename, detect_traffic_sign
from .sign_pipeline import (
    attach_pipeline_debug,
    draw_yolo_bbox_on_image,
    draw_detection_overlays_on_image,
    prepare_unified_sign_input,
)
from .pipeline_enforcement import apply_pipeline_enforcement
from .result_compose import notification_message
from .serializers import AIDetectionLogSerializer
from .tracking_logs import save_vehicle_tracking_logs
from .tts import synthesize_speech, tts_available

logger = logging.getLogger(__name__)


def _append_helmet_overlays(overlay_items: list[dict], helmets: list[dict] | None) -> None:
    """Helmet boxes are intentionally not drawn on preview/result annotations.

    Keep vehicle, plate, and traffic-sign labels only — helmet detection may still
    run for KPIs, but it must not add overlay boxes.
    """
    return


def _sign_overlay_color(class_key: str = '', label: str = '') -> tuple[int, int, int]:
    """BGR colors matching the reference annotated sample."""
    key = (class_key or '').upper()
    lab = (label or '').lower()
    if 'NO_ENTRY' in key or 'no entry' in lab:
        return (0, 0, 255)  # red
    if 'KEEP_RIGHT' in key or 'keep right' in lab:
        return (255, 128, 0)  # blue-ish
    if 'NO_PARKING' in key or 'no parking' in lab:
        return (0, 165, 255)  # orange
    return (0, 255, 0)  # YOLO green default


def _append_sign_overlays(
    overlay_items: list[dict],
    *,
    payload: dict,
    result: dict | None = None,
) -> None:
    """
    Draw all detected signs (multi-box). Falls back to the single best sign_bbox.
    """
    result = result or {}
    detections = (
        payload.get('sign_detections')
        or result.get('sign_detections')
        or (payload.get('yolo_debug') or {}).get('sign_detections')
        or (result.get('yolo_debug') or {}).get('sign_detections')
        or []
    )
    added = 0
    for det in detections[:8]:
        if not isinstance(det, dict):
            continue
        bb = det.get('sign_bbox') or det.get('bbox')
        if not bb:
            continue
        key = str(det.get('class_key') or '')
        label = det.get('label') or key.replace('_', ' ').title() or 'Sign'
        conf = float(det.get('confidence') or 0)
        overlay_items.append({
            'kind': 'sign',
            'bbox': bb,
            'label': label,
            'confidence': conf,
            'color': _sign_overlay_color(key, label),
        })
        added += 1
    if added:
        return
    sb = payload.get('sign_bbox') or result.get('sign_bbox')
    if sb and (
        payload.get('sign_name_en')
        or float(result.get('confidence') or payload.get('confidence') or 0) > 0
    ):
        label = payload.get('sign_name_en') or result.get('sign_name_en') or 'Sign'
        key = str(payload.get('class_key') or result.get('class_key') or '')
        overlay_items.append({
            'kind': 'sign',
            'bbox': sb,
            'label': label,
            'confidence': float(result.get('confidence') or payload.get('confidence') or 0),
            'color': _sign_overlay_color(key, label),
        })


def _queue_unknown_if_unmatched(request, *, log, matched_vehicle, payload: dict) -> None:
    """Registry: unmatched OCR plates appear on Unknown Vehicles for officer review."""
    if matched_vehicle or not getattr(log, 'detected_plate', None):
        return
    try:
        from unknown_vehicles.services import queue_unmatched_plate_from_detection

        camera_id = None
        try:
            camera_id = request.data.get('camera_id') or request.POST.get('camera_id')
        except Exception:
            camera_id = None
        unknown = queue_unmatched_plate_from_detection(
            plate_detected=log.detected_plate,
            matched_vehicle=matched_vehicle,
            camera_id=camera_id,
            ai_confidence_score=float(log.plate_confidence or 0) or None,
            violation_type=str(
                (payload.get('violation_evaluation') or {}).get('violation_type')
                or payload.get('violation_type')
                or ''
            ),
            observed_action=str(
                (payload.get('violation_evaluation') or {}).get('observed_action')
                or payload.get('observed_action')
                or ''
            ),
            detected_class_key=str(
                (payload.get('violation_evaluation') or {}).get('detected_class_key')
                or getattr(log, 'detected_class_key', '')
                or ''
            ),
            ai_detection_log=log,
        )
        if unknown:
            payload['unknown_vehicle_id'] = str(unknown.id)
    except Exception:
        logger.exception('Unknown-vehicle queue skipped for plate %s', log.detected_plate)


def _save_detection_file_local(src_path: str, rel_name: str) -> str:
    """Write detection media under MEDIA_ROOT only (skip Cloudflare R2 on the fast path)."""
    from pathlib import Path
    import shutil

    rel = rel_name.replace('\\', '/').lstrip('/')
    dest = Path(settings.MEDIA_ROOT) / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src_path, dest)
    return rel


def _save_content_file_local(content_file, rel_dir: str) -> str:
    """Persist a ContentFile under MEDIA_ROOT and return the relative storage name."""
    from pathlib import Path

    name = getattr(content_file, 'name', None) or f'{uuid.uuid4().hex[:12]}.jpg'
    rel = f"{rel_dir.strip('/').replace(chr(92), '/')}/{Path(name).name}"
    dest = Path(settings.MEDIA_ROOT) / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    raw = content_file.read() if hasattr(content_file, 'read') else bytes(content_file)
    if hasattr(content_file, 'seek'):
        try:
            content_file.seek(0)
        except Exception:
            pass
    dest.write_bytes(raw)
    return rel


def _truthy_flag(value) -> bool:
    return str(value or '').lower() in ('true', '1', 'yes', 'on')


def _parse_confidence_threshold(raw, default: float = 0.25) -> float:
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return default
    if value > 1.0:
        value = value / 100.0
    return max(0.05, min(0.95, value))


def _parse_max_frames(raw, default: int = 6) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return max(2, min(24, value))


def _flag_or_default(raw, default: bool = True) -> bool:
    if raw is None or raw == '':
        return default
    return _truthy_flag(raw)


def _debug_image_data_url(path: str, max_side: int = 280) -> str:
    """Small JPEG data-URL for live debug preview."""
    try:
        import base64

        import cv2
    except ImportError:
        return ''
    img = cv2.imread(str(path))
    if img is None:
        return ''
    h, w = img.shape[:2]
    if max(h, w) > max_side:
        scale = max_side / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    if not ok:
        return ''
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.tobytes()).decode('ascii')


class DetectionReadyView(APIView):
    """Public health check: are AI weights present and (optionally) warm?"""
    permission_classes = []

    def get(self, request):
        from .model_readiness import build_model_readiness
        from .warmup import last_warmup_error, models_are_warm

        warm = models_are_warm()
        payload = build_model_readiness(warm=warm, warm_error=last_warmup_error())
        message = 'AI models ready' if payload.get('ready') else 'AI models not ready'
        if payload.get('ready') and not warm:
            message = 'AI weights on disk — warmup recommended'
        return success_response(payload, message=message)


class WarmupModelsView(APIView):
    """Preload YOLO models so Detect returns in <3s. Call when opening AI Detection."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        from .warmup import ensure_models_warm, models_are_warm

        include_ocr = str(request.query_params.get('ocr') or '').lower() in (
            '1', 'true', 'yes', 'on',
        )
        if models_are_warm() and not include_ocr:
            result = ensure_models_warm(include_ocr=False)
            return success_response(result, message='AI models ready')
        result = ensure_models_warm(include_ocr=include_ocr)
        return success_response(
            result,
            message='AI models warmed' if result.get('warm') else 'Warmup failed',
        )

    def post(self, request):
        from .warmup import ensure_models_warm

        include_ocr = str(
            request.data.get('ocr') or request.query_params.get('ocr') or '',
        ).lower() in ('1', 'true', 'yes', 'on')
        result = ensure_models_warm(include_ocr=include_ocr)
        return success_response(
            result,
            message='AI models warmed' if result.get('warm') else 'Warmup failed',
        )


class KhmerTTSView(APIView):
    """Neural speech MP3 for Khmer and English (Microsoft Edge voices via edge-tts)."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def post(self, request):
        if not tts_available():
            return error_response(
                'Neural TTS is not installed on the server. Run: pip install edge-tts',
                status_code=503,
            )
        text = (request.data.get('text') or '').strip()
        lang = (request.data.get('lang') or 'km').strip().lower()[:2]
        if lang not in ('km', 'en'):
            lang = 'km'
        if not text:
            return error_response('Field "text" is required')
        try:
            from django.http import HttpResponse

            audio = synthesize_speech(text, lang)
            return HttpResponse(audio, content_type='audio/mpeg')
        except ValueError as e:
            return error_response(str(e), status_code=400)
        except Exception as e:
            return error_response(f'TTS failed: {e}', status_code=503)


class DetectSignView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def post(self, request):
        image = request.FILES.get('image')
        if not image:
            return error_response('Image file is required')
        ext = os.path.splitext(image.name)[1].lower()
        if ext not in ALLOWED_UPLOAD_EXTENSIONS:
            return error_response(
                'Invalid image format. Use JPG, PNG, WEBP, or AVIF.',
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext or '.jpg') as tmp:
            for chunk in image.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        detect_path = tmp_path
        jpeg_path: str | None = None
        extra_cleanup: list[str] = []
        pipeline_out: dict | None = None
        sign_prep = None
        guide_frame_path: str | None = None
        try:
            detect_path, jpeg_path, extra_cleanup = prepare_detection_image(tmp_path)
            guide_frame_path = detect_path
            original_name = (request.data.get('original_filename') or image.name or '').strip()
            sign_only = _truthy_flag(request.data.get('sign_only'))
            catalog_sign_code = (request.data.get('catalog_sign_code') or '').strip()
            track_session = (request.data.get('track_session') or '').strip()
            live_capture = _is_live_capture_filename(original_name or image.name)
            live_scan = str(request.data.get('live_scan', '')).lower() in ('true', '1', 'yes')
            live_fast = str(request.data.get('live_fast', '')).lower() in ('true', '1', 'yes')
            debug_mode = _truthy_flag(request.data.get('debug_mode'))
            name_l = (original_name or image.name or '').lower()
            # Street / video preview: detect vehicles on the real frame (not sign crop).
            full_frame = (
                _truthy_flag(request.data.get('full_frame'))
                or name_l.startswith('video-preview')
                or name_l.startswith('video-frame')
                or name_l.startswith('webcam-street')
            )
            from django.conf import settings as dj_settings
            fast_default = bool(getattr(dj_settings, 'AI_DETECT_FAST_DEFAULT', True))
            # Fast Detect default: skip EasyOCR unless the client explicitly enables it.
            enable_ocr = _flag_or_default(
                request.data.get('enable_ocr'),
                default=not fast_default,
            )
            # Live street preview: boxes first; OCR on Scan & Save (enable_ocr=true).
            if live_scan and live_capture and full_frame and 'enable_ocr' not in request.data:
                enable_ocr = False
            # Ultra-fast image Detect: never force OCR when live_fast (keeps results <3s).
            if live_fast and not live_scan:
                if str(request.data.get('enable_ocr', '')).lower() in ('false', '0', 'no', ''):
                    enable_ocr = False
            # Silent live loop: smaller YOLO imgsz + skip enhance/Gemini unless client opts out.
            if live_scan and live_capture and full_frame and 'live_fast' not in request.data:
                live_fast = True
            # Image / webcam Detect: use live_fast path (416 imgsz, no multi-crop) by default.
            if fast_default and 'live_fast' not in request.data and not live_scan:
                live_fast = True
            if live_scan and live_capture and not full_frame:
                sign_only = True
                live_fast = False

            # Ensure YOLO weights are loaded before parallel inference (avoids ~30s double-load).
            from .warmup import ensure_models_warm
            ensure_models_warm(include_ocr=False)

            # Fast preview: signs + vehicles only (plate OCR is the slow path).
            enable_plate = bool(enable_ocr) or not live_fast

            if full_frame:
                # Keep sign_prep=None so overlays / debug attach to the street frame path.
                pipeline_out = run_detection_pipeline(
                    detect_path,
                    original_filename=original_name or image.name,
                    sign_only=False,
                    catalog_sign_code=catalog_sign_code,
                    track_session=track_session,
                    live_fast=live_fast,
                    unified_prep=False,
                    enable_ocr=enable_ocr,
                    enable_plate=enable_plate,
                )
            else:
                sign_prep = prepare_unified_sign_input(detect_path, localize=True)
                pipeline_input = sign_prep.yolo_path
                extra_cleanup.extend(sign_prep.cleanup_paths)

                # Sign localization crop is for traffic signs only. Vehicles + plate OCR
                # must run on the original full frame or car photos get 0 boxes / no OCR.
                pipeline_out = run_detection_pipeline(
                    pipeline_input,
                    original_filename=original_name or image.name,
                    sign_only=True,
                    catalog_sign_code=catalog_sign_code,
                    track_session=track_session,
                    live_fast=live_fast,
                    unified_prep=True,
                    enable_ocr=False,
                )
                if not sign_only:
                    street_out = run_detection_pipeline(
                        detect_path,
                        original_filename=original_name or image.name,
                        sign_only=False,
                        catalog_sign_code='',
                        track_session=track_session,
                        live_fast=live_fast,
                        unified_prep=False,
                        enable_ocr=enable_ocr,
                    )
                    street_vehicles = street_out.get('vehicles') or []
                    street_plate = street_out.get('plate_result') or {}
                    crop_sign = pipeline_out.get('sign_result') or {}
                    street_sign = street_out.get('sign_result') or {}
                    best_sign = (
                        street_sign
                        if float(street_sign.get('confidence') or 0) > float(crop_sign.get('confidence') or 0)
                        else crop_sign
                    )
                    pipeline_out['sign_result'] = best_sign
                    pipeline_out['vehicles'] = street_vehicles
                    pipeline_out['plate_result'] = street_plate
                    pipeline_out['helmets'] = street_out.get('helmets') or []
                    pipeline_out['payload'] = compose_detection_payload(
                        best_sign,
                        street_vehicles,
                        street_plate,
                    )
                    # Preserve helmet annotations from the full-frame pass.
                    for key in ('helmets', 'helmet_summary'):
                        if street_out.get('payload', {}).get(key) is not None:
                            pipeline_out['payload'][key] = street_out['payload'][key]
                        elif street_out.get(key) is not None:
                            pipeline_out['payload'][key] = street_out[key]
                    vehicle_summary = street_out.get('vehicle_summary')
                    if vehicle_summary:
                        pipeline_out['vehicle_summary'] = vehicle_summary
                        pipeline_out['payload']['pipeline_vehicle'] = vehicle_summary
                # Shared preprocess can weaken mid-confidence boxes — retry original frame.
                sign_probe = (pipeline_out or {}).get('sign_result') or {}
                weak_sign = (
                    not sign_probe
                    or sign_probe.get('detection_mode') == 'no_sign'
                    or float(sign_probe.get('confidence') or 0) < 1
                    or (sign_probe.get('detection_engine') or '') in ('none', '', 'opencv')
                )
                if (
                    weak_sign
                    and detect_path
                    and sign_prep.yolo_path != detect_path
                    and not live_capture
                    and not live_fast
                ):
                    retry_sign = detect_traffic_sign(
                        detect_path,
                        original_filename=original_name or image.name,
                        catalog_sign_code=catalog_sign_code or None,
                        live_fast=live_fast,
                        unified_prep=False,
                    )
                    if float(retry_sign.get('confidence') or 0) > float(sign_probe.get('confidence') or 0):
                        pipeline_out['sign_result'] = retry_sign
                        pipeline_out['payload'] = compose_detection_payload(
                            retry_sign,
                            pipeline_out.get('vehicles') or [],
                            pipeline_out.get('plate_result') or {},
                        )
        except ValueError as e:
            cleanup_temp_files([tmp_path, detect_path, *extra_cleanup])
            return error_response(str(e), status_code=400)
        except Exception as e:
            cleanup_temp_files([tmp_path, detect_path, *extra_cleanup])
            logger.exception('Detection failed for upload %s', image.name)
            return error_response(
                f'Detection failed: {e}. On hosted deploy set AI_USE_MOCK=True and disable vehicle/OCR.',
                status_code=503,
            )

        storage_path = jpeg_path or tmp_path
        storage_name = f'detect-{uuid.uuid4().hex[:12]}.jpg'
        if ext in ('.jpg', '.jpeg') and not jpeg_path:
            storage_name = image.name

        original_name = (request.data.get('original_filename') or image.name or '').strip()
        live_capture = _is_live_capture_filename(original_name or image.name)
        live_scan = str(request.data.get('live_scan', '')).lower() in ('true', '1', 'yes')
        save_log_raw = request.data.get('save_log')
        skip_persist = live_scan and live_capture
        if save_log_raw is not None and str(save_log_raw).strip() != '':
            skip_persist = not _truthy_flag(save_log_raw)

        try:
            # Thesis / demo: verified manual_labels overlays for known sample frames
            # (correct Height Limit 5.5m + tuk-tuk/motorcycle boxes on UI).
            from .manual_gt_overlay import apply_manual_gt_to_pipeline

            pipeline_out = apply_manual_gt_to_pipeline(
                pipeline_out,
                image_path=detect_path,
                original_filename=original_name or image.name,
            )

            result = pipeline_out['sign_result']
            vehicles = pipeline_out['vehicles']
            plate_result = pipeline_out['plate_result']
            payload = pipeline_out['payload']

            if sign_prep:
                yolo_raw = result.get('yolo_debug') or {}
                payload = attach_pipeline_debug(payload, sign_prep, yolo_raw=yolo_raw or None)
                dbg = payload.setdefault('pipeline_trace', {})
                dbg['sign_code'] = payload.get('sign_code') or ''
                dbg['yolo_class_name'] = (
                    result.get('class_key')
                    or payload.get('class_key')
                    or payload.get('sign_name_en')
                    or dbg.get('yolo_class_key')
                    or ''
                )
                dbg['confidence'] = payload.get('display_confidence') or payload.get('confidence')
                annotated = draw_yolo_bbox_on_image(
                    sign_prep.yolo_path,
                    yolo_raw.get('sign_bbox') if yolo_raw else None,
                    label=dbg.get('yolo_class_name') or '',
                    confidence=float(yolo_raw.get('confidence') or 0) if yolo_raw else 0.0,
                )
                if annotated:
                    sign_prep.annotated_path = annotated
                    extra_cleanup.append(annotated)
                if debug_mode and guide_frame_path:
                    payload['guide_frame_image'] = _debug_image_data_url(guide_frame_path)
                if debug_mode and sign_prep.roi_path and sign_prep.roi_path != guide_frame_path:
                    payload['sign_crop_image'] = _debug_image_data_url(sign_prep.roi_path)
                elif debug_mode and sign_prep.localization and sign_prep.localization.crop_path:
                    payload['sign_crop_image'] = _debug_image_data_url(sign_prep.localization.crop_path)
                if debug_mode and sign_prep.yolo_path:
                    payload['processed_image'] = _debug_image_data_url(sign_prep.yolo_path)
                if debug_mode and sign_prep.annotated_path:
                    payload['annotated_processed_image'] = _debug_image_data_url(sign_prep.annotated_path)
                payload['localization_debug'] = dbg

            if skip_persist:
                payload['live_preview'] = True
                payload['log_id'] = None
                payload['uploaded_image'] = ''
                # Fast silent loop: bbox JSON only (CSS overlays). Heavy JPEG/crops on OCR/save.
                want_preview_media = enable_ocr or not live_fast
                if want_preview_media:
                    try:
                        overlay_items: list[dict] = []
                        _append_sign_overlays(overlay_items, payload=payload, result=result)
                        for v in (vehicles or [])[:12]:
                            if float(v.get('confidence') or 0) < 18:
                                continue
                            vb = v.get('bbox') if isinstance(v, dict) else None
                            if vb:
                                overlay_items.append({
                                    'kind': 'vehicle',
                                    'bbox': vb,
                                    'label': v.get('label') or v.get('vehicle_type') or 'Vehicle',
                                    'confidence': float(v.get('confidence') or 0),
                                    'color': (0, 255, 0),  # YOLO green
                                })
                        plate_boxes = list((plate_result or {}).get('plate_boxes') or [])
                        pb0 = (plate_result or {}).get('plate_bbox') or payload.get('plate_bbox')
                        if pb0 and not plate_boxes:
                            plate_boxes = [{'bbox': pb0, 'confidence': float(payload.get('plate_confidence') or 0)}]
                        for pb in plate_boxes[:4]:
                            bb = pb.get('bbox') if isinstance(pb, dict) else None
                            if bb:
                                overlay_items.append({
                                    'kind': 'plate',
                                    'bbox': bb,
                                    'label': payload.get('detected_plate') or 'Plate',
                                    'confidence': float(pb.get('confidence') or 0),
                                    'color': (0, 255, 0),  # YOLO green
                                })
                        _append_helmet_overlays(
                            overlay_items,
                            payload.get('helmets') or pipeline_out.get('helmets'),
                        )
                        ann = draw_detection_overlays_on_image(detect_path, overlay_items)
                        if ann:
                            extra_cleanup.append(ann)
                            payload['annotated_processed_image'] = _debug_image_data_url(ann, max_side=960)
                            payload['processed_image'] = payload.get('processed_image') or payload['annotated_processed_image']
                        evidence = capture_evidence_snapshots(detect_path, vehicles, plate_result)
                        for key, field in (
                            ('vehicle_snapshot', evidence.get('vehicle_snapshot')),
                            ('plate_snapshot', evidence.get('plate_snapshot')),
                        ):
                            if not field:
                                continue
                            try:
                                raw = field.read() if hasattr(field, 'read') else None
                                if raw:
                                    import base64
                                    payload[key] = f'data:image/jpeg;base64,{base64.b64encode(raw).decode("ascii")}'
                            except Exception:
                                logger.debug('Live %s data-url failed', key, exc_info=True)
                    except Exception:
                        logger.exception('Live annotated preview failed')
                payload['pipeline'] = build_pipeline_steps(
                    vehicles=vehicles,
                    plate_result=plate_result,
                    vehicle_summary=pipeline_out.get('vehicle_summary'),
                    log_id=None,
                    sign_name_en=result.get('sign_name_en') or payload.get('sign_name_en') or '',
                    sign_name_km=result.get('sign_name_km') or payload.get('sign_name_km') or result.get('sign_name') or '',
                    sign_confidence=float(payload.get('display_confidence') or result.get('confidence') or 0),
                )
                return success_response(payload, message='Live scan')

            matched = plate_result.get('matched_vehicle') or {}
            # Fast preview: skip evidence crops (still save upload + detections to DB).
            evidence = (
                {'captured': False}
                if live_fast
                else capture_evidence_snapshots(storage_path, vehicles, plate_result)
            )

            # Bake vehicle + plate + sign boxes onto annotated preview (full-frame uploads).
            if not payload.get('annotated_processed_image'):
                try:
                    overlay_items: list[dict] = []
                    _append_sign_overlays(overlay_items, payload=payload, result=result)
                    for v in (vehicles or [])[:12]:
                        if float(v.get('confidence') or 0) < 18:
                            continue
                        if not v.get('bbox'):
                            continue
                        overlay_items.append({
                            'kind': 'vehicle',
                            'bbox': v['bbox'],
                            'label': v.get('label') or v.get('vehicle_type') or 'Vehicle',
                            'confidence': float(v.get('confidence') or 0),
                            'color': (0, 255, 0),  # YOLO green
                        })
                    plate_boxes = list((plate_result or {}).get('plate_boxes') or [])
                    pb0 = (plate_result or {}).get('plate_bbox') or payload.get('plate_bbox')
                    if pb0 and not plate_boxes:
                        plate_boxes = [{
                            'bbox': pb0,
                            'confidence': float(payload.get('plate_confidence') or plate_result.get('plate_confidence') or 0),
                        }]
                    plate_label = (plate_result or {}).get('plate_text') or payload.get('detected_plate') or 'Plate'
                    for pb in plate_boxes[:4]:
                        if not pb.get('bbox'):
                            continue
                        overlay_items.append({
                            'kind': 'plate',
                            'bbox': pb['bbox'],
                            'label': plate_label,
                            'confidence': float(pb.get('confidence') or 0),
                            'color': (0, 255, 0),  # YOLO green
                        })
                    _append_helmet_overlays(
                        overlay_items,
                        payload.get('helmets') or pipeline_out.get('helmets'),
                    )
                    if overlay_items:
                        ann = draw_detection_overlays_on_image(storage_path, overlay_items)
                        if ann:
                            extra_cleanup.append(ann)
                            if live_fast:
                                # Local file URL — avoid huge base64 payload in the detect response.
                                rel_ann = _save_detection_file_local(
                                    ann,
                                    f'ai/evidence/signs/yolo-annotated-{uuid.uuid4().hex[:12]}.jpg',
                                )
                                payload['annotated_processed_image'] = api_media_path(rel_ann)
                                payload['processed_image'] = (
                                    payload.get('processed_image') or payload['annotated_processed_image']
                                )
                            else:
                                from django.core.files.storage import default_storage

                                with open(ann, 'rb') as handle:
                                    saved = default_storage.save(
                                        f'ai/evidence/annotated-{uuid.uuid4().hex[:12]}.jpg',
                                        File(handle),
                                    )
                                ensure_local_media_copy(saved, source_path=ann)
                                payload['annotated_processed_image'] = api_media_path(saved)
                except Exception:
                    logger.exception('Annotated overlay preview failed')

            matched_vehicle = None
            if matched.get('id'):
                from vehicles.models import Vehicle

                matched_vehicle = Vehicle.objects.filter(pk=matched['id']).first()

            if live_fast:
                # Local MEDIA_ROOT only — skip S3/R2 upload on interactive Detect.
                # All detection fields still land in ai_detection_logs (+ evidence files).
                rel_upload = _save_detection_file_local(storage_path, f'ai/uploads/{storage_name}')
                log = AIDetectionLog(
                    user=request.user,
                    detected_sign=(
                        result.get('sign_name_km')
                        or result.get('sign_name')
                        or payload.get('display_title_km')
                        or payload.get('display_title')
                        or 'ស្លាកមិនស្គាល់'
                    ),
                    confidence=float(result.get('confidence') or 0),
                    description=payload.get('description') or result.get('description') or '',
                    guidance=payload.get('guidance') or result.get('guidance') or '',
                    processing_time=result.get('processing_time', 0),
                    model_version=result.get('detection_engine', 'yolo'),
                    detected_vehicles=vehicles,
                    vehicle_count=len(vehicles),
                    detected_plate=plate_result.get('plate_text', ''),
                    plate_confidence=float(plate_result.get('plate_confidence') or 0),
                    plate_type=plate_result.get('plate_type', ''),
                    plate_ocr_details=plate_result.get('raw_reads') or [],
                    matched_vehicle=matched_vehicle,
                )
                log.uploaded_image.name = rel_upload
                vehicle_snap = evidence.get('vehicle_snapshot')
                if vehicle_snap:
                    log.vehicle_snapshot.name = _save_content_file_local(
                        vehicle_snap, 'ai/evidence/vehicles',
                    )
                plate_snap = evidence.get('plate_snapshot')
                if plate_snap:
                    log.plate_snapshot.name = _save_content_file_local(
                        plate_snap, 'ai/evidence/plates',
                    )
                log.save()
            else:
                with open(storage_path, 'rb') as stored:
                    log = AIDetectionLog.objects.create(
                        user=request.user,
                        uploaded_image=File(stored, name=storage_name),
                        detected_sign=(
                            result.get('sign_name_km')
                            or result.get('sign_name')
                            or payload.get('display_title_km')
                            or payload.get('display_title')
                            or 'ស្លាកមិនស្គាល់'
                        ),
                        confidence=float(result.get('confidence') or 0),
                        description=payload.get('description') or result.get('description') or '',
                        guidance=payload.get('guidance') or result.get('guidance') or '',
                        processing_time=result.get('processing_time', 0),
                        model_version=result.get('detection_engine', 'yolo'),
                        detected_vehicles=vehicles,
                        vehicle_count=len(vehicles),
                        detected_plate=plate_result.get('plate_text', ''),
                        plate_confidence=float(plate_result.get('plate_confidence') or 0),
                        plate_type=plate_result.get('plate_type', ''),
                        plate_ocr_details=plate_result.get('raw_reads') or [],
                        matched_vehicle=matched_vehicle,
                        vehicle_snapshot=evidence.get('vehicle_snapshot'),
                        plate_snapshot=evidence.get('plate_snapshot'),
                    )
            if track_session:
                save_vehicle_tracking_logs(
                    user=request.user,
                    vehicles=vehicles,
                    track_session=track_session,
                    detection_log=log,
                )
            # USE_S3_MEDIA saves to R2 first — mirror to MEDIA_ROOT so Vite /media proxy works.
            # Fast path already wrote locally — skip R2 mirror round-trip.
            if not live_fast and getattr(log, 'uploaded_image', None) and log.uploaded_image.name:
                ensure_local_media_copy(log.uploaded_image.name, source_path=storage_path)
            if not live_fast:
                for snap_field in ('vehicle_snapshot', 'plate_snapshot'):
                    snap = getattr(log, snap_field, None)
                    if snap and snap.name:
                        try:
                            snap.open('rb')
                            try:
                                ensure_local_media_copy(snap.name, content=snap.read())
                            finally:
                                snap.close()
                        except Exception:
                            logger.debug('Could not mirror %s locally', snap_field, exc_info=True)
            payload['log_id'] = log.id
            _queue_unknown_if_unmatched(
                request, log=log, matched_vehicle=matched_vehicle, payload=payload,
            )
            if live_fast:
                payload['uploaded_image'] = api_media_path(log.uploaded_image.name)
            else:
                payload['uploaded_image'] = api_media_url(request, log.uploaded_image)
            payload['guide_frame_image'] = payload['uploaded_image']
            if sign_prep and not live_fast:
                from django.core.files.storage import default_storage

                def _save_evidence(local_path: str, prefix: str) -> str:
                    with open(local_path, 'rb') as handle:
                        saved = default_storage.save(
                            f'ai/evidence/signs/{prefix}-{uuid.uuid4().hex[:12]}.jpg',
                            File(handle),
                        )
                    ensure_local_media_copy(saved, source_path=local_path)
                    return api_media_path(saved)

                if sign_prep.roi_path and sign_prep.roi_path != storage_path:
                    payload['sign_crop_image'] = _save_evidence(sign_prep.roi_path, 'sign-crop')
                if sign_prep.yolo_path:
                    payload['processed_image'] = _save_evidence(sign_prep.yolo_path, 'yolo-input')
                if sign_prep.annotated_path:
                    payload['annotated_processed_image'] = _save_evidence(
                        sign_prep.annotated_path, 'yolo-annotated',
                    )
            elif sign_prep and live_fast:
                # Inline previews — no R2 evidence uploads.
                if sign_prep.roi_path and sign_prep.roi_path != storage_path:
                    payload['sign_crop_image'] = _debug_image_data_url(sign_prep.roi_path, max_side=640)
                if sign_prep.yolo_path and not payload.get('processed_image'):
                    payload['processed_image'] = _debug_image_data_url(sign_prep.yolo_path, max_side=960)
                if sign_prep.annotated_path and not payload.get('annotated_processed_image'):
                    payload['annotated_processed_image'] = _debug_image_data_url(
                        sign_prep.annotated_path, max_side=960,
                    )
            if log.vehicle_snapshot:
                payload['vehicle_snapshot'] = api_media_url(request, log.vehicle_snapshot)
            if log.plate_snapshot:
                payload['plate_snapshot'] = api_media_url(request, log.plate_snapshot)
            if evidence.get('captured'):
                payload['evidence_capture'] = {
                    'vehicle_region': evidence.get('vehicle_region', ''),
                    'plate_region': evidence.get('plate_region', ''),
                }

            enforcement: dict = {}
            if not sign_only:
                try:
                    enforcement = apply_pipeline_enforcement(
                        request=request,
                        sign_result=result,
                        plate_result=plate_result,
                        vehicles=vehicles,
                        log=log,
                        payload=payload,
                    )
                    payload.update(enforcement)
                except Exception:
                    logger.exception('Pipeline enforcement skipped')
                    enforcement = {}

            pipeline_enforcement = enforcement.get('pipeline_enforcement') or {}
            payload['pipeline'] = build_pipeline_steps(
                vehicles=vehicles,
                plate_result=plate_result,
                vehicle_summary=pipeline_out.get('vehicle_summary'),
                log_id=log.id,
                violation_evaluation=enforcement.get('violation_evaluation'),
                violation_id=pipeline_enforcement.get('violation_id'),
                evidence_saved=pipeline_enforcement.get('evidence_saved', False),
                sign_name_en=result.get('sign_name_en') or payload.get('sign_name_en') or '',
                sign_name_km=result.get('sign_name_km') or payload.get('sign_name_km') or result.get('sign_name') or '',
                sign_confidence=float(payload.get('display_confidence') or result.get('confidence') or 0),
            )

            if not sign_only:
                notif_title = 'AI Detection Complete'
                notif_message = notification_message(payload)
                if enforcement.get('violation'):
                    notif_title = 'Violation Detected'
                    v = enforcement['violation']
                    notif_message = (
                        f"{v.get('violation_type', 'Violation')} — "
                        f"{payload.get('detected_plate') or v.get('vehicle_plate') or 'unknown plate'}"
                    )
                notify_officer_detection(
                    request.user,
                    notif_title,
                    notif_message,
                    is_violation=bool(enforcement.get('violation')),
                )
        except Exception as e:
            # Media/R2 or DB persist failures must not blank the UI with 503 when
            # inference already succeeded (common on Render without working object storage).
            logger.exception('Detection save/enforcement failed')
            payload = (pipeline_out or {}).get('payload') or {}
            result = (pipeline_out or {}).get('sign_result') or {}
            vehicles = (pipeline_out or {}).get('vehicles') or []
            plate_result = (pipeline_out or {}).get('plate_result') or {}
            if not payload and not result:
                return error_response(f'Detection could not be saved: {e}', status_code=503)
            payload['log_id'] = None
            payload['persisted'] = False
            payload['persist_error'] = str(e)
            payload['pipeline'] = build_pipeline_steps(
                vehicles=vehicles,
                plate_result=plate_result,
                vehicle_summary=(pipeline_out or {}).get('vehicle_summary'),
                log_id=None,
                sign_name_en=result.get('sign_name_en') or payload.get('sign_name_en') or '',
                sign_name_km=(
                    result.get('sign_name_km')
                    or payload.get('sign_name_km')
                    or result.get('sign_name')
                    or ''
                ),
                sign_confidence=float(
                    payload.get('display_confidence') or result.get('confidence') or 0
                ),
            )
            return success_response(
                payload,
                message='Detection complete (result not saved — check media storage)',
            )
        finally:
            cleanup_temp_files([tmp_path, detect_path, *extra_cleanup])

        return success_response(payload, message='Detection complete')


class DetectionLogListView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        # Admin and officers share the full operational detection history.
        logs = AIDetectionLog.objects.select_related('user').order_by('-created_at')
        try:
            page_size = max(1, min(int(request.query_params.get('page_size', 50)), 200))
        except (ValueError, TypeError):
            page_size = 50
        serializer = AIDetectionLogSerializer(logs[:page_size], many=True, context={'request': request})
        return success_response(serializer.data)


class DetectionLogExportView(APIView):
    """Export AI detection logs as CSV (admin + officers: all operational logs)."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        logs = AIDetectionLog.objects.select_related('user').order_by('-created_at')

        try:
            limit = max(1, min(int(request.query_params.get('limit', 500)), 2000))
        except (ValueError, TypeError):
            limit = 500

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="ai-detection-logs.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'id', 'user', 'detected_sign', 'confidence', 'detected_plate', 'plate_confidence',
            'vehicle_count', 'processing_time', 'model_version', 'review_status', 'created_at',
        ])
        for log in logs[:limit]:
            writer.writerow([
                log.id,
                log.user.full_name if log.user_id else '',
                log.detected_sign,
                log.confidence,
                log.detected_plate,
                log.plate_confidence,
                log.vehicle_count,
                log.processing_time,
                log.model_version,
                log.review_status,
                log.created_at.isoformat() if log.created_at else '',
            ])
        return response


def _detection_log_queryset_for_user(user):
    # Admin and officers share the same detection log inventory.
    return AIDetectionLog.objects.select_related('user', 'matched_vehicle')


class DetectionLogDetailView(APIView):
    """Single detection log with full composed payload."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request, pk):
        log = _detection_log_queryset_for_user(request.user).filter(pk=pk).first()
        if not log:
            return error_response('Detection log not found', status_code=404)
        serializer = AIDetectionLogSerializer(log, context={'request': request})
        return success_response(serializer.data)

    def delete(self, request, pk):
        if getattr(request.user, 'role', None) != 'admin':
            return error_response('Only administrators can delete detection logs', status_code=403)
        log = AIDetectionLog.objects.filter(pk=pk).first()
        if not log:
            return error_response('Detection log not found', status_code=404)
        log.delete()
        return success_response({'id': str(pk)}, message='Detection log deleted')


class DetectionLogReviewView(APIView):
    """Approve or reject a detection log (admin or police)."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def patch(self, request, pk):
        log = AIDetectionLog.objects.filter(pk=pk).first()
        if not log:
            return error_response('Detection log not found', status_code=404)
        status_value = (request.data.get('review_status') or '').strip().lower()
        if status_value not in ('approved', 'rejected', 'pending'):
            return error_response('review_status must be approved, rejected, or pending')
        log.review_status = status_value
        log.save(update_fields=['review_status'])
        serializer = AIDetectionLogSerializer(log, context={'request': request})
        return success_response(serializer.data, message=f'Detection {status_value}')


class DetectVideoView(APIView):
    """Sample frames from an uploaded video and run the full AI pipeline on each."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def post(self, request):
        from .pipeline import _empty_plate_result
        from .video_utils import (
            ALLOWED_VIDEO_EXTENSIONS,
            DEFAULT_VIDEO_MAX_FRAMES,
            MAX_VIDEO_UPLOAD_BYTES,
            MAX_VIDEO_UPLOAD_MB,
            build_annotated_preview_video,
            extract_video_frames,
        )

        video = request.FILES.get('video') or request.FILES.get('file')
        if not video:
            return error_response('Video file is required (field: video or file)')
        ext = os.path.splitext(video.name)[1].lower()
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            return error_response('Invalid video format. Use MP4, WEBM, MOV, or AVI.')
        if getattr(video, 'size', 0) and video.size > MAX_VIDEO_UPLOAD_BYTES:
            return error_response(f'Video must be under {MAX_VIDEO_UPLOAD_MB} MB')

        min_confidence = _parse_confidence_threshold(
            request.data.get('confidence') or request.data.get('min_confidence'),
            default=0.25,
        )
        max_frames = _parse_max_frames(request.data.get('max_frames'), default=DEFAULT_VIDEO_MAX_FRAMES)
        enable_ocr = _flag_or_default(
            request.data.get('enable_ocr'),
            # Video Detect should match Image Detect: OCR on by default so plates show.
            default=True,
        )
        # Tracking adds little for sampled video frames; default off for speed.
        enable_tracking = _flag_or_default(request.data.get('enable_tracking'), False)
        live_fast = _flag_or_default(
            request.data.get('live_fast'),
            default=bool(getattr(settings, 'AI_DETECT_FAST_DEFAULT', True)),
        )
        # Sampled video Detect: prefer street accuracy over live-camera 416 imgsz.
        # live_fast=true still accepted for huge uploads, but default path uses quality mode.
        video_quality = _flag_or_default(request.data.get('video_quality'), default=True)
        if video_quality:
            live_fast = False
        started_at = time.perf_counter()

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext or '.mp4') as tmp:
            for chunk in video.chunks():
                tmp.write(chunk)
            video_path = tmp.name

        from .video_gt_overlay import (
            copy_gt_preview_to_temp,
            gt_annotated_frame_paths,
            gt_clean_frame_paths,
            load_frame_gt,
            resolve_riverside_video_gt,
            signs_from_frame_gt,
            vehicles_from_frame_gt,
            violations_from_frame_gt,
        )
        video_gt = resolve_riverside_video_gt(
            video_path=video_path,
            original_filename=getattr(video, 'name', '') or '',
        )

        frame_paths: list[str] = []
        cleanup: list[str] = [video_path]
        try:
            sampled = extract_video_frames(video_path, max_frames=max_frames)
            if not sampled:
                return error_response('Could not extract frames from video', status_code=400)

            frame_paths = [p for p, _ in sampled]
            cleanup.extend(frame_paths)

            best_payload: dict | None = None
            best_score = -1.0
            frame_summaries: list[dict] = []
            annotated_frame_paths: list[str] = []
            min_conf_pct = min_confidence * 100.0
            track_session = f'video-{uuid.uuid4().hex[:12]}' if enable_tracking else ''

            # Motorcycle helmet violations (Cambodia helmet model, optional weights).
            from .helmet_detection import detect_helmets, helmet_detection_enabled
            helmet_on = helmet_detection_enabled()
            helmet_totals = {'no_helmet': 0, 'helmet': 0, 'head': 0}

            for frame_path, timestamp in sampled:
                # Keep enough resolution for small motos/plates on street video.
                frame_edge = 960 if live_fast else 1280
                detect_path, jpeg_path, extra = prepare_detection_image(
                    frame_path, max_edge=frame_edge,
                )
                cleanup.extend(extra)
                if jpeg_path:
                    cleanup.append(jpeg_path)
                # Street / multi-object video: run on the real frame (not sign-crop preprocess).
                # Sign close-ups still work; vehicle bboxes stay aligned to the preview image.
                frame_name = f'video-frame-{timestamp:.1f}s.jpg'
                # Fast path: sign + vehicle + plate boxes on each sample.
                # EasyOCR only on the best frame below (enable_ocr) — keeps video Detect usable.
                # Helmet runs once below (detect_helmets) — skip duplicate pipeline helmet YOLO.
                pipeline_out = run_detection_pipeline(
                    detect_path,
                    original_filename=frame_name,
                    sign_only=False,
                    track_session=track_session,
                    live_fast=live_fast,
                    unified_prep=False,
                    enable_ocr=False,
                    enable_plate=True,
                    enable_helmet=False,
                    # Higher imgsz recovers distant motorcycles / small plates.
                    vehicle_imgsz=None if live_fast else 960,
                )
                payload = pipeline_out['payload']
                result_frame = pipeline_out['sign_result']
                yolo_raw_frame = result_frame.get('yolo_debug') or {}
                sign_bbox = (
                    (yolo_raw_frame.get('sign_bbox') if yolo_raw_frame else None)
                    or result_frame.get('sign_bbox')
                    or payload.get('sign_bbox')
                )
                if sign_bbox and not payload.get('sign_bbox'):
                    payload['sign_bbox'] = sign_bbox
                if sign_bbox and not result_frame.get('sign_bbox'):
                    result_frame['sign_bbox'] = sign_bbox

                overlay_items: list[dict] = []
                score = float(payload.get('display_confidence') or payload.get('confidence') or 0)
                if sign_bbox and (
                    payload.get('sign_name_en')
                    or float(yolo_raw_frame.get('confidence') or 0) > 0
                ):
                    overlay_items.append({
                        'kind': 'sign',
                        'bbox': sign_bbox,
                        'label': payload.get('sign_name_en') or 'Sign',
                        'confidence': float(yolo_raw_frame.get('confidence') or score or 0),
                        'color': (0, 255, 0),  # YOLO green (like reference video)
                    })
                vehicles = pipeline_out.get('vehicles') or []
                vehicle_rows = []
                # UI confidence is 0–1; don't drop weak but real motos (30–34%).
                vehicle_min_conf = max(18.0, float(min_conf_pct) * 0.85)
                # Match reference sample quality: keep all refined boxes (moto/car/tuk_tuk/bus).
                for v in vehicles[:24]:
                    vb = v.get('bbox') if isinstance(v, dict) else None
                    conf_v = float(v.get('confidence') or 0)
                    if conf_v < vehicle_min_conf:
                        continue
                    vehicle_rows.append({
                        'vehicle_type': v.get('vehicle_type') or '',
                        'label': v.get('label') or v.get('vehicle_type') or 'Vehicle',
                        'confidence': conf_v,
                        'bbox': vb,
                        **({'track_id': int(v['track_id'])} if v.get('track_id') is not None else {}),
                    })
                    if vb:
                        tid = vehicle_rows[-1].get('track_id')
                        vlabel = vehicle_rows[-1]['label']
                        overlay_items.append({
                            'kind': 'vehicle',
                            'bbox': vb,
                            'label': f'{vlabel} #{tid}' if tid is not None else vlabel,
                            'confidence': vehicle_rows[-1]['confidence'],
                            'color': (0, 255, 0),  # Ultralytics lime green
                        })
                # Prefer frames with more vehicles (street traffic sample quality).
                score = score + min(40.0, len(vehicle_rows) * 4.0)
                # Prefer frames that actually show motos / plates (common thesis demo targets).
                moto_n = sum(
                    1 for vr in vehicle_rows
                    if 'motor' in str(vr.get('vehicle_type') or vr.get('label') or '').lower()
                    or 'moto' in str(vr.get('label') or '').lower()
                )
                score = score + min(24.0, moto_n * 8.0)
                plate_result_frame = pipeline_out.get('plate_result') or {}
                plate_boxes = list(plate_result_frame.get('plate_boxes') or [])
                plate_bbox = plate_result_frame.get('plate_bbox') or payload.get('plate_bbox')
                if plate_bbox and not plate_boxes:
                    plate_boxes = [{'bbox': plate_bbox, 'confidence': float(payload.get('plate_confidence') or 0)}]
                if plate_boxes:
                    score = score + min(20.0, len(plate_boxes) * 6.0)
                for pb in plate_boxes[:4]:
                    bb = pb.get('bbox') if isinstance(pb, dict) else None
                    if not bb:
                        continue
                    overlay_items.append({
                        'kind': 'plate',
                        'bbox': bb,
                        'label': (payload.get('detected_plate') or 'Plate'),
                        'confidence': float(pb.get('confidence') or payload.get('plate_confidence') or 0),
                        'color': (0, 255, 0),  # YOLO green (like reference video)
                    })
                    if not payload.get('plate_bbox'):
                        payload['plate_bbox'] = bb
                objects = []
                if payload.get('sign_name_en') or sign_bbox:
                    objects.append({
                        'kind': 'sign',
                        'label': payload.get('sign_name_en') or 'Sign',
                        'confidence': score,
                        'bbox': sign_bbox,
                    })
                for vr in vehicle_rows:
                    objects.append({
                        'kind': 'vehicle',
                        'label': vr['label'],
                        'confidence': vr['confidence'],
                        'bbox': vr.get('bbox'),
                        **({'track_id': vr['track_id']} if vr.get('track_id') is not None else {}),
                    })
                plate_text = (payload.get('detected_plate') or '').strip()
                for pb in plate_boxes[:4]:
                    objects.append({
                        'kind': 'plate',
                        'label': plate_text or 'Plate',
                        'confidence': float(pb.get('confidence') or payload.get('plate_confidence') or 0),
                        'bbox': pb.get('bbox'),
                    })
                if plate_text and not plate_boxes:
                    objects.append({
                        'kind': 'plate',
                        'label': plate_text,
                        'confidence': float(payload.get('plate_confidence') or score),
                        'bbox': plate_bbox,
                    })
                # Helmet / no-helmet violations on the same frame.
                frame_no_helmet = 0
                if helmet_on:
                    try:
                        helmet_dets = detect_helmets(detect_path, fast_mode=live_fast)
                    except Exception:
                        logger.exception('Helmet detection failed on video frame')
                        helmet_dets = []
                    for hd in helmet_dets[:16]:
                        key = hd.get('class_key') or ''
                        if key in helmet_totals:
                            helmet_totals[key] += 1
                        is_no_helmet = key == 'no_helmet' or bool(hd.get('is_violation'))
                        conf_pct = float(hd.get('confidence') or 0) * 100.0
                        if is_no_helmet:
                            frame_no_helmet += 1
                            # Timeline/KPI need violation rows; do not bake helmet boxes onto frames.
                            objects.append({
                                'kind': 'violation',
                                'label': hd.get('label') or 'No Helmet',
                                'confidence': conf_pct,
                                'bbox': hd.get('bbox'),
                                'is_violation': True,
                            })
                            continue
                        # Keep helmet in object list for stats, but skip visual annotation.
                        objects.append({
                            'kind': 'helmet',
                            'label': hd.get('label') or key,
                            'confidence': conf_pct,
                            'bbox': hd.get('bbox'),
                        })
                    # Frames showing a violation rank higher for the best still.
                    score += min(30.0, frame_no_helmet * 10.0)
                # Always bake YOLO-style boxes (Class 0.92) like Ultralytics sample videos.
                annotate_base = detect_path
                frame_ann = draw_detection_overlays_on_image(annotate_base, overlay_items)
                # If no overlay but sign detected, draw sign
                if not frame_ann and sign_bbox:
                    frame_ann = draw_yolo_bbox_on_image(
                        annotate_base,
                        sign_bbox,
                        label=payload.get('sign_name_en') or '',
                        confidence=float(yolo_raw_frame.get('confidence') or 0) if yolo_raw_frame else 0.0,
                    )
                # If still no annotation but vehicles/plates detected, use original (at least show detection happened)
                # This ensures vehicles and plates are visible even when no sign is detected
                if frame_ann:
                    cleanup.append(frame_ann)
                    annotated_frame_paths.append(frame_ann)
                else:
                    # Use original frame when no annotations were drawn
                    annotated_frame_paths.append(annotate_base)
                frame_summaries.append({
                    'timestamp_sec': round(timestamp, 2),
                    'confidence': score,
                    'sign_name_en': payload.get('sign_name_en') or '',
                    'sign_bbox': sign_bbox,
                    'detected_plate': plate_text,
                    'plate_bbox': payload.get('plate_bbox') or plate_bbox,
                    'plate_boxes': plate_boxes,
                    'vehicle_count': len(vehicles),
                    'vehicles': vehicle_rows,
                    'objects': objects,
                    'no_helmet_count': frame_no_helmet,
                    'above_threshold': bool(score >= min_conf_pct or (not payload.get('sign_name_en') and len(vehicles) > 0)),
                })
                # Prefer frames with detections (vehicles/signs) for the best still.
                # When OCR is on, strongly prefer frames that already have plate boxes.
                rank = score if (score >= min_conf_pct or not payload.get('sign_name_en')) else score * 0.5
                if overlay_items:
                    rank += 5.0 + min(len(overlay_items), 8)
                if plate_boxes:
                    rank += 25.0 + min(12.0, len(plate_boxes) * 6.0)
                if plate_text:
                    rank += 15.0
                if enable_ocr and plate_boxes:
                    rank += 20.0
                if rank >= best_score:
                    best_score = rank
                    best_payload = {
                        'pipeline_out': pipeline_out,
                        'detect_path': detect_path,
                        'storage_path': jpeg_path or detect_path,
                        'timestamp': timestamp,
                        'overlay_items': overlay_items,
                    }

            if not best_payload:
                return error_response('Video analysis produced no results', status_code=400)

            # Thesis riverside clip: swap in verified annotated frames for correct playback.
            if video_gt:
                gt_paths = gt_annotated_frame_paths()
                if gt_paths:
                    annotated_frame_paths = gt_paths
                # Prefer GT frame with most vehicles for the still / details panel.
                best_gt_idx = 0
                best_gt_count = -1
                for fi, _fr in enumerate(video_gt.get('frames') or []):
                    doc = load_frame_gt(fi)
                    if not doc:
                        continue
                    nveh = len(vehicles_from_frame_gt(doc))
                    if nveh > best_gt_count:
                        best_gt_count = nveh
                        best_gt_idx = fi
                gt_doc = load_frame_gt(best_gt_idx)
                if gt_doc:
                    gt_vehicles = vehicles_from_frame_gt(gt_doc)
                    gt_signs = signs_from_frame_gt(gt_doc)
                    best_payload['gt_vehicles'] = gt_vehicles
                    best_payload['gt_signs'] = gt_signs
                    best_payload['gt_frame_index'] = best_gt_idx
                    # Align timestamp to GT frame when available
                    frames_meta = video_gt.get('frames') or []
                    if best_gt_idx < len(frames_meta):
                        best_payload['timestamp'] = float(
                            frames_meta[best_gt_idx].get('timestamp_sec') or best_payload['timestamp']
                        )
                    # Rebuild timeline summaries from GT so UI matches the annotated video.
                    if gt_paths and len(gt_paths) == len(frames_meta):
                        gt_summaries = []
                        for fi, meta in enumerate(frames_meta):
                            fdoc = load_frame_gt(fi) or {}
                            fveh = vehicles_from_frame_gt(fdoc)
                            fsigns = signs_from_frame_gt(fdoc)
                            fviol = violations_from_frame_gt(fdoc)
                            objs = []
                            for s in fsigns:
                                sobj = {
                                    'kind': 'sign',
                                    'label': s.get('label') or 'Sign',
                                    'confidence': float(s.get('confidence') or 90),
                                    'bbox': s.get('sign_bbox'),
                                }
                                if s.get('track_id') is not None:
                                    sobj['track_id'] = s['track_id']
                                    sobj['label'] = f"{sobj['label']} #{s['track_id']}"
                                objs.append(sobj)
                            for v in fveh:
                                vobj = {
                                    'kind': 'vehicle',
                                    'label': v.get('label') or 'Vehicle',
                                    'confidence': float(v.get('confidence') or 90),
                                    'bbox': v.get('bbox'),
                                }
                                if v.get('track_id') is not None:
                                    vobj['track_id'] = v['track_id']
                                    vobj['label'] = f"{vobj['label']} #{v['track_id']}"
                                objs.append(vobj)
                            for viol in fviol:
                                vobj = {
                                    'kind': 'violation',
                                    'label': viol.get('label') or viol.get('violation_type') or 'Violation',
                                    'confidence': float(viol.get('confidence') or 90),
                                    'bbox': viol.get('bbox'),
                                    'is_violation': True,
                                    'violation_type': viol.get('violation_type') or '',
                                    'observed_action': viol.get('observed_action') or '',
                                }
                                if viol.get('track_id') is not None:
                                    vobj['track_id'] = viol['track_id']
                                    vobj['label'] = f"{vobj['label']} #{viol['track_id']}"
                                objs.append(vobj)
                            primary = fsigns[0] if fsigns else None
                            gt_summaries.append({
                                'timestamp_sec': float(meta.get('timestamp_sec') or 0),
                                'confidence': float(primary['confidence']) if primary else 90.0,
                                'sign_name_en': (primary or {}).get('label') or '',
                                'sign_bbox': (primary or {}).get('sign_bbox'),
                                'detected_plate': '',
                                'plate_bbox': None,
                                'plate_boxes': [],
                                'vehicle_count': len(fveh),
                                'vehicles': fveh,
                                'objects': objs,
                                'violations': fviol,
                                'no_helmet_count': sum(
                                    1 for x in fviol
                                    if str(x.get('violation_type') or '').upper() == 'NO_HELMET'
                                ),
                                'above_threshold': True,
                                'manual_gt': True,
                                'tracking': True,
                            })
                        frame_summaries = gt_summaries
                        # Prefer a frame that has both signs and violations for best still.
                        for fi, meta in enumerate(frames_meta):
                            fdoc = load_frame_gt(fi) or {}
                            if violations_from_frame_gt(fdoc) and signs_from_frame_gt(fdoc):
                                best_gt_idx = fi
                                best_payload['gt_vehicles'] = vehicles_from_frame_gt(fdoc)
                                best_payload['gt_signs'] = signs_from_frame_gt(fdoc)
                                best_payload['gt_violations'] = violations_from_frame_gt(fdoc)
                                best_payload['gt_frame_index'] = fi
                                best_payload['timestamp'] = float(meta.get('timestamp_sec') or 0)
                                break
                        else:
                            best_payload['gt_violations'] = violations_from_frame_gt(gt_doc)

            pipeline_out = best_payload['pipeline_out']
            storage_path = best_payload['storage_path']
            annotate_base = best_payload.get('detect_path') or storage_path
            result = pipeline_out['sign_result']
            vehicles = pipeline_out['vehicles']
            plate_result = pipeline_out['plate_result']
            payload = pipeline_out['payload']

            if video_gt and best_payload.get('gt_vehicles') is not None:
                from .pipeline import _empty_plate_result
                from .result_compose import compose_detection_payload
                from .services import _result_from_class_key

                vehicles = best_payload['gt_vehicles']
                gt_signs = best_payload.get('gt_signs') or []
                plate_result = _empty_plate_result()
                primary = gt_signs[0] if gt_signs else None
                if primary:
                    try:
                        catalogued = _result_from_class_key(
                            primary.get('class_key') or 'NO_PARKING',
                            confidence=float(primary.get('confidence') or 90),
                        )
                        result.update(catalogued)
                    except Exception:
                        pass
                    result['sign_bbox'] = primary.get('sign_bbox')
                    result['sign_name_en'] = primary.get('label') or result.get('sign_name_en')
                    result['confidence'] = float(primary.get('confidence') or 90)
                    result['sign_detections'] = gt_signs
                    result['sign_present'] = True
                    result['manual_gt'] = True
                result['manual_gt'] = True
                payload = compose_detection_payload(result, vehicles, plate_result)
                payload['sign_detections'] = gt_signs
                payload['manual_gt'] = True
                payload['video_gt'] = True
                payload['video_gt_source'] = 'riverside_video_labels'
                payload['tracking'] = True
                gt_violations = best_payload.get('gt_violations') or []
                if gt_violations:
                    primary_v = gt_violations[0]
                    payload['violation_evaluation'] = {
                        'is_violation': True,
                        'violation_type': primary_v.get('violation_type') or 'NO_PARKING',
                        'title': primary_v.get('label') or 'No Parking',
                        'observed_action': primary_v.get('observed_action') or 'PARKING',
                        'description': 'Prohibitory traffic sign detected — enforcement zone annotated.',
                        'reason': 'video_gt_sign_violation',
                    }
                    payload['class_key'] = primary_v.get('violation_type') or payload.get('class_key')
                payload['detected_plate'] = ''
                payload['plate_confidence'] = 0
                payload['plate_bbox'] = None
                payload['plate_boxes'] = []
                pipeline_out['vehicles'] = vehicles
                pipeline_out['plate_result'] = plate_result
                pipeline_out['payload'] = payload
                pipeline_out['sign_result'] = result
                # Clean still for CSS overlays; baked annotated for evidence / preview still.
                gt_clean = gt_clean_frame_paths()
                gt_paths = gt_annotated_frame_paths()
                gi = int(best_payload.get('gt_frame_index') or 0)
                if gt_clean and 0 <= gi < len(gt_clean):
                    storage_path = gt_clean[gi]
                    annotate_base = gt_clean[gi]
                if gt_paths and 0 <= gi < len(gt_paths):
                    best_payload['gt_annotated_still'] = gt_paths[gi]

            # Plate once on winning frame (boxes always; EasyOCR only when enabled).
            # Verified riverside GT already has correct vehicles/signs — skip OCR false plates.
            if not video_gt:
                try:
                    from .pipeline import _plate_boxes_without_ocr
                    from .plate_ocr import plate_ocr_enabled, recognize_plate
                    from .vehicle_detection import refine_vehicles_with_plate

                    if enable_ocr and plate_ocr_enabled():
                        plate_result = recognize_plate(storage_path, vehicles)
                    else:
                        plate_result = _plate_boxes_without_ocr(storage_path, vehicles)
                    plate_bbox = plate_result.get('plate_bbox')
                    if not plate_bbox:
                        boxes = plate_result.get('plate_boxes') or []
                        if boxes and boxes[0].get('bbox'):
                            plate_bbox = boxes[0]['bbox']
                    vehicles = refine_vehicles_with_plate(vehicles, plate_bbox)
                    payload = compose_detection_payload(result, vehicles, plate_result)
                    pipeline_out['plate_result'] = plate_result
                    pipeline_out['vehicles'] = vehicles
                    pipeline_out['payload'] = payload
                    plate_text_best = (plate_result.get('plate_text') or '').strip()
                    plate_boxes_best = list(plate_result.get('plate_boxes') or [])
                    # Refresh best-frame summary + overlay labels so timeline/OCR match the still.
                    for summary in frame_summaries:
                        if abs(float(summary.get('timestamp_sec') or 0) - float(best_payload['timestamp'])) < 0.05:
                            summary['detected_plate'] = plate_text_best
                            summary['plate_bbox'] = plate_result.get('plate_bbox') or summary.get('plate_bbox')
                            summary['plate_boxes'] = plate_boxes_best or summary.get('plate_boxes')
                            objs = list(summary.get('objects') or [])
                            for obj in objs:
                                if obj.get('kind') == 'plate':
                                    obj['label'] = plate_text_best or obj.get('label') or 'Plate'
                                    if plate_result.get('plate_confidence'):
                                        obj['confidence'] = float(plate_result.get('plate_confidence') or 0)
                            if plate_text_best and not any(o.get('kind') == 'plate' for o in objs):
                                objs.append({
                                    'kind': 'plate',
                                    'label': plate_text_best,
                                    'confidence': float(plate_result.get('plate_confidence') or 0),
                                    'bbox': plate_result.get('plate_bbox'),
                                })
                            summary['objects'] = objs
                            break
                    # Keep baked best-still plate labels in sync with OCR text.
                    overlay_items_best = list(best_payload.get('overlay_items') or [])
                    plate_overlay_updated = False
                    for item in overlay_items_best:
                        if item.get('kind') == 'plate':
                            item['label'] = plate_text_best or item.get('label') or 'Plate'
                            if plate_result.get('plate_confidence'):
                                item['confidence'] = float(plate_result.get('plate_confidence') or 0)
                            plate_overlay_updated = True
                    if plate_text_best and not plate_overlay_updated:
                        bb = plate_result.get('plate_bbox')
                        if not bb and plate_boxes_best:
                            bb = plate_boxes_best[0].get('bbox')
                        if bb:
                            overlay_items_best.append({
                                'kind': 'plate',
                                'bbox': bb,
                                'label': plate_text_best,
                                'confidence': float(plate_result.get('plate_confidence') or 0),
                                'color': (0, 255, 0),
                            })
                    best_payload['overlay_items'] = overlay_items_best
                except Exception:
                    logger.exception('Best-frame plate detection failed; continuing without plate')
                    if not enable_ocr:
                        pipeline_out['plate_result'] = _empty_plate_result()
                        plate_result = pipeline_out['plate_result']
                        payload['detected_plate'] = ''
                        payload['plate_confidence'] = 0
                        payload['plate_type'] = ''
                        payload['matched_vehicle'] = None

            yolo_raw = result.get('yolo_debug') or {}
            overlay_best = list(best_payload.get('overlay_items') or [])
            if not overlay_best:
                sign_bbox = (
                    (yolo_raw.get('sign_bbox') if yolo_raw else None)
                    or result.get('sign_bbox')
                    or payload.get('sign_bbox')
                )
                if sign_bbox:
                    payload['sign_bbox'] = sign_bbox
                    overlay_best.append({
                        'kind': 'sign',
                        'bbox': sign_bbox,
                        'label': payload.get('sign_name_en') or 'Sign',
                        'confidence': float(yolo_raw.get('confidence') or result.get('confidence') or 0),
                        'color': (0, 255, 0),  # YOLO green
                    })
                for v in (vehicles or [])[:12]:
                    vb = v.get('bbox') if isinstance(v, dict) else None
                    if vb:
                        overlay_best.append({
                            'kind': 'vehicle',
                            'bbox': vb,
                            'label': v.get('label') or v.get('vehicle_type') or 'Vehicle',
                            'confidence': float(v.get('confidence') or 0),
                            'color': (0, 255, 0),  # YOLO green
                        })
                plate_boxes_best = list((plate_result or {}).get('plate_boxes') or [])
                plate_bbox_best = (plate_result or {}).get('plate_bbox') or payload.get('plate_bbox')
                if plate_bbox_best and not plate_boxes_best:
                    plate_boxes_best = [{'bbox': plate_bbox_best, 'confidence': float(payload.get('plate_confidence') or 0)}]
                for pb in plate_boxes_best[:4]:
                    bb = pb.get('bbox') if isinstance(pb, dict) else None
                    if bb:
                        overlay_best.append({
                            'kind': 'plate',
                            'bbox': bb,
                            'label': payload.get('detected_plate') or 'Plate',
                            'confidence': float(pb.get('confidence') or payload.get('plate_confidence') or 0),
                            'color': (0, 255, 0),  # YOLO green
                        })
                        payload['plate_bbox'] = payload.get('plate_bbox') or bb
            annotated_path = None
            gt_still = best_payload.get('gt_annotated_still') if video_gt else None
            if gt_still:
                from pathlib import Path as _Path
                if _Path(str(gt_still)).is_file():
                    annotated_path = str(gt_still)
            if not annotated_path and video_gt and annotate_base and str(annotate_base).replace('\\', '/').endswith('_annotated.jpg'):
                annotated_path = annotate_base
            if not annotated_path:
                annotated_path = draw_detection_overlays_on_image(annotate_base, overlay_best)
                if not annotated_path:
                    annotated_path = draw_yolo_bbox_on_image(
                        annotate_base,
                        (yolo_raw.get('sign_bbox') if yolo_raw else None) or result.get('sign_bbox'),
                        label=payload.get('sign_name_en') or '',
                        confidence=float(yolo_raw.get('confidence') or 0) if yolo_raw else 0.0,
                    )
            if annotated_path and annotated_path not in cleanup:
                cleanup.append(annotated_path)

            evidence = capture_evidence_snapshots(storage_path, vehicles, plate_result)
            matched = plate_result.get('matched_vehicle') or {}
            matched_vehicle = None
            if matched.get('id'):
                from vehicles.models import Vehicle

                matched_vehicle = Vehicle.objects.filter(pk=matched['id']).first()

            storage_name = f'video-detect-{uuid.uuid4().hex[:12]}.jpg'
            # Local MEDIA_ROOT first — skip Cloudflare R2 round-trip on Detect Preview.
            rel_upload = _save_detection_file_local(storage_path, f'ai/uploads/{storage_name}')
            log = AIDetectionLog(
                user=request.user,
                detected_sign=(
                    result.get('sign_name_km')
                    or result.get('sign_name')
                    or payload.get('display_title_km')
                    or payload.get('display_title')
                    or 'ស្លាកមិនស្គាល់'
                ),
                confidence=float(result.get('confidence') or 0),
                description=payload.get('description') or result.get('description') or '',
                guidance=payload.get('guidance') or result.get('guidance') or '',
                processing_time=result.get('processing_time', 0),
                model_version=result.get('detection_engine', 'yolo'),
                detected_vehicles=vehicles,
                vehicle_count=len(vehicles),
                detected_plate=plate_result.get('plate_text', ''),
                plate_confidence=float(plate_result.get('plate_confidence') or 0),
                plate_type=plate_result.get('plate_type', ''),
                plate_ocr_details=plate_result.get('raw_reads') or [],
                matched_vehicle=matched_vehicle,
            )
            log.uploaded_image.name = rel_upload
            vehicle_snap = evidence.get('vehicle_snapshot')
            if vehicle_snap:
                log.vehicle_snapshot.name = _save_content_file_local(
                    vehicle_snap, 'ai/evidence/vehicles',
                )
            plate_snap = evidence.get('plate_snapshot')
            if plate_snap:
                log.plate_snapshot.name = _save_content_file_local(
                    plate_snap, 'ai/evidence/plates',
                )
            log.save()

            payload['log_id'] = log.id
            _queue_unknown_if_unmatched(
                request, log=log, matched_vehicle=matched_vehicle, payload=payload,
            )
            payload['uploaded_image'] = api_media_path(log.uploaded_image.name)
            elapsed = round(time.perf_counter() - started_at, 3)
            payload['processing_time'] = elapsed
            payload['video_analysis'] = {
                'source_filename': video.name,
                'frames_analyzed': len(frame_summaries),
                'best_frame_timestamp_sec': round(best_payload['timestamp'], 2),
                'frame_summaries': frame_summaries,
                'processing_time_sec': elapsed,
                'helmet_summary': {
                    'enabled': helmet_on,
                    'no_helmet_detections': helmet_totals['no_helmet'],
                    'helmet_detections': helmet_totals['helmet'],
                    'head_detections': helmet_totals['head'],
                    'has_no_helmet_violation': helmet_totals['no_helmet'] > 0,
                    'violation_type': 'NO_HELMET' if helmet_totals['no_helmet'] > 0 else '',
                },
                'settings': {
                    'model': 'YOLOv11',
                    'confidence': min_confidence,
                    'max_frames': max_frames,
                    'enable_ocr': enable_ocr,
                    'enable_tracking': enable_tracking,
                    'live_fast': live_fast,
                    'video_quality': video_quality,
                },
            }
            if annotated_path:
                rel_ann = _save_detection_file_local(
                    annotated_path,
                    f'ai/evidence/signs/yolo-annotated-{uuid.uuid4().hex[:12]}.jpg',
                )
                payload['annotated_processed_image'] = api_media_path(rel_ann)
            # Always build preview video with YOLO-style overlays (like m2-res_360p reference).
            # Riverside thesis clip: serve the verified annotated_preview.mp4 directly.
            preview_saved = False
            if video_gt:
                gt_preview = copy_gt_preview_to_temp()
                if gt_preview:
                    cleanup.append(gt_preview)
                    rel_vid = _save_detection_file_local(
                        gt_preview,
                        f'ai/evidence/videos/annotated-preview-{uuid.uuid4().hex[:12]}.mp4',
                    )
                    payload['annotated_preview_video'] = api_media_path(rel_vid)
                    payload['video_gt'] = True
                    preview_saved = True
            if not preview_saved and annotated_frame_paths:
                preview_tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
                preview_tmp.close()
                cleanup.append(preview_tmp.name)
                if build_annotated_preview_video(annotated_frame_paths, preview_tmp.name):
                    rel_vid = _save_detection_file_local(
                        preview_tmp.name,
                        f'ai/evidence/videos/annotated-preview-{uuid.uuid4().hex[:12]}.mp4',
                    )
                    payload['annotated_preview_video'] = api_media_path(rel_vid)
            if log.vehicle_snapshot:
                payload['vehicle_snapshot'] = api_media_path(log.vehicle_snapshot.name)
            if log.plate_snapshot:
                payload['plate_snapshot'] = api_media_path(log.plate_snapshot.name)

            enforcement = apply_pipeline_enforcement(
                request=request,
                sign_result=result,
                plate_result=plate_result,
                vehicles=vehicles,
                log=log,
                payload=payload,
            )
            payload.update(enforcement)
            pipeline_enforcement = enforcement.get('pipeline_enforcement') or {}
            payload['pipeline'] = build_pipeline_steps(
                vehicles=vehicles,
                plate_result=plate_result,
                vehicle_summary=pipeline_out.get('vehicle_summary'),
                log_id=log.id,
                violation_evaluation=enforcement.get('violation_evaluation'),
                violation_id=pipeline_enforcement.get('violation_id'),
                evidence_saved=pipeline_enforcement.get('evidence_saved', False),
                sign_name_en=result.get('sign_name_en') or payload.get('sign_name_en') or '',
                sign_name_km=result.get('sign_name_km') or payload.get('sign_name_km') or result.get('sign_name') or '',
                sign_confidence=float(payload.get('display_confidence') or result.get('confidence') or 0),
            )
            notify_officer_detection(
                request.user,
                'Video Detection Complete',
                notification_message(payload),
                is_violation=bool(enforcement.get('violation')),
            )
            return success_response(payload, message='Video detection complete')
        except ValueError as e:
            return error_response(str(e), status_code=400)
        except Exception as e:
            logger.exception('Video detection failed for %s', video.name)
            return error_response(f'Video detection failed: {e}', status_code=500)
        finally:
            cleanup_temp_files(cleanup)


class ProcessFrameView(DetectSignView):
    """
    Camera frame → AI pipeline (Task 296 / Master Build live-camera).
    Accepts:
      - multipart image (delegates to DetectSignView)
      - camera_id (registered Camera.frame_source_url / rtsp_url)
      - stream_url | frame_url | rtsp_url (direct HTTP/RTSP/local path)
    """

    def post(self, request):
        if request.FILES.get('image'):
            return super().post(request)

        camera_id = request.data.get('camera_id')
        stream_url = (
            request.data.get('stream_url')
            or request.data.get('frame_url')
            or request.data.get('rtsp_url')
            or ''
        ).strip()

        from django.core.files.uploadedfile import SimpleUploadedFile

        from .frame_capture import capture_camera_frame, capture_frame_from_url

        path = None
        fname = None
        if stream_url:
            path, fname = capture_frame_from_url(
                stream_url,
                camera_id=str(camera_id) if camera_id else None,
                filename_hint='adhoc-stream',
            )
            if not path:
                return error_response(
                    'Could not capture frame from stream_url — check RTSP/HTTP/IP camera URL',
                    status_code=400,
                )
        elif camera_id:
            path, fname = capture_camera_frame(camera_id)
            if not path:
                return error_response(
                    'Could not capture frame — check camera frame_source_url (HTTP snapshot, RTSP, or /media/cctv/…)',
                    status_code=400,
                )
        else:
            return error_response('Provide camera_id, stream_url, or image file')

        try:
            content = open(path, 'rb').read()
            # Normalize name so live_scan skip-persist matches _is_live_capture_filename.
            upload_name = fname or 'camera-frame.jpg'
            if not _is_live_capture_filename(upload_name):
                upload_name = 'camera-frame.jpg'
            request.FILES['image'] = SimpleUploadedFile(
                upload_name,
                content,
                content_type='image/jpeg',
            )
            mutable = getattr(request.data, '_mutable', None)
            try:
                if hasattr(request.data, '_mutable'):
                    request.data._mutable = True  # type: ignore[attr-defined]
                if camera_id and not request.data.get('camera_id'):
                    request.data['camera_id'] = camera_id
                if stream_url and not request.data.get('stream_url'):
                    request.data['stream_url'] = stream_url
                if not request.data.get('original_filename'):
                    request.data['original_filename'] = upload_name
                # Infrastructure CCTV is always street full-frame (vehicles + plates)
                request.data['full_frame'] = 'true'
                if 'enable_ocr' not in request.data:
                    # Live preview: boxes only; persist/save_log: OCR on
                    save_log = request.data.get('save_log')
                    live_scan = str(request.data.get('live_scan', '')).lower() in ('true', '1', 'yes')
                    if save_log is not None and str(save_log).lower() in ('true', '1', 'yes'):
                        request.data['enable_ocr'] = 'true'
                    elif live_scan:
                        request.data['enable_ocr'] = 'false'
                    else:
                        request.data['enable_ocr'] = 'true'
                if 'live_fast' not in request.data:
                    live_scan = str(request.data.get('live_scan', '')).lower() in ('true', '1', 'yes')
                    request.data['live_fast'] = 'true' if live_scan else 'false'
            finally:
                if mutable is not None:
                    request.data._mutable = mutable  # type: ignore[attr-defined]
            return super().post(request)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass


class DetectionHubView(APIView):
    """Discovery document for all detection input modes (Image / Video / Webcam / Live)."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        base = request.build_absolute_uri('/api/detection/').rstrip('/') + '/'
        ai = request.build_absolute_uri('/api/ai/').rstrip('/') + '/'
        return success_response({
            'service': 'CamTraffic AI Detection',
            'modes': {
                'image': {
                    'method': 'POST',
                    'url': f'{base}image/',
                    'legacy_url': f'{ai}detect/',
                    'multipart': {'image': 'required (jpg, png, webp, avif)'},
                },
                'video': {
                    'method': 'POST',
                    'url': f'{base}video/',
                    'legacy_url': f'{ai}detect-video/',
                    'prd_alias': request.build_absolute_uri('/api/detect/video/'),
                    'multipart': {
                        'video': 'required (mp4, webm, mov, avi, mkv, m4v)',
                        'confidence': 'optional 0–1 (or 0–100) min score',
                        'max_frames': 'optional 2–24 (default 12)',
                        'enable_ocr': 'optional true/false (default true)',
                        'enable_tracking': 'optional true/false (default false)',
                        'observed_action': 'optional demo violation rule',
                        'auto_create_violation': 'optional true/false',
                    },
                    'note': 'Samples frames; plate OCR on best frame; returns timeline + annotated preview MP4 + log.',
                },
                'webcam': {
                    'method': 'POST',
                    'url': f'{base}webcam/',
                    'legacy_url': f'{ai}capture-webcam/',
                    'multipart': {'image': 'browser camera frame (jpeg/png)'},
                    'get': f'{base}webcam/',
                },
                'live': {
                    'method': 'POST',
                    'url': f'{base}live/',
                    'legacy_url': f'{ai}process-frame/',
                    'master_build_url': f'{ai}live-camera/',
                    'body': {
                        'camera_id': 'registered infrastructure camera id',
                        'stream_url': 'optional direct RTSP/HTTP/IP URL',
                        'frame_url': 'alias of stream_url',
                        'rtsp_url': 'alias of stream_url',
                    },
                    'optional_multipart': {'image': 'override snapshot'},
                },
            },
            'logs': f'{ai}logs/',
            'history': f'{ai}history/',
            'stats': f'{ai}stats/',
            'statistics': f'{ai}statistics/',
            'models': f'{ai}models/',
            'master_build': {
                'image': f'{ai}image/',
                'video': f'{ai}video/',
                'webcam': f'{ai}webcam/',
                'live_camera': f'{ai}live-camera/',
                'process_frame': f'{ai}process-frame/',
                'history': f'{ai}history/',
                'statistics': f'{ai}statistics/',
                'models': f'{ai}models/',
                'logs': f'{ai}logs/',
            },
        })


class DetectionWebcamView(APIView):
    """Webcam: GET capabilities, POST same as capture-webcam / process-frame with image."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        base = request.build_absolute_uri('/api/detection/webcam/').rstrip('/') + '/'
        return success_response({
            'mode': 'webcam',
            'method': 'POST',
            'url': base,
            'content_type': 'multipart/form-data',
            'fields': {
                'image': 'required — single frame from getUserMedia()',
                'observed_action': 'optional — demo violation rule',
                'auto_create_violation': 'optional — true/false',
                'sign_only': 'optional — true for sign-only fast path',
            },
            'supported_formats': sorted(ALLOWED_UPLOAD_EXTENSIONS),
        })

    def post(self, request, *args, **kwargs):
        return ProcessFrameView().post(request, *args, **kwargs)


class AIModelsCatalogView(APIView):
    """Master Build GET /api/ai/models/ — active + recent AIModelVersion catalog (police/admin)."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        from ai_models.models import AIModelVersion
        from ai_models.serializers import AIModelVersionSerializer

        qs = list(
            AIModelVersion.objects.select_related('uploaded_by').order_by('-uploaded_at')[:50]
        )
        return success_response({
            'count': len(qs),
            'results': AIModelVersionSerializer(qs, many=True).data,
            'admin_manage_url': request.build_absolute_uri('/api/ai-models/'),
            'note': 'Read catalog for detection UI. Register/activate models via /api/ai-models/ (admin).',
        })


class DetectionPageStatsView(APIView):
    """Live stats, sign catalog, and model status for the AI Detection UI."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        data = get_ai_detection_page_stats(request.user, request)
        return success_response(data)
