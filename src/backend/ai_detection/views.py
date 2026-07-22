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

from core.media_urls import api_media_path, api_media_url
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
            )
            if live_scan and live_capture and not full_frame:
                sign_only = True
                live_fast = False

            if full_frame:
                # Keep sign_prep=None so overlays / debug attach to the street frame path.
                pipeline_out = run_detection_pipeline(
                    detect_path,
                    original_filename=original_name or image.name,
                    sign_only=False,
                    catalog_sign_code=catalog_sign_code,
                    track_session=track_session,
                    live_fast=False,
                    unified_prep=False,
                )
            else:
                sign_prep = prepare_unified_sign_input(detect_path, localize=True)
                pipeline_input = sign_prep.yolo_path
                extra_cleanup.extend(sign_prep.cleanup_paths)

                pipeline_out = run_detection_pipeline(
                    pipeline_input,
                    original_filename=original_name or image.name,
                    sign_only=sign_only,
                    catalog_sign_code=catalog_sign_code,
                    track_session=track_session,
                    live_fast=live_fast,
                    unified_prep=True,
                )
                # Shared preprocess can weaken mid-confidence boxes — retry original frame.
                sign_probe = (pipeline_out or {}).get('sign_result') or {}
                weak_sign = (
                    not sign_probe
                    or sign_probe.get('detection_mode') == 'no_sign'
                    or float(sign_probe.get('confidence') or 0) < 1
                    or (sign_probe.get('detection_engine') or '') in ('none', '', 'opencv')
                )
                if weak_sign and detect_path and sign_prep.yolo_path != detect_path and not live_capture:
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
            evidence = capture_evidence_snapshots(storage_path, vehicles, plate_result)
            matched_vehicle = None
            if matched.get('id'):
                from vehicles.models import Vehicle

                matched_vehicle = Vehicle.objects.filter(pk=matched['id']).first()
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
            payload['log_id'] = log.id
            payload['uploaded_image'] = api_media_url(request, log.uploaded_image)
            payload['guide_frame_image'] = payload['uploaded_image']
            if sign_prep:
                from django.core.files.storage import default_storage

                def _save_evidence(local_path: str, prefix: str) -> str:
                    with open(local_path, 'rb') as handle:
                        saved = default_storage.save(
                            f'ai/evidence/signs/{prefix}-{uuid.uuid4().hex[:12]}.jpg',
                            File(handle),
                        )
                    return api_media_path(saved)

                if sign_prep.roi_path and sign_prep.roi_path != storage_path:
                    payload['sign_crop_image'] = _save_evidence(sign_prep.roi_path, 'sign-crop')
                if sign_prep.yolo_path:
                    payload['processed_image'] = _save_evidence(sign_prep.yolo_path, 'yolo-input')
                if sign_prep.annotated_path:
                    payload['annotated_processed_image'] = _save_evidence(
                        sign_prep.annotated_path, 'yolo-annotated',
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
            logger.exception('Detection save/enforcement failed')
            return error_response(f'Detection could not be saved: {e}', status_code=503)
        finally:
            cleanup_temp_files([tmp_path, detect_path, *extra_cleanup])

        return success_response(payload, message='Detection complete')


class DetectionLogListView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        user = request.user
        if user.role == 'admin':
            logs = AIDetectionLog.objects.select_related('user').order_by('-created_at')
        else:
            logs = AIDetectionLog.objects.select_related('user').filter(user=user).order_by('-created_at')
        try:
            page_size = max(1, min(int(request.query_params.get('page_size', 50)), 200))
        except (ValueError, TypeError):
            page_size = 50
        serializer = AIDetectionLogSerializer(logs[:page_size], many=True, context={'request': request})
        return success_response(serializer.data)


class DetectionLogExportView(APIView):
    """Export AI detection logs as CSV (admin: all logs; officers: own logs)."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        user = request.user
        if user.role == 'admin':
            logs = AIDetectionLog.objects.select_related('user').order_by('-created_at')
        else:
            logs = AIDetectionLog.objects.select_related('user').filter(user=user).order_by('-created_at')

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
    if user.role == 'admin':
        return AIDetectionLog.objects.select_related('user', 'matched_vehicle')
    return AIDetectionLog.objects.select_related('user', 'matched_vehicle').filter(user=user)


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
        max_frames = _parse_max_frames(request.data.get('max_frames'), default=6)
        enable_ocr = _flag_or_default(request.data.get('enable_ocr'), True)
        enable_tracking = _flag_or_default(request.data.get('enable_tracking'), True)
        started_at = time.perf_counter()

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext or '.mp4') as tmp:
            for chunk in video.chunks():
                tmp.write(chunk)
            video_path = tmp.name

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

            for frame_path, timestamp in sampled:
                detect_path, jpeg_path, extra = prepare_detection_image(frame_path)
                cleanup.extend(extra)
                if jpeg_path:
                    cleanup.append(jpeg_path)
                # Street / multi-object video: run on the real frame (not sign-crop preprocess).
                # Sign close-ups still work; vehicle bboxes stay aligned to the preview image.
                frame_name = f'video-frame-{timestamp:.1f}s.jpg'
                pipeline_out = run_detection_pipeline(
                    detect_path,
                    original_filename=frame_name,
                    sign_only=False,
                    track_session=track_session,
                    unified_prep=False,
                )
                if not enable_ocr:
                    pipeline_out['plate_result'] = _empty_plate_result()
                    payload_clear = pipeline_out['payload']
                    payload_clear['detected_plate'] = ''
                    payload_clear['plate_confidence'] = 0
                    payload_clear['plate_type'] = ''
                    payload_clear['matched_vehicle'] = None
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
                        'bbox': sign_bbox,
                        'label': payload.get('sign_name_en') or 'Sign',
                        'confidence': float(yolo_raw_frame.get('confidence') or score or 0),
                        'color': (245, 92, 139),  # violet-ish BGR
                    })
                vehicles = pipeline_out.get('vehicles') or []
                vehicle_rows = []
                for v in vehicles[:12]:
                    vb = v.get('bbox') if isinstance(v, dict) else None
                    vehicle_rows.append({
                        'vehicle_type': v.get('vehicle_type') or '',
                        'label': v.get('label') or v.get('vehicle_type') or 'Vehicle',
                        'confidence': float(v.get('confidence') or 0),
                        'bbox': vb,
                    })
                    if vb:
                        overlay_items.append({
                            'bbox': vb,
                            'label': vehicle_rows[-1]['label'],
                            'confidence': vehicle_rows[-1]['confidence'],
                            'color': (214, 182, 6),  # cyan-ish BGR
                        })
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
                    })
                plate_text = (payload.get('detected_plate') or '').strip()
                if plate_text:
                    objects.append({
                        'kind': 'plate',
                        'label': plate_text,
                        'confidence': float(payload.get('plate_confidence') or score),
                    })
                annotate_base = detect_path
                frame_ann = draw_detection_overlays_on_image(annotate_base, overlay_items)
                if not frame_ann and sign_bbox:
                    frame_ann = draw_yolo_bbox_on_image(
                        annotate_base,
                        sign_bbox,
                        label=payload.get('sign_name_en') or '',
                        confidence=float(yolo_raw_frame.get('confidence') or 0) if yolo_raw_frame else 0.0,
                    )
                if frame_ann:
                    cleanup.append(frame_ann)
                    annotated_frame_paths.append(frame_ann)
                else:
                    annotated_frame_paths.append(annotate_base)
                frame_summaries.append({
                    'timestamp_sec': round(timestamp, 2),
                    'confidence': score,
                    'sign_name_en': payload.get('sign_name_en') or '',
                    'sign_bbox': sign_bbox,
                    'detected_plate': plate_text,
                    'vehicle_count': len(vehicles),
                    'vehicles': vehicle_rows,
                    'objects': objects,
                    'above_threshold': bool(score >= min_conf_pct or (not payload.get('sign_name_en') and len(vehicles) > 0)),
                })
                # Prefer frames with detections (vehicles/signs) for the best still.
                rank = score if (score >= min_conf_pct or not payload.get('sign_name_en')) else score * 0.5
                if overlay_items:
                    rank += 5.0 + min(len(overlay_items), 8)
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

            pipeline_out = best_payload['pipeline_out']
            storage_path = best_payload['storage_path']
            annotate_base = best_payload.get('detect_path') or storage_path
            result = pipeline_out['sign_result']
            vehicles = pipeline_out['vehicles']
            plate_result = pipeline_out['plate_result']
            payload = pipeline_out['payload']

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
                        'bbox': sign_bbox,
                        'label': payload.get('sign_name_en') or 'Sign',
                        'confidence': float(yolo_raw.get('confidence') or result.get('confidence') or 0),
                        'color': (245, 92, 139),
                    })
                for v in (vehicles or [])[:12]:
                    vb = v.get('bbox') if isinstance(v, dict) else None
                    if vb:
                        overlay_best.append({
                            'bbox': vb,
                            'label': v.get('label') or v.get('vehicle_type') or 'Vehicle',
                            'confidence': float(v.get('confidence') or 0),
                            'color': (214, 182, 6),
                        })
            annotated_path = draw_detection_overlays_on_image(annotate_base, overlay_best)
            if not annotated_path:
                annotated_path = draw_yolo_bbox_on_image(
                    annotate_base,
                    (yolo_raw.get('sign_bbox') if yolo_raw else None) or result.get('sign_bbox'),
                    label=payload.get('sign_name_en') or '',
                    confidence=float(yolo_raw.get('confidence') or 0) if yolo_raw else 0.0,
                )
            if annotated_path:
                cleanup.append(annotated_path)

            evidence = capture_evidence_snapshots(storage_path, vehicles, plate_result)
            matched = plate_result.get('matched_vehicle') or {}
            matched_vehicle = None
            if matched.get('id'):
                from vehicles.models import Vehicle

                matched_vehicle = Vehicle.objects.filter(pk=matched['id']).first()

            storage_name = f'video-detect-{uuid.uuid4().hex[:12]}.jpg'
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

            payload['log_id'] = log.id
            payload['uploaded_image'] = api_media_url(request, log.uploaded_image)
            elapsed = round(time.perf_counter() - started_at, 3)
            payload['processing_time'] = elapsed
            payload['video_analysis'] = {
                'source_filename': video.name,
                'frames_analyzed': len(frame_summaries),
                'best_frame_timestamp_sec': round(best_payload['timestamp'], 2),
                'frame_summaries': frame_summaries,
                'processing_time_sec': elapsed,
                'settings': {
                    'model': 'YOLOv11',
                    'confidence': min_confidence,
                    'max_frames': max_frames,
                    'enable_ocr': enable_ocr,
                    'enable_tracking': enable_tracking,
                },
            }
            if annotated_path:
                from django.core.files.storage import default_storage

                with open(annotated_path, 'rb') as handle:
                    saved = default_storage.save(
                        f'ai/evidence/signs/yolo-annotated-{uuid.uuid4().hex[:12]}.jpg',
                        File(handle),
                    )
                payload['annotated_processed_image'] = api_media_path(saved)
            if annotated_frame_paths:
                preview_tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
                preview_tmp.close()
                cleanup.append(preview_tmp.name)
                if build_annotated_preview_video(annotated_frame_paths, preview_tmp.name):
                    from django.core.files.storage import default_storage

                    with open(preview_tmp.name, 'rb') as handle:
                        saved_vid = default_storage.save(
                            f'ai/evidence/videos/annotated-preview-{uuid.uuid4().hex[:12]}.mp4',
                            File(handle),
                        )
                    payload['annotated_preview_video'] = api_media_path(saved_vid)
            if log.vehicle_snapshot:
                payload['vehicle_snapshot'] = api_media_url(request, log.vehicle_snapshot)
            if log.plate_snapshot:
                payload['plate_snapshot'] = api_media_url(request, log.plate_snapshot)

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
    Camera frame → AI pipeline (Task 296).
    Accepts camera_id (RTSP/HTTP snapshot) or multipart image (delegates to DetectSignView).
    """

    def post(self, request):
        if request.FILES.get('image'):
            return super().post(request)

        camera_id = request.data.get('camera_id')
        if not camera_id:
            return error_response('Provide camera_id or image file')

        from django.core.files.uploadedfile import SimpleUploadedFile

        from .frame_capture import capture_camera_frame

        path, fname = capture_camera_frame(camera_id)
        if not path:
            return error_response(
                'Could not capture frame — check camera frame_source_url (HTTP snapshot, RTSP, or /demo-cameras/…)',
                status_code=502,
            )
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
                if not request.data.get('camera_id'):
                    request.data['camera_id'] = camera_id
                if not request.data.get('original_filename'):
                    request.data['original_filename'] = upload_name
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
                        'video': 'required (mp4, webm, mov, avi)',
                        'confidence': 'optional 0–1 (or 0–100) min score',
                        'max_frames': 'optional 2–24 (default 6)',
                        'enable_ocr': 'optional true/false (default true)',
                        'enable_tracking': 'optional true/false (default true)',
                        'observed_action': 'optional demo violation rule',
                        'auto_create_violation': 'optional true/false',
                    },
                    'note': 'Samples frames; returns best detection + annotated preview MP4 + log.',
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
                    'body': {'camera_id': 'registered infrastructure camera id'},
                    'optional_multipart': {'image': 'override snapshot'},
                },
            },
            'logs': f'{ai}logs/',
            'stats': f'{ai}stats/',
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


class DetectionPageStatsView(APIView):
    """Live stats, sign catalog, and model status for the AI Detection UI."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        data = get_ai_detection_page_stats(request.user, request)
        return success_response(data)
