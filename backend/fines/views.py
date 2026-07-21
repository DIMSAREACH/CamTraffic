from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.audit_service import log_audit
from core.permissions import IsAdmin, IsPoliceOrAdmin
from core.responses import error_response, success_response
from vehicles.models import Vehicle
from vehicles.serializers import VehicleSerializer
from violations.models import TrafficViolation, ViolationRule

from .models import Fine
from .payment_config import payment_config_payload, stripe_enabled, khqr_enabled
from .khqr_gateway import create_khqr_session
from .serializers import FineCreateSerializer, FinePaymentSerializer, FineSerializer
from .services import notify_driver_fine

try:
    from . import stripe_gateway
except ImportError:
    stripe_gateway = None

User = get_user_model()


class FineListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'driver', 'police']
    search_fields = ['reason', 'location', 'vehicle_plate', 'driver__full_name', 'driver__license_no']
    ordering_fields = ['created_at', 'amount']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return FineCreateSerializer
        return FineSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Fine.objects.select_related('driver', 'police')
        if user.role == 'admin':
            return qs
        if user.role == 'police':
            return qs.filter(police=user)
        return qs.filter(driver=user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = FineSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)

    def create(self, request, *args, **kwargs):
        if request.user.role not in ('police', 'admin'):
            return error_response('Only police can issue fines', status_code=status.HTTP_403_FORBIDDEN)
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
                reason = violation.description or violation.violation_type.replace('_', ' ').title()
            if not location:
                location = violation.location or 'Unknown'
            if not vehicle_plate:
                vehicle_plate = violation.vehicle_plate or (
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
            new_value={'amount': str(fine.amount), 'driver_id': str(driver.id)},
        )
        return success_response(
            FineSerializer(fine, context={'request': request}).data,
            message='Fine issued',
            status_code=status.HTTP_201_CREATED,
        )


class FineDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FineSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Fine.objects.select_related('driver', 'police')
        if user.role == 'admin':
            return qs
        if user.role == 'police':
            return qs.filter(police=user)
        return qs.filter(driver=user)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if user.role not in ('police', 'admin'):
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)

        editable = instance.status in ('pending', 'overdue', 'disputed')
        new_status = request.data.get('status')
        if new_status:
            instance.status = new_status
            if new_status == 'paid':
                instance.paid_at = timezone.now()
            elif new_status in ('pending', 'overdue', 'disputed'):
                instance.paid_at = None

        if editable:
            if 'amount' in request.data:
                instance.amount = request.data['amount']
            if 'reason' in request.data:
                instance.reason = str(request.data['reason'] or '').strip()
            if 'location' in request.data:
                instance.location = str(request.data['location'] or '').strip()
            if 'vehicle_plate' in request.data:
                instance.vehicle_plate = str(request.data['vehicle_plate'] or '').strip()

        instance.save()
        log_audit(
            user=user,
            action='update',
            resource='fine',
            resource_id=instance.id,
            request=request,
            new_value={'status': instance.status},
        )
        return success_response(
            FineSerializer(instance, context={'request': request}).data,
            message='Fine updated',
        )

    def delete(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return error_response('Only admin can delete fines', status_code=status.HTTP_403_FORBIDDEN)
        instance = self.get_object()
        if instance.status == 'paid':
            return error_response('Cannot delete a paid fine', status_code=status.HTTP_400_BAD_REQUEST)
        fine_id = instance.id
        instance.delete()
        log_audit(
            user=request.user,
            action='delete',
            resource='fine',
            resource_id=fine_id,
            request=request,
        )
        return success_response(None, message='Fine deleted')


class FinePaymentView(APIView):
    """Driver submits payment proof (manual bank transfer) or confirms KHQR reference."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            fine = Fine.objects.select_related('driver').get(pk=pk)
        except Fine.DoesNotExist:
            return error_response('Fine not found', status_code=status.HTTP_404_NOT_FOUND)

        if request.user.role != 'driver' or fine.driver_id != request.user.id:
            return error_response('Only the fined driver can submit payment', status_code=status.HTTP_403_FORBIDDEN)

        if fine.status not in ('pending', 'overdue', 'disputed'):
            return error_response('This fine cannot be paid in its current status')

        serializer = FinePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        fine.payment_method = data['payment_method']
        fine.payment_reference = data['payment_reference']
        if data.get('payment_screenshot'):
            fine.payment_screenshot = data['payment_screenshot']
        fine.status = 'paid'
        fine.paid_at = timezone.now()
        fine.save()

        log_audit(
            user=request.user,
            action='update',
            resource='fine_payment',
            resource_id=fine.id,
            request=request,
            new_value={
                'payment_method': fine.payment_method,
                'payment_reference': fine.payment_reference,
                'status': fine.status,
            },
        )

        return success_response(
            FineSerializer(fine, context={'request': request}).data,
            message='Payment submitted successfully',
        )


class PaymentConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success_response(payment_config_payload())


class FineStripeCheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not stripe_enabled() or stripe_gateway is None:
            return error_response('Stripe payments are not configured', status_code=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            fine = Fine.objects.select_related('driver').get(pk=pk)
        except Fine.DoesNotExist:
            return error_response('Fine not found', status_code=status.HTTP_404_NOT_FOUND)
        if request.user.role != 'driver' or fine.driver_id != request.user.id:
            return error_response('Only the fined driver can pay this fine', status_code=status.HTTP_403_FORBIDDEN)
        if fine.status not in ('pending', 'overdue', 'disputed'):
            return error_response('This fine cannot be paid in its current status')

        success_url = request.data.get('success_url') or getattr(
            settings, 'STRIPE_SUCCESS_URL', 'http://localhost:5173/fines?paid=1',
        )
        cancel_url = request.data.get('cancel_url') or getattr(
            settings, 'STRIPE_CANCEL_URL', 'http://localhost:5173/fines?cancel=1',
        )
        try:
            session = stripe_gateway.create_checkout_session(
                fine=fine,
                success_url=success_url,
                cancel_url=cancel_url,
            )
        except Exception as exc:
            return error_response(f'Payment session failed: {exc}', status_code=status.HTTP_502_BAD_GATEWAY)
        return success_response(session, message='Checkout session created')


class FineKhqrSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not khqr_enabled():
            return error_response('KHQR payments are not configured', status_code=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            fine = Fine.objects.select_related('driver').get(pk=pk)
        except Fine.DoesNotExist:
            return error_response('Fine not found', status_code=status.HTTP_404_NOT_FOUND)
        if request.user.role != 'driver' or fine.driver_id != request.user.id:
            return error_response('Only the fined driver can pay this fine', status_code=status.HTTP_403_FORBIDDEN)
        if fine.status not in ('pending', 'overdue', 'disputed'):
            return error_response('This fine cannot be paid in its current status')
        return success_response(create_khqr_session(fine=fine), message='Payment reference issued')


class StripeWebhookView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        if not stripe_enabled() or stripe_gateway is None:
            return error_response('Stripe not configured', status_code=status.HTTP_503_SERVICE_UNAVAILABLE)

        sig = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        event = stripe_gateway.verify_webhook(request.body, sig)
        if not event:
            return error_response('Invalid webhook', status_code=status.HTTP_400_BAD_REQUEST)

        if event.get('type') == 'checkout.session.completed':
            session = event.get('data', {}).get('object', {})
            fine_id = session.get('metadata', {}).get('fine_id') or session.get('client_reference_id')
            if fine_id:
                try:
                    fine = Fine.objects.get(pk=fine_id)
                    if fine.status in ('pending', 'overdue', 'disputed'):
                        fine.status = 'paid'
                        fine.paid_at = timezone.now()
                        fine.payment_method = 'stripe'
                        fine.payment_reference = session.get('payment_intent') or session.get('id', '')
                        fine.save()
                except Fine.DoesNotExist:
                    pass
        return success_response({'received': True})


class DriverLookupView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        license_no = request.query_params.get('license', '').strip()
        if not license_no:
            return error_response('License number required')
        driver = User.objects.filter(role='driver', license_no__icontains=license_no, is_active=True).first()
        if not driver:
            return success_response(
                {'driver': None, 'driver_profile_id': None, 'fines': [], 'vehicles': []},
                message='No driver found',
            )
        from users.models import Driver
        from users.serializers import UserSerializer

        driver_profile = Driver.objects.filter(user=driver).first()
        fines = Fine.objects.filter(driver=driver)
        vehicles = Vehicle.objects.filter(owner=driver)
        return success_response({
            'driver': UserSerializer(driver).data,
            'driver_profile_id': driver_profile.id if driver_profile else None,
            'fines': FineSerializer(fines, many=True, context={'request': request}).data,
            'vehicles': VehicleSerializer(vehicles, many=True).data,
        })


class FinePDFExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            fine = Fine.objects.select_related('driver', 'police').get(pk=pk)
        except Fine.DoesNotExist:
            return error_response('Fine not found', status_code=status.HTTP_404_NOT_FOUND)
        user = request.user
        if user.role == 'driver' and fine.driver_id != user.id:
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        if user.role == 'police' and fine.police_id != user.id:
            return error_response('Permission denied', status_code=status.HTTP_403_FORBIDDEN)
        from io import BytesIO

        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        p.setFont('Helvetica-Bold', 16)
        p.drawString(50, 800, 'CamTraffic - Digital Fine Receipt')
        p.setFont('Helvetica', 11)
        y = 760
        lines = [
            f'Fine ID: {fine.id}',
            f'Driver: {fine.driver.full_name}',
            f'License: {fine.driver.license_no or "N/A"}',
            f'Police: {fine.police.full_name if fine.police else "N/A"}',
            f'Amount: ${fine.amount} USD',
            f'Status: {fine.status}',
            f'Reason: {fine.reason}',
            f'Location: {fine.location}',
            f'Vehicle: {fine.vehicle_plate}',
            f'Date: {fine.created_at.strftime("%Y-%m-%d %H:%M")}',
        ]
        for line in lines:
            p.drawString(50, y, line)
            y -= 22
        p.showPage()
        p.save()
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="fine_{fine.id}.pdf"'
        return response
