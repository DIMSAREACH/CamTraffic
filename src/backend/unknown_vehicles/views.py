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
from .services import create_violation_from_unknown, queue_unmatched_plate_from_detection


def _truthy(value) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or '').lower() in ('1', 'true', 'yes', 'on')


class UnknownVehicleListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    serializer_class = UnknownVehicleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_resolved', 'camera']
    search_fields = ['plate_detected', 'violation_type', 'officer_note', 'detected_class_key']
    ordering_fields = ['detected_at', 'plate_detected']
    queryset = UnknownVehicle.objects.select_related(
        'camera', 'resolved_by', 'linked_vehicle', 'linked_violation', 'ai_detection_log',
    ).order_by('-detected_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return success_response(serializer.data)


class UnknownVehicleQueueView(APIView):
    """
    Queue Unknown User / unmatched plate from AI Detection Create Violation.
    Use when OCR has no registered driver (or no plate at all → plate UNKNOWN).
    """

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def post(self, request):
        plate = str(request.data.get('plate_detected') or request.data.get('plate_number') or '').strip()
        log_id = request.data.get('ai_detection_log_id')
        detection_log = None
        if log_id:
            try:
                from ai_detection.models import AIDetectionLog

                detection_log = AIDetectionLog.objects.filter(pk=log_id).first()
            except (TypeError, ValueError):
                detection_log = None
            if detection_log and not plate:
                plate = (detection_log.detected_plate or '').strip()

        if detection_log and detection_log.matched_vehicle_id:
            return error_response(
                'Plate is already linked to a registered vehicle — create a normal violation instead',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        conf = request.data.get('ai_confidence_score')
        try:
            conf_f = float(conf) if conf is not None and str(conf).strip() != '' else None
        except (TypeError, ValueError):
            conf_f = None
        if conf_f is None and detection_log is not None:
            conf_f = float(detection_log.plate_confidence or detection_log.confidence_score or 0) or None

        record = queue_unmatched_plate_from_detection(
            plate_detected=plate or 'UNKNOWN',
            matched_vehicle=None,
            camera_id=request.data.get('camera_id'),
            ai_confidence_score=conf_f,
            violation_type=str(request.data.get('violation_type') or '')[:30],
            observed_action=str(request.data.get('observed_action') or '')[:50],
            detected_class_key=str(
                request.data.get('detected_class_key')
                or request.data.get('class_key')
                or ''
            )[:80],
            ai_detection_log=detection_log,
        )
        if record is None:
            return error_response(
                'Could not queue unknown vehicle',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        log_audit(
            user=request.user,
            action='create',
            resource='unknown_vehicle',
            resource_id=record.id,
            request=request,
            new_value={
                'plate_detected': record.plate_detected,
                'violation_type': record.violation_type,
                'observed_action': record.observed_action,
                'ai_detection_log_id': str(detection_log.id) if detection_log else None,
            },
        )
        return success_response(
            UnknownVehicleSerializer(record, context={'request': request}).data,
            message='Queued as Unknown User — link a registered vehicle to create the violation',
            status_code=status.HTTP_201_CREATED,
        )


class UnknownVehicleResolveView(APIView):
    """
    Resolve an unmatched plate:
      - require linked_vehicle_id (identity ready)
      - optional create_violation=true → pending_review violation + evidence
    """
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def patch(self, request, pk):
        try:
            record = UnknownVehicle.objects.select_related(
                'camera', 'ai_detection_log', 'linked_vehicle', 'linked_vehicle__driver',
            ).get(pk=pk)
        except UnknownVehicle.DoesNotExist:
            return error_response('Record not found', status_code=status.HTTP_404_NOT_FOUND)

        if record.is_resolved and record.linked_violation_id and not _truthy(request.data.get('force')):
            return success_response(
                UnknownVehicleSerializer(record, context={'request': request}).data,
                message='Already resolved',
            )

        vehicle_id = request.data.get('linked_vehicle_id')
        officer_note = str(request.data.get('officer_note') or record.officer_note or '').strip()
        create_violation = _truthy(request.data.get('create_violation'))
        # Default ON for complete enforcement flow when client omits the flag.
        if 'create_violation' not in request.data:
            create_violation = True

        if not vehicle_id:
            return error_response(
                'Link a registered vehicle (linked_vehicle_id) before resolving',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        linked_vehicle = Vehicle.objects.select_related('driver', 'driver__user', 'owner').filter(pk=vehicle_id).first()
        if not linked_vehicle:
            return error_response('Vehicle not found', status_code=status.HTTP_404_NOT_FOUND)
        if not linked_vehicle.driver_id:
            return error_response(
                'Linked vehicle has no driver — register/assign a driver first',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        record.is_resolved = True
        record.resolved_by = request.user
        record.resolved_at = timezone.now()
        record.officer_note = officer_note
        record.linked_vehicle = linked_vehicle
        record.save()

        violation = None
        violation_error = None
        if create_violation and not record.linked_violation_id:
            violation, violation_error = create_violation_from_unknown(
                record=record,
                linked_vehicle=linked_vehicle,
                officer_user=request.user,
                location=str(request.data.get('location') or ''),
            )
            if violation_error:
                return error_response(
                    violation_error,
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            record.refresh_from_db()

        log_audit(
            user=request.user,
            action='update',
            resource='unknown_vehicle',
            resource_id=record.id,
            request=request,
            new_value={
                'is_resolved': True,
                'linked_vehicle_id': str(linked_vehicle.id),
                'linked_violation_id': str(record.linked_violation_id) if record.linked_violation_id else None,
                'create_violation': create_violation,
            },
        )

        payload = UnknownVehicleSerializer(record, context={'request': request}).data
        message = 'Unknown vehicle resolved'
        if violation:
            message = 'Vehicle linked and violation created (pending review)'
            payload = {
                **payload,
                'created_violation_id': str(violation.id),
            }

        return success_response(payload, message=message)
