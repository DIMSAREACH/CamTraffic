from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated

from django.utils import timezone
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsPoliceOrAdmin
from core.responses import error_response, success_response

from .models import Camera, Road
from .serializers import CameraSerializer, RoadSerializer


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
        offline = sum(1 for c in cameras if c['status'] in ('offline', 'inactive'))
        return success_response({
            'cameras': cameras,
            'summary': {'total': len(cameras), 'active': active, 'offline': offline},
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
    ordering = ['name']

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
    ordering = ['road__name', 'name']

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
        instance.delete()
        return success_response(message='Camera deleted')
