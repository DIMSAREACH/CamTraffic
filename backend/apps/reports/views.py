from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.responses import success_response
from apps.dashboard.officer_services import get_officer_profile
from apps.rbac.permissions import HasRBACRole

from .models import ReportExport
from .serializers import ReportCatalogItemSerializer, ReportExportCreateSerializer, ReportExportSerializer
from .services import OFFICER_REPORT_CATALOG, REPORT_CATALOG, generate_report_export


class ReportCatalogView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        serializer = ReportCatalogItemSerializer(REPORT_CATALOG, many=True)
        return success_response(serializer.data)


class ReportExportListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        queryset = ReportExport.objects.select_related('requested_by').order_by('-created_at')
        report_type = request.query_params.get('report_type', '').strip()
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        export_status = request.query_params.get('status', '').strip()
        if export_status:
            queryset = queryset.filter(status=export_status)
        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50
        queryset = queryset[:limit]
        serializer = ReportExportSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)

    def post(self, request):
        serializer = ReportExportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        export = ReportExport.objects.create(
            requested_by=request.user,
            report_type=serializer.validated_data['report_type'],
            format=serializer.validated_data['format'],
            parameters=serializer.validated_data.get('parameters') or {},
        )
        export = generate_report_export(export)
        export = ReportExport.objects.select_related('requested_by').get(pk=export.pk)
        return success_response(
            ReportExportSerializer(export, context={'request': request}).data,
            message='Report export generated successfully.',
            status=status.HTTP_201_CREATED,
        )


class ReportExportDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request, export_id: int):
        export = get_object_or_404(ReportExport.objects.select_related('requested_by'), id=export_id)
        return success_response(ReportExportSerializer(export, context={'request': request}).data)


class OfficerReportCatalogView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        serializer = ReportCatalogItemSerializer(OFFICER_REPORT_CATALOG, many=True)
        return success_response(serializer.data)


class OfficerReportExportListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        queryset = ReportExport.objects.select_related('requested_by').filter(requested_by=request.user).order_by('-created_at')
        report_type = request.query_params.get('report_type', '').strip()
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        export_status = request.query_params.get('status', '').strip()
        if export_status:
            queryset = queryset.filter(status=export_status)
        limit_param = request.query_params.get('limit', '50').strip()
        try:
            limit = max(1, min(int(limit_param), 100))
        except ValueError:
            limit = 50
        queryset = queryset[:limit]
        serializer = ReportExportSerializer(queryset, many=True, context={'request': request})
        return success_response(serializer.data)

    def post(self, request):
        officer = get_officer_profile(request.user)
        serializer = ReportExportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        parameters = dict(serializer.validated_data.get('parameters') or {})
        parameters['station_id'] = officer.station_id
        export = ReportExport.objects.create(
            requested_by=request.user,
            report_type=serializer.validated_data['report_type'],
            format=serializer.validated_data['format'],
            parameters=parameters,
        )
        export = generate_report_export(export)
        export = ReportExport.objects.select_related('requested_by').get(pk=export.pk)
        return success_response(
            ReportExportSerializer(export, context={'request': request}).data,
            message='Report export generated successfully.',
            status=status.HTTP_201_CREATED,
        )


class OfficerReportExportDetailView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request, export_id: int):
        export = get_object_or_404(
            ReportExport.objects.select_related('requested_by'),
            id=export_id,
            requested_by=request.user,
        )
        return success_response(ReportExportSerializer(export, context={'request': request}).data)
