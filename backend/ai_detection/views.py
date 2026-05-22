import os
import tempfile

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin
from core.responses import error_response, success_response
from notifications.models import Notification

from .models import AIDetectionLog
from .page_stats import get_ai_detection_page_stats
from .serializers import AIDetectionLogSerializer
from .services import detect_traffic_sign
from .tts import synthesize_khmer, tts_available


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
        if not text:
            return error_response('Field "text" is required')
        try:
            from django.http import HttpResponse

            audio = synthesize_khmer(text)
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
        if ext not in ('.jpg', '.jpeg', '.png', '.webp', '.bmp'):
            return error_response('Invalid image format. Use JPG, PNG, or WEBP.')

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            for chunk in image.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            result = detect_traffic_sign(tmp_path)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        log = AIDetectionLog.objects.create(
            user=request.user,
            uploaded_image=image,
            detected_sign=result['sign_name'],
            confidence=result['confidence'],
            description=result['description'],
            guidance=result['guidance'],
            processing_time=result.get('processing_time', 0),
        )
        Notification.objects.create(
            user=request.user,
            title='AI Detection Complete',
            message=f"Detected: {result['sign_name']} ({result['confidence']}% confidence)",
            type='detection',
        )
        log.refresh_from_db()
        image_url = ''
        if log.uploaded_image:
            image_url = request.build_absolute_uri(log.uploaded_image.url)

        payload = {
            'sign_name': result['sign_name'],
            'confidence': result['confidence'],
            'description': result['description'],
            'guidance': result['guidance'],
            'processing_time': result.get('processing_time', 0),
            'log_id': log.id,
            'uploaded_image': image_url,
        }
        for key in (
            'sign_name_km', 'sign_name_en', 'sign_code', 'category',
            'description_en', 'guidance_en',
        ):
            if result.get(key):
                payload[key] = result[key]
        return success_response(payload, message='Detection complete')


class DetectionLogListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'admin':
            logs = AIDetectionLog.objects.select_related('user').all()
        else:
            logs = AIDetectionLog.objects.filter(user=user)
        serializer = AIDetectionLogSerializer(logs[:100], many=True, context={'request': request})
        return success_response(serializer.data)


class DetectionPageStatsView(APIView):
    """Live stats, sign catalog, and model status for the AI Detection UI."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_ai_detection_page_stats(request.user, request)
        return success_response(data)
