from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.audit_service import log_audit
from core.permissions import IsPoliceOrAdmin
from core.responses import error_response, success_response
from vehicles.models import Vehicle

from .models import UnknownVehicle
from .serializers import UnknownVehicleSerializer


class UnknownVehicleListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    serializer_class = UnknownVehicleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_resolved', 'camera']
    search_fields = ['plate_detected', 'violation_type', 'officer_note']
    ordering_fields = ['detected_at', 'plate_detected']
    queryset = UnknownVehicle.objects.select_related(
        'camera', 'resolved_by', 'linked_vehicle',
    ).order_by('-detected_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return success_response(serializer.data)


class UnknownVehicleResolveView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def patch(self, request, pk):
        try:
            record = UnknownVehicle.objects.get(pk=pk)
        except UnknownVehicle.DoesNotExist:
            return error_response('Record not found', status_code=status.HTTP_404_NOT_FOUND)

        vehicle_id = request.data.get('linked_vehicle_id')
        officer_note = str(request.data.get('officer_note') or record.officer_note or '').strip()

        linked_vehicle = None
        if vehicle_id:
            linked_vehicle = Vehicle.objects.filter(pk=vehicle_id).first()
            if not linked_vehicle:
                return error_response('Vehicle not found', status_code=status.HTTP_404_NOT_FOUND)

        record.is_resolved = True
        record.resolved_by = request.user
        record.resolved_at = timezone.now()
        record.officer_note = officer_note
        if linked_vehicle:
            record.linked_vehicle = linked_vehicle
        record.save()

        log_audit(
            user=request.user,
            action='update',
            resource='unknown_vehicle',
            resource_id=record.id,
            request=request,
            new_value={'is_resolved': True, 'linked_vehicle_id': str(linked_vehicle.id) if linked_vehicle else None},
        )

        return success_response(
            UnknownVehicleSerializer(record, context={'request': request}).data,
            message='Unknown vehicle resolved',
        )
