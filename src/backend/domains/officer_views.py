"""Traffic Operations domain — officer-only workflow endpoints."""
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.audit_service import log_audit
from core.responses import error_response, success_response
from domains.permissions import IsOfficerOnly
from fines.models import Fine
from fines.serializers import FineCreateSerializer, FineSerializer
from fines.services import notify_driver_fine
from users.models import Officer
from violations.models import TrafficViolation, ViolationRule
from violations.serializers import TrafficViolationSerializer

User = get_user_model()


def _officer_profile(user):
    try:
        return user.officer_profile
    except Officer.DoesNotExist:
        return None


class OfficerDetectionQueueView(APIView):
    """Pending violations awaiting officer review."""

    permission_classes = [IsAuthenticated, IsOfficerOnly]

    def get(self, request):
        # Shared pending queue for all officers (same operational view).
        qs = (
            TrafficViolation.objects.select_related('driver__user', 'vehicle', 'fine')
            .filter(status='pending_review')
            .order_by('-violation_date')[:100]
        )
        data = TrafficViolationSerializer(qs, many=True, context={'request': request}).data
        return success_response({'results': data, 'count': len(data)})


def _sync_detection_log_review(violation: TrafficViolation, review_status: str) -> None:
    """Keep AIDetectionLog.review_status aligned with HITL approve/reject."""
    log = getattr(violation, 'ai_detection_log', None)
    if log is None and violation.ai_detection_log_id:
        from ai_detection.models import AIDetectionLog

        log = AIDetectionLog.objects.filter(pk=violation.ai_detection_log_id).first()
    if not log:
        return
    if log.review_status == review_status:
        return
    log.review_status = review_status
    log.save(update_fields=['review_status'])


class OfficerApproveViolationView(APIView):
    """Approve pending violation — officer only (admins cannot approve)."""

    permission_classes = [IsAuthenticated, IsOfficerOnly]

    @transaction.atomic
    def post(self, request, pk):
        try:
            # Postgres: FOR UPDATE cannot lock nullable outer-join sides from select_related.
            violation = TrafficViolation.objects.select_for_update(of=('self',)).get(pk=pk)
        except TrafficViolation.DoesNotExist:
            return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)
        # Load relations after the row lock (nullable FKs are fine without FOR UPDATE).
        violation = (
            TrafficViolation.objects.select_related(
                'driver__user', 'vehicle', 'fine', 'ai_detection_log',
            )
            .get(pk=violation.pk)
        )

        if violation.status == 'confirmed':
            return error_response('Violation already approved', status_code=status.HTTP_400_BAD_REQUEST)
        if violation.status == 'rejected':
            return error_response('Violation was rejected', status_code=status.HTTP_400_BAD_REQUEST)

        old = {'status': violation.status}
        violation.status = 'confirmed'
        note = (request.data.get('officer_note') or '').strip()
        if note:
            violation.officer_note = note
        officer = _officer_profile(request.user)
        if officer:
            violation.officer = officer
        violation.save()
        _sync_detection_log_review(violation, 'approved')

        # Apply Cambodia demerit points to driver license record
        rule = ViolationRule.objects.filter(
            is_active=True,
            sign_class_key__iexact=violation.detected_class_key,
            prohibited_action__iexact=violation.observed_action,
        ).first()
        demerit = int(getattr(rule, 'demerit_points', 0) or 0) if rule else 0
        if demerit and violation.driver_id:
            driver = violation.driver
            driver.demerit_points = (driver.demerit_points or 0) + demerit
            # Soft suspension threshold (illustrative thesis policy)
            if driver.demerit_points >= 12 and driver.status == 'active':
                driver.status = 'suspended'
            driver.save(update_fields=['demerit_points', 'status', 'updated_at'])

        fine_data = None
        issue_fine = request.data.get('issue_fine', True)
        if issue_fine and getattr(violation, 'fine', None) is None:
            if not violation.driver_id:
                return error_response(
                    'Cannot issue fine: violation has no linked driver. Edit plate / assign driver first.',
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            amount = request.data.get('amount')
            if amount is None:
                amount = rule.default_fine_amount if rule else 10
            fine = Fine.objects.create(
                violation=violation,
                driver=violation.driver.user,
                police=request.user,
                amount=amount,
                reason=violation.description or violation.violation_type or 'Traffic violation',
                location=violation.location or 'Unknown',
                vehicle_plate=violation.plate_detected or (
                    violation.vehicle.plate_number if violation.vehicle_id else ''
                ),
            )
            notify_driver_fine(violation.driver.user, fine)
            fine_data = FineSerializer(fine, context={'request': request}).data

        log_audit(
            user=request.user,
            action='update',
            resource='traffic_violation',
            resource_id=violation.id,
            request=request,
            old_value=old,
            new_value={
                'status': 'confirmed',
                'via': 'officer_api',
                'demerit_points_applied': demerit,
            },
        )
        return success_response(
            {
                'violation': TrafficViolationSerializer(violation, context={'request': request}).data,
                'fine': fine_data,
                'demerit_points_applied': demerit,
            },
            message='Violation approved',
        )


class OfficerRejectViolationView(APIView):
    """Reject pending violation — officer only."""

    permission_classes = [IsAuthenticated, IsOfficerOnly]

    @transaction.atomic
    def post(self, request, pk):
        try:
            violation = TrafficViolation.objects.select_for_update(of=('self',)).get(pk=pk)
        except TrafficViolation.DoesNotExist:
            return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)
        violation = (
            TrafficViolation.objects.select_related('ai_detection_log', 'driver__user', 'vehicle')
            .get(pk=violation.pk)
        )

        reason = (request.data.get('reason') or request.data.get('dismissal_reason') or '').strip()
        if not reason:
            return error_response('dismissal_reason is required', status_code=status.HTTP_400_BAD_REQUEST)

        old = {'status': violation.status}
        violation.status = 'rejected'
        violation.dismissal_reason = reason
        violation.save(update_fields=['status', 'dismissal_reason', 'updated_at'])
        _sync_detection_log_review(violation, 'rejected')

        log_audit(
            user=request.user,
            action='update',
            resource='traffic_violation',
            resource_id=violation.id,
            request=request,
            old_value=old,
            new_value={'status': 'rejected', 'via': 'officer_api'},
        )
        return success_response(
            TrafficViolationSerializer(violation, context={'request': request}).data,
            message='Violation rejected',
        )


