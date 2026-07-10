from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import error_response, success_response
from apps.rbac.permissions import HasRBACRole

from .models import Fine, FinePayment
from .serializers import (
    DriverFineDetailSerializer,
    DriverFineListSerializer,
    DriverFinePaymentDetailSerializer,
    DriverFinePaymentRecordSerializer,
    DriverFinePaymentResultSerializer,
    DriverFinePaymentSerializer,
)
from .services import pay_driver_fine


def driver_fine_queryset(user):
    return Fine.objects.filter(violation__driver=user).select_related(
        'violation',
        'violation__vehicle',
        'violation__traffic_sign',
        'violation__camera',
        'violation__camera__station',
    )


def filter_driver_fine_queryset(queryset, request):
    status_param = request.query_params.get('status', '').strip()
    if status_param:
        queryset = queryset.filter(status=status_param)

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(reference_number__icontains=search)
            | Q(violation__vehicle__plate_number__icontains=search)
            | Q(violation__traffic_sign__code__icontains=search)
            | Q(violation__traffic_sign__name_en__icontains=search),
        )

    return queryset


class DriverFineListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        queryset = driver_fine_queryset(request.user).order_by('-created_at')
        queryset = filter_driver_fine_queryset(queryset, request)

        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50

        queryset = queryset[:limit]
        serializer = DriverFineListSerializer(queryset, many=True)
        return success_response(serializer.data)


class DriverFineDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request, fine_id: int):
        fine = get_object_or_404(driver_fine_queryset(request.user), id=fine_id)
        serializer = DriverFineDetailSerializer(fine)
        return success_response(serializer.data)


class DriverFinePaymentView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def post(self, request, fine_id: int):
        fine = get_object_or_404(driver_fine_queryset(request.user), id=fine_id)
        serializer = DriverFinePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payment = pay_driver_fine(
                fine,
                serializer.validated_data['method'],
                serializer.validated_data.get('transaction_id', ''),
            )
        except ValueError as exc:
            return error_response(str(exc), status=status.HTTP_400_BAD_REQUEST)

        fine = get_object_or_404(driver_fine_queryset(request.user), id=fine_id)
        payload = {
            'fine': DriverFineDetailSerializer(fine).data,
            'payment_id': payment.id,
            'message': 'Fine paid successfully.',
        }
        result = DriverFinePaymentResultSerializer(payload)
        return success_response(result.data, message='Fine paid successfully.')


def driver_payment_queryset(user):
    return FinePayment.objects.filter(fine__violation__driver=user).select_related(
        'fine',
        'fine__violation',
        'fine__violation__vehicle',
        'fine__violation__traffic_sign',
        'fine__violation__camera',
        'fine__violation__camera__station',
    )


def filter_driver_payment_queryset(queryset, request):
    method = request.query_params.get('method', '').strip()
    if method:
        queryset = queryset.filter(method=method)

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(fine__reference_number__icontains=search)
            | Q(transaction_id__icontains=search)
            | Q(fine__violation__vehicle__plate_number__icontains=search)
            | Q(fine__violation__traffic_sign__code__icontains=search),
        )

    return queryset


class DriverFinePaymentListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        queryset = driver_payment_queryset(request.user).order_by('-paid_at')
        queryset = filter_driver_payment_queryset(queryset, request)

        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50

        queryset = queryset[:limit]
        serializer = DriverFinePaymentRecordSerializer(queryset, many=True)
        return success_response(serializer.data)


class DriverFinePaymentDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request, payment_id: int):
        payment = get_object_or_404(driver_payment_queryset(request.user), id=payment_id)
        serializer = DriverFinePaymentDetailSerializer(payment)
        return success_response(serializer.data)
