from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import error_response, success_response
from apps.rbac.permissions import HasRBACRole

from .models import Officer, PoliceStation
from .serializers import (
    OfficerCreateSerializer,
    OfficerManageSerializer,
    OfficerProfileSerializer,
    OfficerProfileUpdateSerializer,
    OfficerUpdateSerializer,
    PoliceStationCreateSerializer,
    PoliceStationManageSerializer,
    PoliceStationOptionSerializer,
    PoliceStationUpdateSerializer,
)


class PoliceStationCatalogView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        stations = PoliceStation.objects.filter(is_active=True).order_by('name')
        return success_response(PoliceStationOptionSerializer(stations, many=True).data)


class PoliceStationListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = PoliceStation.objects.order_by('name')
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(province__icontains=search)
                | Q(district__icontains=search),
            )
        province = request.query_params.get('province', '').strip()
        if province:
            queryset = queryset.filter(province__iexact=province)
        return success_response(PoliceStationManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = PoliceStationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        station = serializer.save()
        return success_response(
            PoliceStationManageSerializer(station).data,
            message='Police station created successfully.',
            status=status.HTTP_201_CREATED,
        )


class PoliceStationDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_station(station_id: int) -> PoliceStation:
        return get_object_or_404(PoliceStation, id=station_id)

    def get(self, request, station_id: int):
        station = self._get_station(station_id)
        return success_response(PoliceStationManageSerializer(station).data)

    def patch(self, request, station_id: int):
        station = self._get_station(station_id)
        serializer = PoliceStationUpdateSerializer(station, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, message='Police station updated successfully.')

    def delete(self, request, station_id: int):
        station = self._get_station(station_id)
        if station.officers.exists():
            return error_response(
                'Cannot delete a station with assigned officers. Deactivate it instead.',
                status=status.HTTP_400_BAD_REQUEST,
            )
        station.delete()
        return success_response(None, message='Police station deleted successfully.')


class OfficerListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = Officer.objects.select_related('user', 'station').order_by('badge_number')
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(badge_number__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search),
            )
        station_id = request.query_params.get('station_id', '').strip()
        if station_id:
            queryset = queryset.filter(station_id=station_id)
        return success_response(OfficerManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = OfficerCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        officer = serializer.save()
        return success_response(
            OfficerManageSerializer(officer).data,
            message='Officer created successfully.',
            status=status.HTTP_201_CREATED,
        )


class OfficerDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_officer(officer_id: int) -> Officer:
        return get_object_or_404(Officer.objects.select_related('user', 'station'), id=officer_id)

    def get(self, request, officer_id: int):
        officer = self._get_officer(officer_id)
        return success_response(OfficerManageSerializer(officer).data)

    def patch(self, request, officer_id: int):
        officer = self._get_officer(officer_id)
        serializer = OfficerUpdateSerializer(
            data=request.data,
            partial=True,
            context={'officer': officer},
        )
        serializer.is_valid(raise_exception=True)
        serializer.update(officer, serializer.validated_data)
        officer.refresh_from_db()
        return success_response(OfficerManageSerializer(officer).data, message='Officer updated successfully.')

    def delete(self, request, officer_id: int):
        officer = self._get_officer(officer_id)
        if officer.user_id == request.user.id:
            return error_response(
                'You cannot delete your own officer account.',
                status=status.HTTP_400_BAD_REQUEST,
            )
        officer.user.delete()
        return success_response(None, message='Officer deleted successfully.')


class OfficerProfileView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def _get_officer(self, user) -> Officer:
        return get_object_or_404(Officer.objects.select_related('station'), user=user)

    def get(self, request):
        officer = self._get_officer(request.user)
        serializer = OfficerProfileSerializer(officer)
        return success_response(serializer.data)

    def patch(self, request):
        officer = self._get_officer(request.user)
        serializer = OfficerProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(officer, serializer.validated_data)
        officer = self._get_officer(request.user)
        return success_response(
            OfficerProfileSerializer(officer).data,
            message='Officer profile updated successfully.',
        )
