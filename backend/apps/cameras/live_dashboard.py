from django.db.models import Q

from .models import Camera
from .serializers import CameraLiveFeedSerializer


def filter_live_camera_queryset(queryset, request):
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(code__icontains=search)
            | Q(name__icontains=search)
            | Q(location__icontains=search)
            | Q(station__name__icontains=search),
        )

    station_id = request.query_params.get('station_id', '').strip()
    if station_id:
        queryset = queryset.filter(station_id=station_id)

    camera_status = request.query_params.get('status', '').strip()
    if camera_status:
        queryset = queryset.filter(status=camera_status)

    return queryset


def build_live_dashboard_payload(filtered_queryset, summary_queryset):
    streaming_cameras = summary_queryset.filter(status=Camera.Status.ONLINE).exclude(stream_url='')
    return {
        'total_cameras': summary_queryset.count(),
        'online_cameras': summary_queryset.filter(status=Camera.Status.ONLINE).count(),
        'offline_cameras': summary_queryset.filter(status=Camera.Status.OFFLINE).count(),
        'streaming_cameras': streaming_cameras.count(),
        'cameras': CameraLiveFeedSerializer(filtered_queryset, many=True).data,
    }
