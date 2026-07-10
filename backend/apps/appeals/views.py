from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import error_response, success_response
from apps.dashboard.officer_services import get_officer_profile
from apps.rbac.permissions import HasRBACRole

from .models import Appeal
from .serializers import (
    DriverAppealCreateSerializer,
    DriverAppealDetailSerializer,
    DriverAppealListSerializer,
    DriverAppealableViolationSerializer,
    OfficerAppealDecisionSerializer,
    OfficerAppealDetailSerializer,
    OfficerAppealListSerializer,
)
from .services import decide_officer_appeal, driver_appealable_violations, officer_station_appeals, submit_driver_appeal


def driver_appeal_queryset(user):
    return Appeal.objects.filter(driver=user).select_related(
        'violation',
        'violation__vehicle',
        'violation__traffic_sign',
        'violation__camera',
        'violation__camera__station',
    )


def filter_driver_appeal_queryset(queryset, request):
    status_param = request.query_params.get('status', '').strip()
    if status_param:
        queryset = queryset.filter(status=status_param)

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(reason__icontains=search)
            | Q(violation__vehicle__plate_number__icontains=search)
            | Q(violation__traffic_sign__code__icontains=search)
            | Q(violation__traffic_sign__name_en__icontains=search),
        )

    return queryset


class DriverAppealableViolationListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        queryset = driver_appealable_violations(request.user)
        serializer = DriverAppealableViolationSerializer(queryset, many=True)
        return success_response(serializer.data)


class DriverAppealListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        queryset = driver_appeal_queryset(request.user).order_by('-created_at')
        queryset = filter_driver_appeal_queryset(queryset, request)

        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50

        queryset = queryset[:limit]
        serializer = DriverAppealListSerializer(queryset, many=True)
        return success_response(serializer.data)

    def post(self, request):
        serializer = DriverAppealCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            appeal = submit_driver_appeal(
                request.user,
                serializer.validated_data['violation_id'],
                serializer.validated_data['reason'],
                serializer.validated_data.get('evidence'),
            )
        except ValueError as exc:
            return error_response(str(exc), status=status.HTTP_400_BAD_REQUEST)

        appeal = get_object_or_404(driver_appeal_queryset(request.user), id=appeal.id)
        return success_response(
            DriverAppealDetailSerializer(appeal, context={'request': request}).data,
            message='Appeal submitted successfully.',
            status=status.HTTP_201_CREATED,
        )


class DriverAppealDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request, appeal_id: int):
        appeal = get_object_or_404(driver_appeal_queryset(request.user), id=appeal_id)
        serializer = DriverAppealDetailSerializer(appeal, context={'request': request})
        return success_response(serializer.data)


def filter_officer_appeal_queryset(queryset, request):
    status_param = request.query_params.get('status', '').strip()
    if status_param:
        queryset = queryset.filter(status=status_param)

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(reason__icontains=search)
            | Q(driver__email__icontains=search)
            | Q(violation__vehicle__plate_number__icontains=search)
            | Q(violation__traffic_sign__code__icontains=search),
        )

    return queryset


class OfficerAppealListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        queryset = officer_station_appeals(officer).order_by('-created_at')
        queryset = filter_officer_appeal_queryset(queryset, request)

        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50

        serializer = OfficerAppealListSerializer(queryset[:limit], many=True)
        return success_response(serializer.data)


class OfficerAppealDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request, appeal_id: int):
        officer = get_officer_profile(request.user)
        appeal = get_object_or_404(officer_station_appeals(officer), id=appeal_id)
        serializer = OfficerAppealDetailSerializer(appeal, context={'request': request})
        return success_response(serializer.data)


class OfficerAppealDecisionView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def post(self, request, appeal_id: int):
        officer = get_officer_profile(request.user)
        serializer = OfficerAppealDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            appeal = decide_officer_appeal(
                officer,
                appeal_id,
                serializer.validated_data['decision'],
                serializer.validated_data['response'],
            )
        except ValueError as exc:
            return error_response(str(exc), status=status.HTTP_400_BAD_REQUEST)

        appeal = get_object_or_404(officer_station_appeals(officer), id=appeal.id)
        return success_response(
            OfficerAppealDetailSerializer(appeal, context={'request': request}).data,
            message='Appeal decision recorded successfully.',
        )
