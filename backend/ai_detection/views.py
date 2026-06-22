import csv
import logging
import os
import tempfile
import uuid

from django.conf import settings
from django.core.files import File
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin
from core.responses import error_response, success_response
from notifications.models import Notification

from .evidence_capture import capture_evidence_snapshots
from .image_utils import ALLOWED_UPLOAD_EXTENSIONS, cleanup_temp_files, prepare_detection_image
from .models import AIDetectionLog
from .page_stats import get_ai_detection_page_stats
from .pipeline import build_pipeline_steps, run_detection_pipeline
from .services import _is_live_capture_filename
from .sign_pipeline import (
    attach_pipeline_debug,
    draw_yolo_bbox_on_image,
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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not tts_available():
            return error_response(
                'Neural TTS is not installed on the server. Run: pip install edge-tts',
                status=503,
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
            return error_response(str(e), status=400)
        except Exception as e:
            return error_response(f'TTS failed: {e}', status=503)


class DetectSignView(APIView):
    permission_classes = [IsAuthenticated]

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
            if live_scan and live_capture:
                sign_only = True
                live_fast = False

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
        except ValueError as e:
            cleanup_temp_files([tmp_path, detect_path, *extra_cleanup])
            return error_response(str(e), status=400)
        except Exception as e:
            cleanup_temp_files([tmp_path, detect_path, *extra_cleanup])
            logger.exception('Detection failed for upload %s', image.name)
            return error_response(f'Detection failed: {e}', status=500)

        storage_path = jpeg_path or tmp_path
        storage_name = f'detect-{uuid.uuid4().hex[:12]}.jpg'
        if ext in ('.jpg', '.jpeg') and not jpeg_path:
            storage_name = image.name

        original_name = (request.data.get('original_filename') or image.name or '').strip()
        live_capture = _is_live_capture_filename(original_name or image.name)
        live_scan = str(request.data.get('live_scan', '')).lower() in ('true', '1', 'yes')

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

            if live_scan and live_capture:
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
                    confidence=result['confidence'],
                    description=payload.get('description') or result['description'],
                    guidance=payload.get('guidance') or result['guidance'],
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
            payload['uploaded_image'] = (
                request.build_absolute_uri(log.uploaded_image.url) if log.uploaded_image else ''
            )
            payload['guide_frame_image'] = payload['uploaded_image']
            if sign_prep:
                from django.core.files.storage import default_storage

                def _save_evidence(local_path: str, prefix: str) -> str:
                    with open(local_path, 'rb') as handle:
                        saved = default_storage.save(
                            f'ai/evidence/signs/{prefix}-{uuid.uuid4().hex[:12]}.jpg',
                            File(handle),
                        )
                    return request.build_absolute_uri(
                        f'{settings.MEDIA_URL.rstrip("/")}/{saved}',
                    )

                if sign_prep.roi_path and sign_prep.roi_path != storage_path:
                    payload['sign_crop_image'] = _save_evidence(sign_prep.roi_path, 'sign-crop')
                if sign_prep.yolo_path:
                    payload['processed_image'] = _save_evidence(sign_prep.yolo_path, 'yolo-input')
                if sign_prep.annotated_path:
                    payload['annotated_processed_image'] = _save_evidence(
                        sign_prep.annotated_path, 'yolo-annotated',
                    )
            if log.vehicle_snapshot:
                payload['vehicle_snapshot'] = request.build_absolute_uri(log.vehicle_snapshot.url)
            if log.plate_snapshot:
                payload['plate_snapshot'] = request.build_absolute_uri(log.plate_snapshot.url)
            if evidence.get('captured'):
                payload['evidence_capture'] = {
                    'vehicle_region': evidence.get('vehicle_region', ''),
                    'plate_region': evidence.get('plate_region', ''),
                }

            enforcement: dict = {}
            if not sign_only:
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
                Notification.objects.create(
                    user=request.user,
                    title=notif_title,
                    message=notif_message,
                    type='violation' if enforcement.get('violation') else 'detection',
                )
        finally:
            cleanup_temp_files([tmp_path, detect_path, *extra_cleanup])

        return success_response(payload, message='Detection complete')


class DetectionLogListView(APIView):
    permission_classes = [IsAuthenticated]

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
    """Export AI detection logs as CSV (admin: all logs; others: own logs)."""
    permission_classes = [IsAuthenticated]

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
            'vehicle_count', 'processing_time', 'model_version', 'created_at',
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
                log.created_at.isoformat() if log.created_at else '',
            ])
        return response


class DetectionPageStatsView(APIView):
    """Live stats, sign catalog, and model status for the AI Detection UI."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_ai_detection_page_stats(request.user, request)
        return success_response(data)