class OfficerIssueFineView(APIView):
    """Issue a fine — Traffic Operations only (admins cannot issue)."""

    permission_classes = [IsAuthenticated, IsOfficerOnly]

    def post(self, request):
        serializer = FineCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        violation = None
        if data.get('violation_id'):
            violation = (
                TrafficViolation.objects.select_related('driver__user', 'vehicle', 'fine')
                .filter(pk=data['violation_id'])
                .first()
            )
            if not violation:
                return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)
            if getattr(violation, 'fine', None):
                return error_response(
                    'Fine already issued for this violation',
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        if violation:
            driver = violation.driver.user
        else:
            try:
                driver = User.objects.get(pk=data['driver_id'], role='driver')
            except User.DoesNotExist:
                return error_response('Driver not found', status_code=status.HTTP_404_NOT_FOUND)

        amount = data.get('amount')
        reason = (data.get('reason') or '').strip()
        location = (data.get('location') or '').strip()
        vehicle_plate = (data.get('vehicle_plate') or '').strip()

        if violation:
            rule = ViolationRule.objects.filter(
                is_active=True,
                sign_class_key__iexact=violation.detected_class_key,
                prohibited_action__iexact=violation.observed_action,
            ).first()
            if amount is None:
                amount = rule.default_fine_amount if rule else 25
            if not reason:
                reason = violation.description or (violation.violation_type or 'Traffic violation').replace('_', ' ').title()
            if not location:
                location = violation.location or 'Unknown'
            if not vehicle_plate:
                vehicle_plate = violation.plate_detected or (
                    violation.vehicle.plate_number if violation.vehicle_id else ''
                )

        fine = Fine.objects.create(
            driver=driver,
            police=request.user,
            amount=amount,
            reason=reason,
            location=location,
            vehicle_plate=vehicle_plate,
            evidence_image=data.get('evidence_image'),
            violation=violation,
        )
        notify_driver_fine(driver, fine)
        log_audit(
            user=request.user,
            action='create',
            resource='fine',
            resource_id=fine.id,
            request=request,
            new_value={'amount': str(fine.amount), 'driver_id': str(driver.id), 'via': 'officer_api'},
        )
        return success_response(
            FineSerializer(fine, context={'request': request}).data,
            message='Fine issued',
            status_code=status.HTTP_201_CREATED,
        )
