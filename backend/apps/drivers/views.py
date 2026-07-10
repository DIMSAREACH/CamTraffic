from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import success_response
from apps.dashboard.officer_services import get_officer_profile
from apps.rbac.permissions import HasRBACRole

from .models import Driver
from .serializers import (
    DriverProfileSerializer,
    DriverProfileUpdateSerializer,
    DriverSettingsSerializer,
    DriverSettingsUpdateSerializer,
    OfficerDriverCreateSerializer,
    OfficerDriverManageDetailSerializer,
    OfficerDriverManageSerializer,
    OfficerDriverUpdateSerializer,
    annotate_officer_driver_queryset,
)


def filter_officer_driver_queryset(queryset, request):
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(license_number__icontains=search)
            | Q(national_id__icontains=search)
            | Q(user__email__icontains=search)
            | Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search),
        )

    active = request.query_params.get('is_active', '').strip().lower()
    if active in ('true', 'false'):
        queryset = queryset.filter(is_active=(active == 'true'))

    return queryset


def officer_driver_queryset(officer):
    queryset = Driver.objects.select_related('user').order_by('license_number')
    return annotate_officer_driver_queryset(queryset, officer.station_id)


class OfficerDriverListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        queryset = filter_officer_driver_queryset(officer_driver_queryset(officer), request)
        serializer = OfficerDriverManageSerializer(queryset, many=True)
        return success_response(serializer.data)

    def post(self, request):
        get_officer_profile(request.user)
        serializer = OfficerDriverCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver = serializer.save()
        officer = get_officer_profile(request.user)
        driver = get_object_or_404(officer_driver_queryset(officer), id=driver.id)
        return success_response(
            OfficerDriverManageSerializer(driver).data,
            message='Driver created successfully.',
            status=status.HTTP_201_CREATED,
        )


class OfficerDriverDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def _get_driver(self, request, driver_id: int) -> Driver:
        officer = get_officer_profile(request.user)
        return get_object_or_404(officer_driver_queryset(officer), id=driver_id)

    def get(self, request, driver_id: int):
        driver = self._get_driver(request, driver_id)
        serializer = OfficerDriverManageDetailSerializer(driver)
        return success_response(serializer.data)

    def patch(self, request, driver_id: int):
        driver = self._get_driver(request, driver_id)
        serializer = OfficerDriverUpdateSerializer(
            data=request.data,
            partial=True,
            context={'driver': driver},
        )
        serializer.is_valid(raise_exception=True)
        serializer.update(driver, serializer.validated_data)
        driver = self._get_driver(request, driver_id)
        return success_response(
            OfficerDriverManageSerializer(driver).data,
            message='Driver updated successfully.',
        )

    def delete(self, request, driver_id: int):
        driver = self._get_driver(request, driver_id)
        if driver.user_id == request.user.id:
            return success_response(None, message='You cannot delete your own account.')
        driver.user.delete()
        return success_response(None, message='Driver deleted successfully.')


class DriverProfileView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def _get_driver(self, user) -> Driver:
        return get_object_or_404(Driver.objects.select_related('user'), user=user)

    def get(self, request):
        driver = self._get_driver(request.user)
        serializer = DriverProfileSerializer(driver)
        return success_response(serializer.data)

    def patch(self, request):
        driver = self._get_driver(request.user)
        serializer = DriverProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(driver, serializer.validated_data)
        driver = self._get_driver(request.user)
        return success_response(
            DriverProfileSerializer(driver).data,
            message='Driver profile updated successfully.',
        )


class DriverSettingsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def _get_driver(self, user) -> Driver:
        return get_object_or_404(Driver.objects.select_related('user'), user=user)

    def get(self, request):
        driver = self._get_driver(request.user)
        serializer = DriverSettingsSerializer(driver)
        return success_response(serializer.data)

    def patch(self, request):
        driver = self._get_driver(request.user)
        serializer = DriverSettingsUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(driver, serializer.validated_data)
        driver = self._get_driver(request.user)
        return success_response(
            DriverSettingsSerializer(driver).data,
            message='Driver settings updated successfully.',
        )
