from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated

from django.db import connection, transaction
from django.db.utils import IntegrityError
from django.utils import timezone
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsPoliceOrAdmin
from core.responses import error_response, success_response

from .models import Camera, Road
from .serializers import CameraSerializer, RoadSerializer
from .camera_models import CAMERA_MODELS, get_hikvision_traffic_camera


def _spec_to_dict(key: str, spec) -> dict:
    return {
        'key': key,
        'model_code': spec.model_code,
        'manufacturer': spec.manufacturer,
        'model_name': spec.model_name,
        'description': spec.description,
        'has_radar': spec.has_radar,
        'radar_frequency_ghz': spec.radar_frequency_ghz,
        'radar_range_m': list(spec.radar_range_m) if spec.radar_range_m else None,
        'capture_rate_percent': spec.capture_rate_percent,
        'max_targets': spec.max_targets,
        'speed_range_kmh': list(spec.speed_range_kmh) if spec.speed_range_kmh else None,
        'speed_accuracy_kmh': spec.speed_accuracy_kmh,
        'lane_coverage': spec.lane_coverage,
        'detection_distance_m': spec.detection_distance_m,
        'vehicle_types_supported': list(spec.vehicle_types_supported),
        'ip_rating': spec.ip_rating,
        'supports_virtual_coils': spec.supports_virtual_coils,
        'supports_anpr': spec.supports_anpr,
        'supports_traffic_flow': spec.supports_traffic_flow,
        'supports_incident_detection': spec.supports_incident_detection,
        'resolution': spec.resolution,
        'frame_rate': spec.frame_rate,
    }


class CameraModelsCatalogView(APIView):
    """List available camera hardware models (Hikvision iDS-TCD402, etc.)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        models = [_spec_to_dict(key, spec) for key, spec in CAMERA_MODELS.items()]
        hik = get_hikvision_traffic_camera()
        return success_response({
            'models': models,
            'default_traffic_model': hik.model_code,
        })


# Tables that reference cameras but are not fully covered by Django CASCADE/SET_NULL
# (legacy/schema drift). Clear these before delete so admin delete does not 500.
_CAMERA_CHILD_DELETE_TABLES = (
    'camera_events',
    'camera_recordings',
    'camera_snapshots',
    'camera_groups_cameras',
)
_CAMERA_CHILD_NULL_TABLES = (
    'traffic_violations',
    'unknown_vehicles',
)


def _table_exists(cursor, table: str) -> bool:
    """True if table exists in the current database (PostgreSQL / SQLite)."""
    vendor = connection.vendor
    if vendor == 'postgresql':
        cursor.execute(
            'SELECT 1 FROM information_schema.tables '
            'WHERE table_schema = current_schema() AND table_name = %s',
            [table],
        )
        return cursor.fetchone() is not None
    if vendor == 'sqlite':
        cursor.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name = %s",
            [table],
        )
        return cursor.fetchone() is not None
    # Fallback: attempt and let caller ignore missing tables
    return True


def _detach_camera_dependencies(camera: Camera) -> None:
    """Remove or null FK rows that would block deleting a camera.

    Legacy table names are allowlisted; skip any that are not present so
    schema drift does not cause admin camera DELETE to 500.
    """
    cam_id = str(camera.pk)
    with connection.cursor() as cursor:
        for table in _CAMERA_CHILD_DELETE_TABLES:
            if not _table_exists(cursor, table):
                continue
            cursor.execute(
                f'DELETE FROM {table} WHERE camera_id = %s',  # noqa: S608 — fixed allowlist
                [cam_id],
            )
        for table in _CAMERA_CHILD_NULL_TABLES:
            if not _table_exists(cursor, table):
                continue
            cursor.execute(
                f'UPDATE {table} SET camera_id = NULL WHERE camera_id = %s',  # noqa: S608
                [cam_id],
            )

class CameraLiveStatusView(APIView):
    """Polling endpoint for live dashboard camera health (Task 303)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Camera.objects.select_related('road').order_by('road__name', 'name')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        cameras = [
            {
                'id': str(c.id),
                'name': c.name,
                'code': c.code,
                'status': c.status,
                'road': c.road.name if c.road_id else '',
                'last_ping': c.last_ping.isoformat() if c.last_ping else None,
                'detection_count_today': c.detection_count_today,
                'frame_source_url': c.frame_source_url,
            }
            for c in qs[:100]
        ]
        active = sum(1 for c in cameras if c['status'] == 'active')
        # Everything not live counts as offline for the dashboard KPI subtitle
        offline = sum(1 for c in cameras if c['status'] != 'active')
        return success_response({
            'cameras': cameras,
            'summary': {
                'total': len(cameras),
                'active': active,
                'offline': offline,
                'maintenance': sum(1 for c in cameras if c['status'] == 'maintenance'),
            },
            'polled_at': timezone.now().isoformat(),
        })


class RoadListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = RoadSerializer
    queryset = Road.objects.prefetch_related('cameras').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['road_type', 'status', 'city']
    search_fields = ['name', 'city', 'region']
    ordering_fields = ['name', 'city', 'created_at']
    ordering = ['-created_at']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        road = serializer.save()
        return success_response(
            RoadSerializer(road).data,
            message='Road created',
            status_code=status.HTTP_201_CREATED,
        )


class RoadDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = RoadSerializer
    queryset = Road.objects.prefetch_related('cameras').all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return success_response(self.get_serializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        road = serializer.save()
        return success_response(RoadSerializer(road).data, message='Road updated')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.cameras.exists():
            return error_response(
                'Cannot delete road with cameras — remove or reassign cameras first',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return success_response(message='Road deleted')


class CameraListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    serializer_class = CameraSerializer
    queryset = Camera.objects.select_related('road').all()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['road', 'camera_type', 'status', 'road__city']
    search_fields = ['name', 'code', 'model', 'road__name']
    ordering_fields = ['name', 'created_at', 'status']
    ordering = ['-created_at']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        camera = serializer.save()
        return success_response(
            CameraSerializer(camera).data,
            message='Camera created',
            status_code=status.HTTP_201_CREATED,
        )


class CameraDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    serializer_class = CameraSerializer
    queryset = Camera.objects.select_related('road').all()

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return success_response(self.get_serializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        camera = serializer.save()
        return success_response(CameraSerializer(camera).data, message='Camera updated')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            with transaction.atomic():
                _detach_camera_dependencies(instance)
                instance.delete()
        except IntegrityError:
            return error_response(
                message=(
                    'Cannot delete this camera because related records still reference it. '
                    'Detach events/recordings first, or contact an administrator.'
                ),
                status_code=status.HTTP_409_CONFLICT,
            )
        return success_response(message='Camera deleted')
