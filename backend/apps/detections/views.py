from django.shortcuts import get_object_or_404
from django.db.models import Avg, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import success_response
from apps.dashboard.officer_services import get_officer_profile, station_cameras, station_detections
from apps.rbac.permissions import HasRBACRole

from .models import Detection
from .serializers import (
    DetectionDetailSerializer,
    DetectionMonitorSerializer,
    DetectionMonitorSummarySerializer,
    OfficerLiveDetectionCameraOptionSerializer,
)


def filter_detection_monitor_queryset(queryset, request):
    camera_id = request.query_params.get('camera_id', '').strip()
    if camera_id:
        queryset = queryset.filter(camera_id=camera_id)

    model_version_id = request.query_params.get('model_version_id', '').strip()
    if model_version_id:
        queryset = queryset.filter(model_version_id=model_version_id)

    min_confidence = request.query_params.get('min_confidence', '').strip()
    if min_confidence:
        try:
            queryset = queryset.filter(confidence__gte=float(min_confidence))
        except ValueError:
            pass

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(plate_number__icontains=search)
            | Q(camera__name__icontains=search)
            | Q(camera__code__icontains=search)
            | Q(traffic_sign__name_en__icontains=search)
            | Q(traffic_sign__code__icontains=search),
        )

    return queryset


def paginate_detection_monitor_queryset(queryset, request):
    limit_param = request.query_params.get('limit', '50').strip()
    try:
        limit = max(1, min(int(limit_param), 100))
    except ValueError:
        limit = 50

    return queryset[:limit]


def build_detection_monitor_summary(queryset):
    today = timezone.localdate()
    confidence_avg = queryset.aggregate(avg=Avg('confidence'))['avg'] or 0.0
    latest = queryset.order_by('-detected_at').values_list('detected_at', flat=True).first()

    return {
        'total_detections': queryset.count(),
        'detections_today': queryset.filter(detected_at__date=today).count(),
        'average_confidence': round(float(confidence_avg), 4),
        'low_confidence_count': queryset.filter(confidence__lt=0.7).count(),
        'latest_detected_at': latest,
    }


class DetectionMonitorListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = Detection.objects.select_related(
            'camera',
            'model_version__ai_model',
            'traffic_sign',
        ).order_by('-detected_at')
        queryset = filter_detection_monitor_queryset(queryset, request)
        queryset = paginate_detection_monitor_queryset(queryset, request)
        serializer = DetectionMonitorSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)


class DetectionMonitorSummaryView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = Detection.objects.all()
        payload = build_detection_monitor_summary(queryset)
        serializer = DetectionMonitorSummarySerializer(payload)
        return success_response(serializer.data)


class OfficerLiveDetectionListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        queryset = station_detections(officer).select_related(
            'camera',
            'model_version__ai_model',
            'traffic_sign',
        ).order_by('-detected_at')
        queryset = filter_detection_monitor_queryset(queryset, request)
        queryset = paginate_detection_monitor_queryset(queryset, request)
        serializer = DetectionMonitorSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)


class OfficerLiveDetectionSummaryView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        queryset = station_detections(officer)
        payload = build_detection_monitor_summary(queryset)
        serializer = DetectionMonitorSummarySerializer(payload)
        return success_response(serializer.data)


class OfficerLiveDetectionCameraOptionsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        cameras = station_cameras(officer).order_by('name')
        payload = [
            {
                'id': camera.id,
                'name': camera.name,
                'code': camera.code,
                'status': camera.status,
            }
            for camera in cameras
        ]
        serializer = OfficerLiveDetectionCameraOptionSerializer(payload, many=True)
        return success_response(serializer.data)


def detection_detail_queryset():
    return Detection.objects.select_related(
        'camera',
        'model_version__ai_model',
        'traffic_sign',
        'ocr_result',
    )


class DetectionMonitorDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request, detection_id: int):
        detection = get_object_or_404(detection_detail_queryset(), id=detection_id)
        serializer = DetectionDetailSerializer(detection, context={'request': request})
        return success_response(serializer.data)


class OfficerLiveDetectionDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request, detection_id: int):
        officer = get_officer_profile(request.user)
        detection = get_object_or_404(
            station_detections(officer).select_related(
                'camera',
                'model_version__ai_model',
                'traffic_sign',
                'ocr_result',
            ),
            id=detection_id,
        )
        serializer = DetectionDetailSerializer(detection, context={'request': request})
        return success_response(serializer.data)
