from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.audit_service import log_audit
from core.permissions import IsDriver, IsPoliceOrAdmin
from core.responses import error_response, success_response
from fines.models import Fine
from users.models import Driver
from violations.models import TrafficViolation

from .models import ViolationAppeal
from .serializers import ViolationAppealCreateSerializer, ViolationAppealSerializer


class AppealListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'driver']
    search_fields = ['reason', 'driver__license_no', 'driver__user__full_name']
    ordering_fields = ['submitted_at', 'status']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ViolationAppealCreateSerializer
        return ViolationAppealSerializer

    def get_queryset(self):
        qs = ViolationAppeal.objects.select_related(
            'violation', 'fine', 'driver__user', 'reviewed_by',
        )
        user = self.request.user
        if user.role == 'admin':
            return qs
        if user.role == 'police':
            return qs
        try:
            driver = user.driver_profile
        except Driver.DoesNotExist:
            return qs.none()
        return qs.filter(driver=driver)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = ViolationAppealSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        if request.user.role != 'driver':
            return error_response('Only drivers can submit appeals', status_code=status.HTTP_403_FORBIDDEN)

        serializer = ViolationAppealCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            driver = request.user.driver_profile
        except Driver.DoesNotExist:
            return error_response('Driver profile not found', status_code=status.HTTP_400_BAD_REQUEST)

        try:
            violation = TrafficViolation.objects.get(pk=data['violation_id'])
        except TrafficViolation.DoesNotExist:
            return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)

        if violation.driver_id != driver.id:
            return error_response('You can only appeal your own violations', status_code=status.HTTP_403_FORBIDDEN)

        if ViolationAppeal.objects.filter(violation=violation, status='pending').exists():
            return error_response('A pending appeal already exists for this violation', status_code=status.HTTP_400_BAD_REQUEST)

        fine = None
        fine_id = data.get('fine_id')
        if fine_id:
            fine = Fine.objects.filter(pk=fine_id, driver=request.user).first()
        elif hasattr(violation, 'fine'):
            fine = getattr(violation, 'fine', None)

        appeal = ViolationAppeal.objects.create(
            violation=violation,
            fine=fine,
            driver=driver,
            reason=data['reason'],
            evidence_image=data.get('evidence_image'),
        )

        if fine:
            fine.status = 'disputed'
            fine.save(update_fields=['status'])

        log_audit(
            user=request.user,
            action='create',
            resource='violation_appeal',
            resource_id=appeal.id,
            request=request,
            new_value={'violation_id': str(violation.id), 'status': appeal.status},
        )

        return success_response(
            ViolationAppealSerializer(appeal, context={'request': request}).data,
            message='Appeal submitted',
            status_code=status.HTTP_201_CREATED,
        )


class AppealDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ViolationAppealSerializer

    def get_queryset(self):
        qs = ViolationAppeal.objects.select_related(
            'violation', 'fine', 'driver__user', 'reviewed_by',
        )
        user = self.request.user
        if user.role in ('admin', 'police'):
            return qs
        try:
            driver = user.driver_profile
        except Driver.DoesNotExist:
            return qs.none()
        return qs.filter(driver=driver)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data)


class AppealReviewView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def patch(self, request, pk):
        try:
            appeal = ViolationAppeal.objects.select_related('fine', 'violation').get(pk=pk)
        except ViolationAppeal.DoesNotExist:
            return error_response('Appeal not found', status_code=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in ('upheld', 'dismissed'):
            return error_response('status must be upheld or dismissed')

        old_status = appeal.status
        appeal.status = new_status
        appeal.officer_comments = str(request.data.get('officer_comments') or appeal.officer_comments or '').strip()
        appeal.reviewed_by = request.user
        appeal.review_date = timezone.now()
        appeal.save()

        if appeal.fine_id:
            if new_status == 'dismissed':
                appeal.fine.status = 'dismissed'
            elif new_status == 'upheld':
                appeal.fine.status = 'pending'
            appeal.fine.save(update_fields=['status'])

        log_audit(
            user=request.user,
            action='update',
            resource='violation_appeal',
            resource_id=appeal.id,
            request=request,
            old_value={'status': old_status},
            new_value={'status': new_status, 'officer_comments': appeal.officer_comments},
        )

        return success_response(
            ViolationAppealSerializer(appeal, context={'request': request}).data,
            message=f'Appeal {new_status}',
        )
