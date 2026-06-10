import logging
import os
import tempfile
import uuid

from django.conf import settings
from django.core.files import File
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
from .pipeline_enforcement import apply_pipeline_enforcement
from .result_compose import notification_message
from .serializers import AIDetectionLogSerializer
from .tts import synthesize_speech, tts_available

logger = logging.getLogger(__name__)


class KhmerTTSView(APIView):
    """Khmer speech MP3 — uses Microsoft Edge voices (no Windows Khmer voice needed)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not tts_available():
            return error_response(
                'Khmer TTS is not installed on the server. Run: pip install edge-tts',
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
        try:
            detect_path, jpeg_path, extra_cleanup = prepare_detection_image(tmp_path)
            pipeline_out = run_detection_pipeline(detect_path, original_filename=image.name)
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

        try:
            result = pipeline_out['sign_result']
            vehicles = pipeline_out['vehicles']
            plate_result = pipeline_out['plate_result']
            payload = pipeline_out['payload']
            matched = plate_result.get('matched_vehicle') or {}
            evidence = capture_evidence_snapshots(storage_path, vehicles, plate_result)
            with open(storage_path, 'rb') as stored:
                log = AIDetectionLog.objects.create(
                    user=request.user,
                    uploaded_image=File(stored, name=storage_name),
                    detected_sign=result['sign_name'],
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
                    matched_vehicle_id=matched.get('id'),
                    vehicle_snapshot=evidence.get('vehicle_snapshot'),
                    plate_snapshot=evidence.get('plate_snapshot'),
                )
            payload['log_id'] = log.id
            payload['uploaded_image'] = (
                request.build_absolute_uri(log.uploaded_image.url) if log.uploaded_image else ''
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

            live_capture = _is_live_capture_filename(image.name)
            enforcement: dict = {}
            if not live_capture:
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
            )

            if not live_capture:
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


class DetectionPageStatsView(APIView):
    """Live stats, sign catalog, and model status for the AI Detection UI."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_ai_detection_page_stats(request.user, request)
        return success_response(data)
