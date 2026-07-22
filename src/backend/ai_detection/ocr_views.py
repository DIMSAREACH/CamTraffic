"""Dedicated OCR endpoints (plate recognition)."""
import os
import tempfile

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsPoliceOrAdmin
from core.responses import error_response, success_response

from .image_utils import ALLOWED_UPLOAD_EXTENSIONS, cleanup_temp_files, prepare_detection_image
from .models import AIDetectionLog
from .plate_ocr import plate_ocr_enabled, recognize_plate


class OCRResultListView(APIView):
    """List stored OCR / plate reads from AI detection logs."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        qs = AIDetectionLog.objects.select_related('user').exclude(detected_plate='').order_by('-created_at')
        plate = request.query_params.get('plate', '').strip()
        if plate:
            qs = qs.filter(detected_plate__icontains=plate)
        if request.user.role == 'police':
            qs = qs.filter(user=request.user)
        try:
            limit = max(1, min(int(request.query_params.get('limit', 50)), 200))
        except (ValueError, TypeError):
            limit = 50

        results = []
        for log in qs[:limit]:
            results.append({
                'id': str(log.id),
                'detected_plate': log.detected_plate,
                'plate_confidence': log.plate_confidence,
                'plate_type': log.plate_type,
                'plate_ocr_details': log.plate_ocr_details or [],
                'user_id': str(log.user_id),
                'user_name': log.user.full_name if log.user_id else '',
                'created_at': log.created_at.isoformat() if log.created_at else None,
            })
        return success_response({'count': len(results), 'results': results})


class OCRRecognizeView(APIView):
    """Run plate OCR on an uploaded image (standalone, no full sign pipeline)."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def post(self, request):
        if not plate_ocr_enabled():
            return error_response('Plate OCR is disabled on this server.', status_code=503)

        image = request.FILES.get('image')
        if not image:
            return error_response('Image file is required')

        ext = os.path.splitext(image.name)[1].lower()
        if ext not in ALLOWED_UPLOAD_EXTENSIONS:
            return error_response('Invalid image format. Use JPG, PNG, WEBP, or AVIF.')

        tmp_path = None
        detect_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                for chunk in image.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            detect_path, _ = prepare_detection_image(tmp_path)
            result = recognize_plate(detect_path or tmp_path)
            return success_response(result, message='OCR complete')
        except Exception as exc:
            return error_response(f'OCR failed: {exc}', status_code=500)
        finally:
            cleanup_temp_files([p for p in (tmp_path, detect_path) if p])
