from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import success_response
from apps.rbac.permissions import HasRBACRole

from .models import OCRResult
from .serializers import OCRResultCreateSerializer, OCRResultSerializer


def filter_ocr_queryset(queryset, request):
    detection_id = request.query_params.get('detection_id', '').strip()
    if detection_id:
        queryset = queryset.filter(detection_id=detection_id)

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(raw_text__icontains=search)
            | Q(detection__plate_number__icontains=search)
            | Q(detection__camera__name__icontains=search),
        )

    return queryset


class OCRResultListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = OCRResult.objects.select_related('detection').order_by('-created_at')
        queryset = filter_ocr_queryset(queryset, request)

        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50

        serializer = OCRResultSerializer(queryset[:limit], many=True)
        return success_response(serializer.data)

    def post(self, request):
        serializer = OCRResultCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ocr_result = serializer.save()
        return success_response(
            OCRResultSerializer(ocr_result).data,
            message='OCR result stored successfully.',
            status=status.HTTP_201_CREATED,
        )


class OCRResultDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request, ocr_id: int):
        ocr_result = get_object_or_404(OCRResult.objects.select_related('detection'), id=ocr_id)
        return success_response(OCRResultSerializer(ocr_result).data)


class OCRResultByDetectionView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin', 'officer')]

    def get(self, request, detection_id: int):
        ocr_result = get_object_or_404(OCRResult.objects.select_related('detection'), detection_id=detection_id)
        return success_response(OCRResultSerializer(ocr_result).data)
