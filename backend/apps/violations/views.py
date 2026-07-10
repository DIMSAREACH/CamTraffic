from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import error_response, success_response
from apps.dashboard.officer_services import get_officer_profile, station_violations
from apps.rbac.permissions import HasRBACRole

from .models import Violation
from .serializers import (
    DriverViolationDetailSerializer,
    DriverViolationListSerializer,
    OfficerEvidenceDetailSerializer,
    OfficerEvidenceListSerializer,
    OfficerViolationDecisionResultSerializer,
    OfficerViolationDecisionSerializer,
    OfficerViolationReviewDetailSerializer,
    OfficerViolationReviewListSerializer,
)
from .services import approve_violation, reject_violation


def filter_officer_violation_queryset(queryset, request):
    status = request.query_params.get('status', '').strip()
    if status:
        queryset = queryset.filter(status=status)

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(vehicle__plate_number__icontains=search)
            | Q(driver__email__icontains=search)
            | Q(driver__first_name__icontains=search)
            | Q(driver__last_name__icontains=search)
            | Q(camera__name__icontains=search)
            | Q(camera__code__icontains=search)
            | Q(traffic_sign__code__icontains=search)
            | Q(traffic_sign__name_en__icontains=search),
        )

    return queryset


def filter_officer_evidence_queryset(queryset, request):
    queryset = filter_officer_violation_queryset(queryset, request)

    camera_id = request.query_params.get('camera_id', '').strip()
    if camera_id:
        queryset = queryset.filter(camera_id=camera_id)

    has_evidence = request.query_params.get('has_evidence', '').strip().lower()
    if has_evidence == 'true':
        queryset = queryset.filter(
            Q(evidence_image__isnull=False) | Q(detection__image__isnull=False),
        ).exclude(evidence_image='')

    return queryset


def officer_violation_queryset(officer):
    return station_violations(officer).select_related(
        'driver',
        'vehicle',
        'camera',
        'camera__station',
        'traffic_sign',
        'detection',
        'reviewed_by',
    )


class OfficerViolationReviewListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        queryset = officer_violation_queryset(officer).order_by('-detected_at')
        queryset = filter_officer_violation_queryset(queryset, request)

        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50

        queryset = queryset[:limit]
        serializer = OfficerViolationReviewListSerializer(
            queryset,
            many=True,
            context={'request': request},
        )
        return success_response(serializer.data)


class OfficerViolationReviewDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request, violation_id: int):
        officer = get_officer_profile(request.user)
        violation = get_object_or_404(officer_violation_queryset(officer), id=violation_id)
        serializer = OfficerViolationReviewDetailSerializer(violation, context={'request': request})
        return success_response(serializer.data)


class OfficerEvidenceListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        queryset = officer_violation_queryset(officer).order_by('-detected_at')
        queryset = filter_officer_evidence_queryset(queryset, request)

        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50

        queryset = queryset[:limit]
        serializer = OfficerEvidenceListSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)


class OfficerEvidenceDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request, violation_id: int):
        officer = get_officer_profile(request.user)
        violation = get_object_or_404(officer_violation_queryset(officer), id=violation_id)
        serializer = OfficerEvidenceDetailSerializer(violation, context={'request': request})
        return success_response(serializer.data)


class OfficerViolationDecisionView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def post(self, request, violation_id: int):
        officer = get_officer_profile(request.user)
        violation = get_object_or_404(officer_violation_queryset(officer), id=violation_id)
        serializer = OfficerViolationDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        decision = serializer.validated_data['decision']
        officer_notes = serializer.validated_data.get('officer_notes', '')

        try:
            if decision == 'approve':
                fine = approve_violation(violation, request.user, officer_notes)
                violation.refresh_from_db()
                message = 'Violation approved successfully.'
                if fine is not None:
                    message = f'Violation approved and fine {fine.reference_number} issued.'
                fine_reference = fine.reference_number if fine is not None else None
            else:
                reject_violation(violation, request.user, officer_notes)
                violation.refresh_from_db()
                message = 'Violation rejected successfully.'
                fine_reference = None
        except ValueError as exc:
            return error_response(str(exc), status=status.HTTP_400_BAD_REQUEST)

        violation = get_object_or_404(officer_violation_queryset(officer), id=violation_id)
        payload = {
            'violation': OfficerViolationReviewDetailSerializer(violation, context={'request': request}).data,
            'fine_reference_number': fine_reference,
            'message': message,
        }
        result = OfficerViolationDecisionResultSerializer(payload)
        return success_response(result.data, message=message)


def filter_driver_violation_queryset(queryset, request):
    status = request.query_params.get('status', '').strip()
    if status:
        queryset = queryset.filter(status=status)

    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(vehicle__plate_number__icontains=search)
            | Q(camera__name__icontains=search)
            | Q(camera__code__icontains=search)
            | Q(traffic_sign__code__icontains=search)
            | Q(traffic_sign__name_en__icontains=search),
        )

    return queryset


def driver_violation_queryset(user):
    return Violation.objects.filter(driver=user).select_related(
        'vehicle',
        'camera',
        'camera__station',
        'traffic_sign',
        'detection',
        'fine',
    )


class DriverViolationListView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        queryset = driver_violation_queryset(request.user).order_by('-detected_at')
        queryset = filter_driver_violation_queryset(queryset, request)

        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50

        queryset = queryset[:limit]
        serializer = DriverViolationListSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)


class DriverViolationDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request, violation_id: int):
        violation = get_object_or_404(driver_violation_queryset(request.user), id=violation_id)
        serializer = DriverViolationDetailSerializer(violation, context={'request': request})
        return success_response(serializer.data)
