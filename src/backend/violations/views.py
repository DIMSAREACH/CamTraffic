from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ai_detection.models import AIDetectionLog
from ai_detection.pipeline_enforcement import resolve_driver, resolve_vehicle
from core.permissions import IsAdmin, IsPoliceOrAdmin
from core.responses import error_response, success_response
from infrastructure.models import Camera, Road
from users.models import Driver, Officer
from vehicles.models import Vehicle

from .models import TrafficViolation, ViolationRule
from .serializers import (
    TrafficViolationSerializer,
    TrafficViolationUpdateSerializer,
    ViolationCreateSerializer,
    ViolationEvaluateSerializer,
    ViolationRuleSerializer,
)
from .services import create_violation_record, evaluate_violation, get_violation_stats, seed_default_rules


class ViolationRuleListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ViolationRuleSerializer
    queryset = ViolationRule.objects.filter(is_active=True).order_by('sign_class_key')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return success_response(serializer.data)


class ViolationEvaluateView(APIView):
    """Compare detected sign + observed action without saving."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ViolationEvaluateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        evaluation = evaluate_violation(
            class_key=data['class_key'],
            observed_action=data['observed_action'],
            sign_code=data.get('sign_code', ''),
        )
        if not evaluation:
            return success_response(
                {'is_violation': False, 'message': 'No violation rule matched'},
                message='No violation detected',
            )
        return success_response(evaluation, message='Violation rule matched')


class ViolationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TrafficViolationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'violation_type', 'driver']
    search_fields = [
        'location', 'description', 'detected_sign_code',
        'driver__license_no', 'driver__user__full_name',
    ]
    ordering_fields = ['violation_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = TrafficViolation.objects.select_related(
            'driver__user', 'officer__user', 'vehicle', 'fine',
        )
        if user.role == 'admin':
            return qs
        if user.role == 'police':
            return qs
        if user.role == 'driver':
            try:
                driver = user.driver_profile
            except Driver.DoesNotExist:
                return qs.none()
            return qs.filter(driver=driver)
        return qs.none()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = TrafficViolationSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        # Check authentication first
        if not request.user or not request.user.is_authenticated:
            return error_response('Authentication required', status_code=status.HTTP_401_UNAUTHORIZED)
        
        if request.user.role not in ('police', 'admin'):
            return error_response('Only police or admin can create violations', status_code=status.HTTP_403_FORBIDDEN)

        # Handle empty requests gracefully
        if not request.data or (not request.data.get('class_key') and not request.data.get('observed_action')):
            return error_response(
                'Missing required fields: class_key and observed_action are required to create a violation',
                status_code=status.HTTP_400_BAD_REQUEST
            )

        serializer = ViolationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            # Return detailed validation errors
            errors = []
            for field, field_errors in serializer.errors.items():
                for error in field_errors:
                    errors.append(f'{field}: {error}')
            return error_response(
                f'Validation failed: {", ".join(errors)}',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data

        driver = None
        detection_log = None
        if data.get('driver_id'):
            try:
                driver = Driver.objects.select_related('user').get(pk=data['driver_id'])
            except Driver.DoesNotExist:
                return error_response('Driver not found', status_code=status.HTTP_404_NOT_FOUND)
        elif data.get('ai_detection_log_id'):
            detection_log = AIDetectionLog.objects.select_related('matched_vehicle__driver__user').filter(
                pk=data['ai_detection_log_id'],
            ).first()
            plate_result = {}
            if detection_log:
                if detection_log.matched_vehicle_id:
                    plate_result['matched_vehicle'] = {'id': str(detection_log.matched_vehicle_id)}
                elif detection_log.detected_plate:
                    plate_result['plate_text'] = detection_log.detected_plate
                driver = resolve_driver(driver_id=None, plate_result=plate_result)
        if not driver and data.get('plate_number'):
            driver = resolve_driver(
                driver_id=None,
                plate_result={'plate_text': data['plate_number']},
            )

        if not driver:
            return error_response(
                'Driver is required — match a registered plate on the detection, or open Unknown Vehicles / pick a driver.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        evaluation = evaluate_violation(
            class_key=data['class_key'],
            observed_action=data['observed_action'],
            sign_code=data.get('sign_code', ''),
        )
        if not evaluation:
            return error_response('No violation rule matched for this sign and action', status_code=status.HTTP_400_BAD_REQUEST)

        officer = None
        if request.user.role == 'police':
            officer, _ = Officer.objects.get_or_create(
                user=request.user,
                defaults={
                    # user.id may be a UUID; avoid integer-style formatting
                    'badge_no': f'BADGE-{request.user.id}',
                    'rank': 'Officer',
                    'department': 'Traffic Police',
                },
            )

        vehicle = None
        if data.get('vehicle_id'):
            vehicle = Vehicle.objects.filter(pk=data['vehicle_id']).first()
        elif data.get('ai_detection_log_id') and detection_log:
            vehicle = resolve_vehicle(plate_result=plate_result)

        camera = Camera.objects.filter(pk=data['camera_id']).first() if data.get('camera_id') else None
        road = Road.objects.filter(pk=data['road_id']).first() if data.get('road_id') else None
        detection_log = None
        if data.get('ai_detection_log_id'):
            detection_log = AIDetectionLog.objects.filter(pk=data['ai_detection_log_id']).first()

        violation = create_violation_record(
            driver=driver,
            evaluation=evaluation,
            location=data.get('location', ''),
            officer=officer,
            vehicle=vehicle,
            camera=camera,
            road=road,
            ai_detection_log=detection_log,
            status=data.get('status', 'pending_review'),
        )
        return success_response(
            TrafficViolationSerializer(violation, context={'request': request}).data,
            message='Violation record created',
            status_code=status.HTTP_201_CREATED,
        )


class ViolationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'pk'

    def get_queryset(self):
        user = self.request.user
        qs = TrafficViolation.objects.select_related(
            'driver__user', 'officer__user', 'vehicle', 'fine',
        )
        if user.role == 'admin':
            return qs
        if user.role == 'police':
            return qs
        if user.role == 'driver':
            try:
                driver = user.driver_profile
            except Driver.DoesNotExist:
                return qs.none()
            return qs.filter(driver=driver)
        return qs.none()

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return TrafficViolationUpdateSerializer
        return TrafficViolationSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return success_response(
            TrafficViolationSerializer(instance, context={'request': request}).data,
        )

    def patch(self, request, *args, **kwargs):
        # Status transitions (approve/reject) are Traffic Operations only.
        # Admins may update metadata but not confirm/reject enforcement cases.
        new_status = request.data.get('status')
        if new_status in ('confirmed', 'rejected') and request.user.role != 'police':
            return error_response(
                'Only traffic officers can approve or reject violations',
                status_code=status.HTTP_403_FORBIDDEN,
            )
        if request.user.role not in ('police', 'admin'):
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        serializer = TrafficViolationUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            TrafficViolationSerializer(instance, context={'request': request}).data,
            message='Violation updated',
        )

    def delete(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return error_response('Only admin can delete violations', status_code=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        instance.delete()
        return success_response(None, message='Violation deleted')


class ViolationStatsView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        return success_response(get_violation_stats())


class ViolationSeedRulesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        created = seed_default_rules()
        return success_response({'created': created}, message='Violation rules seeded')
