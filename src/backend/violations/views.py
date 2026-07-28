from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
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


class ViolationRuleListView(generics.ListCreateAPIView):
    """List active rules for all authenticated users; admins can list all and create."""

    serializer_class = ViolationRuleSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = ViolationRule.objects.all().order_by('sign_class_key', 'prohibited_action')
        user = self.request.user
        include_inactive = (
            getattr(user, 'role', None) == 'admin'
            and str(self.request.query_params.get('all', '')).lower() in ('1', 'true', 'yes')
        )
        if not include_inactive:
            qs = qs.filter(is_active=True)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, message='Violation rule created', status_code=status.HTTP_201_CREATED)


class ViolationRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin-only retrieve / update / delete for a single violation rule."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = ViolationRuleSerializer
    queryset = ViolationRule.objects.all()

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, message='Violation rule updated')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return success_response(message='Violation rule deleted')


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
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = TrafficViolation.objects.select_related(
            'driver__user', 'officer__user', 'vehicle', 'fine', 'ai_detection_log',
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
        page = self.paginate_queryset(queryset)
        serializer = TrafficViolationSerializer(
            page if page is not None else queryset,
            many=True,
            context={'request': request},
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
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
            evidence_image=(
                detection_log.uploaded_image
                if detection_log and detection_log.uploaded_image
                else None
            ),
            vehicle_evidence_image=(
                detection_log.vehicle_snapshot
                if detection_log and detection_log.vehicle_snapshot
                else None
            ),
            plate_evidence_image=(
                detection_log.plate_snapshot
                if detection_log and detection_log.plate_snapshot
                else None
            ),
            plate_detected=(
                data.get('plate_number')
                or data.get('plate_detected')
                or (getattr(detection_log, 'detected_plate', None) if detection_log else '')
                or ''
            ),
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
            'driver__user', 'officer__user', 'vehicle', 'fine', 'ai_detection_log',
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
        # Status transitions: traffic officers and admins (demo / ops oversight).
        new_status = request.data.get('status')
        if new_status in ('confirmed', 'rejected') and request.user.role not in ('police', 'admin'):
            return error_response(
                'Only traffic officers or admins can approve or reject violations',
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


class BulkViolationApprovalView(APIView):
    """POST /api/violations/bulk-approve/ - Approve multiple violations at once"""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    
    def post(self, request):
        from django.db import transaction
        
        violation_ids = request.data.get('violation_ids', [])
        officer_note = request.data.get('officer_note', '')
        
        if not violation_ids:
            return error_response('No violations selected', status_code=status.HTTP_400_BAD_REQUEST)
        
        if not isinstance(violation_ids, list):
            return error_response('violation_ids must be a list', status_code=status.HTTP_400_BAD_REQUEST)
        
        # Bulk update with transaction
        with transaction.atomic():
            violations = TrafficViolation.objects.select_for_update().filter(
                id__in=violation_ids,
                status='pending_review',
            )
            
            count = violations.count()
            if count == 0:
                return error_response('No pending violations found with the provided IDs', status_code=status.HTTP_404_NOT_FOUND)
            
            # Get or create officer profile for police users
            officer = None
            if request.user.role == 'police':
                officer, _ = Officer.objects.get_or_create(
                    user=request.user,
                    defaults={
                        'badge_no': f'BADGE-{request.user.id}',
                        'rank': 'Officer',
                        'department': 'Traffic Police',
                    },
                )
            
            updated = violations.update(
                status='confirmed',
                officer=officer,
                officer_note=officer_note,
                updated_at=timezone.now(),
            )
        
        # Clear cache
        from django.core.cache import cache
        cache.delete('violation_stats_summary')
        
        return success_response({
            'approved_count': updated,
            'message': f'{updated} violation(s) approved',
        })


class BulkViolationRejectionView(APIView):
    """POST /api/violations/bulk-reject/ - Reject multiple violations at once"""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    
    def post(self, request):
        from django.db import transaction
        
        violation_ids = request.data.get('violation_ids', [])
        officer_note = request.data.get('officer_note', 'Bulk rejection')
        
        if not violation_ids:
            return error_response('No violations selected', status_code=status.HTTP_400_BAD_REQUEST)
        
        if not isinstance(violation_ids, list):
            return error_response('violation_ids must be a list', status_code=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            violations = TrafficViolation.objects.select_for_update().filter(
                id__in=violation_ids,
                status='pending_review',
            )
            
            count = violations.count()
            if count == 0:
                return error_response('No pending violations found with the provided IDs', status_code=status.HTTP_404_NOT_FOUND)
            
            officer = None
            if request.user.role == 'police':
                officer, _ = Officer.objects.get_or_create(
                    user=request.user,
                    defaults={
                        'badge_no': f'BADGE-{request.user.id}',
                        'rank': 'Officer',
                        'department': 'Traffic Police',
                    },
                )
            
            updated = violations.update(
                status='rejected',
                officer=officer,
                officer_note=officer_note,
                updated_at=timezone.now(),
            )
        
        # Clear cache
        from django.core.cache import cache
        cache.delete('violation_stats_summary')
        
        return success_response({
            'rejected_count': updated,
            'message': f'{updated} violation(s) rejected',
        })
