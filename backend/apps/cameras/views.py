from datetime import timedelta

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import error_response, success_response
from apps.dashboard.officer_services import get_officer_profile, station_cameras
from apps.rbac.permissions import HasRBACRole

from .health import build_camera_health_record, perform_health_check
from .live_dashboard import build_live_dashboard_payload, filter_live_camera_queryset
from .models import Camera
from .serializers import (
    CameraCreateSerializer,
    CameraHealthMonitoringSerializer,
    CameraHealthRecordSerializer,
    CameraLiveDashboardSerializer,
    CameraLiveFeedSerializer,
    CameraManageSerializer,
    CameraUpdateSerializer,
)


class CameraListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = Camera.objects.select_related('station').order_by('name')
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(location__icontains=search)
                | Q(station__name__icontains=search),
            )
        station_id = request.query_params.get('station_id', '').strip()
        if station_id:
            queryset = queryset.filter(station_id=station_id)
        camera_status = request.query_params.get('status', '').strip()
        if camera_status:
            queryset = queryset.filter(status=camera_status)
        is_active = request.query_params.get('is_active', '').strip().lower()
        if is_active in ('true', 'false'):
            queryset = queryset.filter(is_active=is_active == 'true')
        return success_response(CameraManageSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = CameraCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        camera = serializer.save()
        camera = Camera.objects.select_related('station').get(pk=camera.pk)
        return success_response(
            CameraManageSerializer(camera).data,
            message='Camera created successfully.',
            status=status.HTTP_201_CREATED,
        )


class CameraDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    @staticmethod
    def _get_camera(camera_id: int) -> Camera:
        return get_object_or_404(Camera.objects.select_related('station'), id=camera_id)

    def get(self, request, camera_id: int):
        camera = self._get_camera(camera_id)
        return success_response(CameraManageSerializer(camera).data)

    def patch(self, request, camera_id: int):
        camera = self._get_camera(camera_id)
        serializer = CameraUpdateSerializer(camera, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        camera = serializer.save()
        camera = Camera.objects.select_related('station').get(pk=camera.pk)
        return success_response(CameraManageSerializer(camera).data, message='Camera updated successfully.')

    def delete(self, request, camera_id: int):
        camera = self._get_camera(camera_id)
        if camera.detections.exists():
            return error_response(
                'Cannot delete a camera with detection history. Deactivate it instead.',
                status=status.HTTP_400_BAD_REQUEST,
            )
        camera.delete()
        return success_response(None, message='Camera deleted successfully.')


class CameraLiveDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = Camera.objects.select_related('station').filter(is_active=True).order_by('name')
        queryset = filter_live_camera_queryset(queryset, request)
        summary_queryset = Camera.objects.filter(is_active=True)
        payload = build_live_dashboard_payload(queryset, summary_queryset)
        serializer = CameraLiveDashboardSerializer(payload)
        return success_response(serializer.data)


class OfficerLiveCameraView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        queryset = station_cameras(officer).select_related('station').filter(is_active=True).order_by('name')
        queryset = filter_live_camera_queryset(queryset, request)
        summary_queryset = station_cameras(officer).filter(is_active=True)
        payload = build_live_dashboard_payload(queryset, summary_queryset)
        serializer = CameraLiveDashboardSerializer(payload)
        return success_response(serializer.data)


class CameraHealthMonitoringView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = Camera.objects.select_related('station').filter(is_active=True).order_by('name')
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(location__icontains=search)
                | Q(station__name__icontains=search),
            )
        station_id = request.query_params.get('station_id', '').strip()
        if station_id:
            queryset = queryset.filter(station_id=station_id)
        camera_status = request.query_params.get('status', '').strip()
        if camera_status:
            queryset = queryset.filter(status=camera_status)

        all_records = [build_camera_health_record(camera) for camera in queryset]
        health_state = request.query_params.get('health_state', '').strip()
        if health_state:
            all_records = [record for record in all_records if record['health_state'] == health_state]

        summary_source = [build_camera_health_record(camera) for camera in queryset]
        stale_threshold = timezone.now() - timedelta(hours=1)
        payload = {
            'total_cameras': len(summary_source),
            'healthy_cameras': sum(1 for record in summary_source if record['health_state'] == 'healthy'),
            'warning_cameras': sum(1 for record in summary_source if record['health_state'] == 'warning'),
            'critical_cameras': sum(1 for record in summary_source if record['health_state'] == 'critical'),
            'unknown_cameras': sum(1 for record in summary_source if record['health_state'] == 'unknown'),
            'stale_check_cameras': queryset.filter(
                Q(last_health_check__isnull=True) | Q(last_health_check__lt=stale_threshold),
            ).count(),
            'cameras': all_records,
        }
        serializer = CameraHealthMonitoringSerializer(payload)
        return success_response(serializer.data)


class CameraHealthCheckView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def post(self, request, camera_id: int):
        camera = get_object_or_404(Camera.objects.select_related('station'), id=camera_id)
        camera = perform_health_check(camera)
        record = build_camera_health_record(camera)
        return success_response(
            CameraHealthRecordSerializer(record).data,
            message='Camera health check completed successfully.',
        )


class CameraHealthCheckAllView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def post(self, request):
        cameras = Camera.objects.filter(is_active=True)
        checked_count = 0
        for camera in cameras:
            perform_health_check(camera)
            checked_count += 1
        return success_response(
            {'checked_count': checked_count},
            message=f'Health checks completed for {checked_count} cameras.',
        )
