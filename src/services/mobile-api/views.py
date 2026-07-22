"""Mobile API views — thin, role-scoped wrappers over domain models."""

from __future__ import annotations

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from appeals.models import ViolationAppeal
from core.audit_service import log_audit
from core.permissions import IsDriver, IsPolice, IsPoliceOrAdmin
from core.responses import error_response, success_response
from fines.models import Fine
from notifications.models import Notification
from users.models import Driver, Officer
from vehicles.models import Vehicle
from violations.models import TrafficViolation

from .serializers import (
    MobileAppealCreateSerializer,
    MobileAppealSerializer,
    MobileApproveSerializer,
    MobileDeviceTokenSerializer,
    MobileFineSerializer,
    MobileNotificationSerializer,
    MobileRejectSerializer,
    MobileVehicleSerializer,
    MobileViolationSerializer,
)


def _driver_or_error(user):
    try:
        return user.driver_profile, None
    except Driver.DoesNotExist:
        return None, error_response('Driver profile not found', status_code=status.HTTP_400_BAD_REQUEST)


def _officer_or_error(user):
    try:
        return user.officer_profile, None
    except Officer.DoesNotExist:
        return None, error_response('Officer profile not found', status_code=status.HTTP_400_BAD_REQUEST)


class MobileHomeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        payload = {
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'phone': user.phone,
            },
            'counts': {},
        }
        if user.role == 'driver':
            driver, err = _driver_or_error(user)
            if err:
                return err
            payload['counts'] = {
                'vehicles': Vehicle.objects.filter(driver=driver).count(),
                'violations': TrafficViolation.objects.filter(driver=driver).count(),
                'unpaid_fines': Fine.objects.filter(driver=user, status='pending').count(),
                'unread_notifications': Notification.objects.filter(user=user, is_read=False).count(),
            }
        elif user.role in ('police', 'admin'):
            payload['counts'] = {
                'pending_reviews': TrafficViolation.objects.filter(status='pending_review').count(),
                'assigned_cases': TrafficViolation.objects.filter(
                    officer__user=user,
                    status__in=['pending_review', 'confirmed'],
                ).count()
                if user.role == 'police'
                else TrafficViolation.objects.filter(status='pending_review').count(),
            }
        return success_response(payload)


class MobileMyVehiclesView(APIView):
    permission_classes = [IsAuthenticated, IsDriver]

    def get(self, request):
        driver, err = _driver_or_error(request.user)
        if err:
            return err
        qs = Vehicle.objects.filter(driver=driver).order_by('-created_at')
        return success_response(MobileVehicleSerializer(qs, many=True).data)


class MobileMyViolationsView(APIView):
    permission_classes = [IsAuthenticated, IsDriver]

    def get(self, request):
        driver, err = _driver_or_error(request.user)
        if err:
            return err
        qs = TrafficViolation.objects.filter(driver=driver).order_by('-violation_date')[:100]
        return success_response(
            MobileViolationSerializer(qs, many=True, context={'request': request}).data
        )


class MobileMyFinesView(APIView):
    permission_classes = [IsAuthenticated, IsDriver]

    def get(self, request):
        qs = Fine.objects.filter(driver=request.user).order_by('-created_at')[:100]
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return success_response(MobileFineSerializer(qs, many=True).data)


class MobileMyAppealsView(APIView):
    permission_classes = [IsAuthenticated, IsDriver]

    def get(self, request):
        driver, err = _driver_or_error(request.user)
        if err:
            return err
        qs = ViolationAppeal.objects.filter(driver=driver).order_by('-submitted_at')
        return success_response(MobileAppealSerializer(qs, many=True).data)

    def post(self, request):
        """Business rule: one pending appeal per violation."""
        driver, err = _driver_or_error(request.user)
        if err:
            return err
        ser = MobileAppealCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        try:
            violation = TrafficViolation.objects.get(pk=data['violation_id'], driver=driver)
        except TrafficViolation.DoesNotExist:
            return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)

        if ViolationAppeal.objects.filter(violation=violation).exists():
            return error_response(
                'A driver can submit only one appeal per violation',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        fine = getattr(violation, 'fine', None)
        appeal = ViolationAppeal.objects.create(
            violation=violation,
            fine=fine,
            driver=driver,
            reason=data['reason'],
        )
        if fine and fine.status == 'pending':
            fine.status = 'disputed'
            fine.save(update_fields=['status'])

        log_audit(
            user=request.user,
            action='create',
            resource='violation_appeal',
            resource_id=appeal.id,
            request=request,
            new_value={'violation_id': str(violation.id), 'via': 'mobile_api'},
        )
        return success_response(
            MobileAppealSerializer(appeal).data,
            message='Appeal submitted',
            status_code=status.HTTP_201_CREATED,
        )


class MobileNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user).order_by('-created_at')[:50]
        return success_response(MobileNotificationSerializer(qs, many=True).data)

    def post(self, request):
        """Mark all as read."""
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return success_response({'marked_read': updated})


class MobileDeviceTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = MobileDeviceTokenSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        # Persist via preferences/extra if available; store in audit for now
        log_audit(
            user=request.user,
            action='update',
            resource='device_token',
            resource_id=request.user.id,
            request=request,
            new_value=ser.validated_data,
        )
        return success_response(ser.validated_data, message='Device token registered')


class MobilePendingCasesView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        qs = TrafficViolation.objects.filter(status='pending_review').order_by('-violation_date')[:100]
        if request.user.role == 'police':
            officer, _ = _officer_or_error(request.user)
            if officer:
                qs = (
                    TrafficViolation.objects.filter(status='pending_review')
                    .filter(Q(officer=officer) | Q(officer__isnull=True))
                    .order_by('-violation_date')[:100]
                )
        return success_response(
            MobileViolationSerializer(qs, many=True, context={'request': request}).data
        )


class MobileApproveViolationView(APIView):
    permission_classes = [IsAuthenticated, IsPolice]

    @transaction.atomic
    def post(self, request, pk):
        ser = MobileApproveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            violation = TrafficViolation.objects.select_for_update().get(pk=pk)
        except TrafficViolation.DoesNotExist:
            return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)

        if violation.status == 'confirmed':
            return error_response('Violation already approved', status_code=status.HTTP_400_BAD_REQUEST)
        if violation.status == 'rejected':
            return error_response('Violation was rejected', status_code=status.HTTP_400_BAD_REQUEST)

        old = {'status': violation.status}
        violation.status = 'confirmed'
        note = ser.validated_data.get('officer_note') or ''
        if note:
            violation.officer_note = note
        if request.user.role == 'police':
            officer, err = _officer_or_error(request.user)
            if err:
                return err
            violation.officer = officer
        violation.save()

        # Issue fine only after officer approval (business rule)
        fine = getattr(violation, 'fine', None)
        if fine is None:
            Fine.objects.create(
                violation=violation,
                driver=violation.driver.user,
                police=request.user,
                amount=25,
                reason=violation.violation_type or 'Traffic violation',
                location=violation.location or 'Unknown',
                vehicle_plate=violation.plate_detected or '',
                status='pending',
            )

        log_audit(
            user=request.user,
            action='update',
            resource='traffic_violation',
            resource_id=violation.id,
            request=request,
            old_value=old,
            new_value={'status': 'confirmed', 'via': 'mobile_api'},
        )
        return success_response(
            MobileViolationSerializer(violation, context={'request': request}).data,
            message='Violation approved; fine issued',
        )


class MobileRejectViolationView(APIView):
    permission_classes = [IsAuthenticated, IsPolice]

    @transaction.atomic
    def post(self, request, pk):
        ser = MobileRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            violation = TrafficViolation.objects.select_for_update().get(pk=pk)
        except TrafficViolation.DoesNotExist:
            return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)

        old = {'status': violation.status}
        violation.status = 'rejected'
        violation.dismissal_reason = ser.validated_data['dismissal_reason']
        violation.save(update_fields=['status', 'dismissal_reason', 'updated_at'])

        log_audit(
            user=request.user,
            action='update',
            resource='traffic_violation',
            resource_id=violation.id,
            request=request,
            old_value=old,
            new_value={'status': 'rejected', 'via': 'mobile_api'},
        )
        return success_response(
            MobileViolationSerializer(violation, context={'request': request}).data,
            message='Violation rejected',
        )


class MobileEvidenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            violation = TrafficViolation.objects.get(pk=pk)
        except TrafficViolation.DoesNotExist:
            return error_response('Violation not found', status_code=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == 'driver':
            driver, err = _driver_or_error(user)
            if err:
                return err
            if violation.driver_id != driver.id:
                return error_response('Forbidden', status_code=status.HTTP_403_FORBIDDEN)

        def url(field):
            if not field:
                return None
            try:
                return request.build_absolute_uri(field.url)
            except Exception:
                return None

        return success_response(
            {
                'id': str(violation.id),
                'evidence_image': url(violation.evidence_image),
                'vehicle_evidence_image': url(violation.vehicle_evidence_image),
                'plate_evidence_image': url(violation.plate_evidence_image),
                'bbox_coords': violation.bbox_coords,
                'ai_confidence_score': violation.ai_confidence_score,
                'violation_date': violation.violation_date,
            }
        )
