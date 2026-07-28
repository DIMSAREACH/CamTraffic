"""Traffic Operations domain — officer-only workflow endpoints."""
import logging
from decimal import Decimal, InvalidOperation

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
from fines.services import apply_issue_defaults, notify_driver_fine
from users.models import Officer
from violations.models import TrafficViolation, ViolationRule
from violations.serializers import TrafficViolationSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


def _officer_profile(user):
    try:
        return user.officer_profile
    except Officer.DoesNotExist:
        return None


def _truthy(value, default=True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


def _parse_fine_amount(raw, fallback=None) -> Decimal:
    """Return a valid Decimal amount; never pass empty/invalid values into Fine.create."""
    for candidate in (raw, fallback, Decimal('10.00')):
        if candidate is None:
            continue
        text = str(candidate).strip()
        if not text:
            continue
        try:
            value = Decimal(text)
        except (InvalidOperation, TypeError, ValueError):
            continue
        if value < 0:
            continue
        return value.quantize(Decimal('0.01'))
    return Decimal('10.00')


class OfficerDetectionQueueView(APIView):
    """Pending violations awaiting officer review."""

    permission_classes = [IsAuthenticated, IsOfficerOnly]

    def get(self, request):
        from violations.match_utils import heal_pending_queue, match_status_for_violation

        # Auto-repair stale PP-* seed plates / missing vehicle FKs before listing.
        try:
            healed = heal_pending_queue(limit=100)
            if healed:
                logger.info('Detection queue healed %s pending vehicle links', healed)
        except Exception:
            logger.exception('Detection queue heal failed')

        qs = (
            TrafficViolation.objects.select_related('driver__user', 'vehicle', 'fine')
            .filter(status='pending_review')
            .order_by('-violation_date')[:100]
        )
        data = TrafficViolationSerializer(qs, many=True, context={'request': request}).data
        # Enrich with live registry match status for the officer UI.
        by_id = {str(v.id): v for v in qs}
        for row in data:
            violation = by_id.get(str(row.get('id')))
            meta = match_status_for_violation(violation) if violation else {
                'match_status': 'unmatched',
                'linked_vehicle_plate': '',
                'vehicle_linked': False,
            }
            row['match_status'] = meta.get('match_status')
            row['linked_vehicle_plate'] = meta.get('linked_vehicle_plate') or None
            row['vehicle_linked'] = bool(meta.get('vehicle_linked'))
        return success_response({'results': data, 'count': len(data)})


class OfficerApproveViolationView(APIView):
    """Approve pending violation — officer only (admins cannot approve)."""

    permission_classes = [IsAuthenticated, IsOfficerOnly]

    @transaction.atomic
    def post(self, request, pk):
        try:
            # Lock only traffic_violations — select_related vehicle/fine are nullable
            # LEFT JOINs; PostgreSQL rejects FOR UPDATE on the nullable side of an outer join.
            violation = (
                TrafficViolation.objects.select_for_update(of=('self',))
                .select_related('driver__user', 'vehicle', 'fine', 'officer')
                .get(pk=pk)
            )
        except TrafficViolation.DoesNotExist:
            return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)

        if violation.status == 'confirmed':
            return error_response('Violation already approved', status_code=status.HTTP_400_BAD_REQUEST)
        if violation.status == 'rejected':
            return error_response('Violation was rejected', status_code=status.HTTP_400_BAD_REQUEST)

        issue_fine = _truthy(request.data.get('issue_fine'), default=True)
        existing_fine = None
        try:
            existing_fine = violation.fine
        except Fine.DoesNotExist:
            existing_fine = None

        if issue_fine and existing_fine is None:
            if not violation.driver_id or not getattr(violation.driver, 'user_id', None):
                return error_response(
                    'Cannot issue fine: violation has no linked driver account',
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        # Ensure plate↔vehicle match before confirming (fixes stale PP-* / null vehicle).
        try:
            from violations.match_utils import heal_violation_vehicle_link

            heal_violation_vehicle_link(violation)
            violation.refresh_from_db()
        except Exception:
            logger.exception('Vehicle match heal failed on approve for %s', pk)

        old = {'status': violation.status}
        violation.status = 'confirmed'
        note = (request.data.get('officer_note') or '').strip()
        if note:
            violation.officer_note = note
        officer = _officer_profile(request.user)
        if officer:
            violation.officer = officer
        violation.save()

        # Apply Cambodia demerit points to driver license record
        from violations.services import normalize_token, sign_class_key_candidates

        rule = None
        action = normalize_token(violation.observed_action)
        for candidate in sign_class_key_candidates(violation.detected_class_key or violation.violation_type or ''):
            for cand in ViolationRule.objects.filter(is_active=True, sign_class_key__iexact=candidate):
                if normalize_token(cand.prohibited_action) == action:
                    rule = cand
                    break
            if rule:
                break
        if rule is None and violation.violation_type:
            rule = ViolationRule.objects.filter(
                is_active=True,
                violation_type__iexact=violation.violation_type,
            ).order_by('id').first()

        demerit = int(getattr(rule, 'demerit_points', 0) or 0) if rule else 0
        if demerit and violation.driver_id:
            driver = violation.driver
            driver.demerit_points = (driver.demerit_points or 0) + demerit
            # Soft suspension threshold (illustrative thesis policy)
            if driver.demerit_points >= 12 and driver.status == 'active':
                driver.status = 'suspended'
            driver.save(update_fields=['demerit_points', 'status', 'updated_at'])

        fine_data = None
        if issue_fine and existing_fine is None:
            rule_amount = getattr(rule, 'default_fine_amount', None) if rule else None
            amount = _parse_fine_amount(request.data.get('amount'), rule_amount)
            plate = (violation.plate_detected or '').strip()
            if not plate and violation.vehicle_id:
                plate = (getattr(violation.vehicle, 'plate_number', None) or '').strip()
            fine = Fine.objects.create(
                violation=violation,
                driver=violation.driver.user,
                police=request.user,
                amount=amount,
                reason=(violation.description or violation.violation_type or 'Traffic violation')[:2000],
                location=(violation.location or 'Unknown')[:255],
                vehicle_plate=plate[:20],
            )
            apply_issue_defaults(fine, violation)
            try:
                notify_driver_fine(violation.driver.user, fine)
            except Exception:
                logger.exception('notify_driver_fine failed for fine %s', fine.id)
            fine_data = FineSerializer(fine, context={'request': request}).data
        elif existing_fine is not None:
            fine_data = FineSerializer(existing_fine, context={'request': request}).data

        log_audit(
            user=request.user,
            action='update',
            resource='traffic_violation',
            resource_id=str(violation.id),
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
            # of=('self',) required on PostgreSQL with nullable FK joins elsewhere in this app.
            violation = TrafficViolation.objects.select_for_update(of=('self',)).get(pk=pk)
        except TrafficViolation.DoesNotExist:
            return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)

        reason = (request.data.get('reason') or request.data.get('dismissal_reason') or '').strip()
        if not reason:
            return error_response('dismissal_reason is required', status_code=status.HTTP_400_BAD_REQUEST)

        if violation.status == 'confirmed':
            return error_response('Violation already approved', status_code=status.HTTP_400_BAD_REQUEST)
        if violation.status == 'rejected':
            return error_response('Violation already rejected', status_code=status.HTTP_400_BAD_REQUEST)

        old = {'status': violation.status}
        violation.status = 'rejected'
        violation.dismissal_reason = reason
        violation.save(update_fields=['status', 'dismissal_reason', 'updated_at'])

        log_audit(
            user=request.user,
            action='update',
            resource='traffic_violation',
            resource_id=str(violation.id),
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
            if amount is None or str(amount).strip() == '':
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
            amount=_parse_fine_amount(amount, 25),
            reason=(reason or 'Traffic violation')[:2000],
            location=(location or 'Unknown')[:255],
            vehicle_plate=(vehicle_plate or '')[:20],
            evidence_image=data.get('evidence_image'),
            violation=violation,
        )
        apply_issue_defaults(fine, violation)
        try:
            notify_driver_fine(driver, fine)
        except Exception:
            logger.exception('notify_driver_fine failed for fine %s', fine.id)
        log_audit(
            user=request.user,
            action='create',
            resource='fine',
            resource_id=str(fine.id),
            request=request,
            new_value={'amount': str(fine.amount), 'driver_id': str(driver.id), 'via': 'officer_api'},
        )
        return success_response(
            FineSerializer(fine, context={'request': request}).data,
            message='Fine issued',
            status_code=status.HTTP_201_CREATED,
        )
