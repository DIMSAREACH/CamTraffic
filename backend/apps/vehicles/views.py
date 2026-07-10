from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import success_response
from apps.dashboard.officer_services import get_officer_profile
from apps.rbac.permissions import HasRBACRole

from .models import Vehicle
from .serializers import (
    DriverVehicleDetailSerializer,
    DriverVehicleRecordSerializer,
    annotate_driver_vehicle_queryset,
    OfficerVehicleCreateSerializer,
    OfficerVehicleManageDetailSerializer,
    OfficerVehicleManageSerializer,
    OfficerVehicleUpdateSerializer,
    annotate_officer_vehicle_queryset,
)


def filter_officer_vehicle_queryset(queryset, request):
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(plate_number__icontains=search)
            | Q(make__icontains=search)
            | Q(model__icontains=search)
            | Q(color__icontains=search)
            | Q(owner__email__icontains=search)
            | Q(owner__first_name__icontains=search)
            | Q(owner__last_name__icontains=search)
            | Q(owner__driver_profile__license_number__icontains=search),
        )

    active = request.query_params.get('is_active', '').strip().lower()
    if active in ('true', 'false'):
        queryset = queryset.filter(is_active=(active == 'true'))

    owner_id = request.query_params.get('owner_id', '').strip()
    if owner_id:
        queryset = queryset.filter(owner_id=owner_id)

    return queryset


def officer_vehicle_queryset(officer):
    queryset = Vehicle.objects.select_related('owner', 'owner__driver_profile').order_by('plate_number')
    return annotate_officer_vehicle_queryset(queryset, officer.station_id)


class OfficerVehicleListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        queryset = filter_officer_vehicle_queryset(officer_vehicle_queryset(officer), request)
        serializer = OfficerVehicleManageSerializer(queryset, many=True)
        return success_response(serializer.data)

    def post(self, request):
        officer = get_officer_profile(request.user)
        serializer = OfficerVehicleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()
        vehicle = get_object_or_404(officer_vehicle_queryset(officer), id=vehicle.id)
        return success_response(
            OfficerVehicleManageSerializer(vehicle).data,
            message='Vehicle registered successfully.',
            status=status.HTTP_201_CREATED,
        )


class OfficerVehicleDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def _get_vehicle(self, request, vehicle_id: int) -> Vehicle:
        officer = get_officer_profile(request.user)
        return get_object_or_404(officer_vehicle_queryset(officer), id=vehicle_id)

    def get(self, request, vehicle_id: int):
        officer = get_officer_profile(request.user)
        vehicle = self._get_vehicle(request, vehicle_id)
        serializer = OfficerVehicleManageDetailSerializer(vehicle, context={'officer': officer})
        return success_response(serializer.data)

    def patch(self, request, vehicle_id: int):
        vehicle = self._get_vehicle(request, vehicle_id)
        serializer = OfficerVehicleUpdateSerializer(
            data=request.data,
            partial=True,
            context={'vehicle': vehicle},
        )
        serializer.is_valid(raise_exception=True)
        serializer.update(vehicle, serializer.validated_data)
        vehicle = self._get_vehicle(request, vehicle_id)
        return success_response(
            OfficerVehicleManageSerializer(vehicle).data,
            message='Vehicle updated successfully.',
        )

    def delete(self, request, vehicle_id: int):
        vehicle = self._get_vehicle(request, vehicle_id)
        vehicle.delete()
        return success_response(None, message='Vehicle deleted successfully.')


def driver_vehicle_queryset(user):
    return annotate_driver_vehicle_queryset(Vehicle.objects.filter(owner=user).order_by('plate_number'))


def filter_driver_vehicle_queryset(queryset, request):
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(plate_number__icontains=search)
            | Q(make__icontains=search)
            | Q(model__icontains=search)
            | Q(color__icontains=search),
        )

    active = request.query_params.get('is_active', '').strip().lower()
    if active in ('true', 'false'):
        queryset = queryset.filter(is_active=(active == 'true'))

    return queryset


class DriverVehicleListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        queryset = filter_driver_vehicle_queryset(driver_vehicle_queryset(request.user), request)
        serializer = DriverVehicleRecordSerializer(queryset, many=True)
        return success_response(serializer.data)


class DriverVehicleDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request, vehicle_id: int):
        vehicle = get_object_or_404(driver_vehicle_queryset(request.user), id=vehicle_id)
        serializer = DriverVehicleDetailSerializer(vehicle)
        return success_response(serializer.data)
