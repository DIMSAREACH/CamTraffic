from django.http import FileResponse, HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.backup_service import create_system_backup, list_backups, restore_system_backup
from core.permissions import IsAdmin, IsPoliceOrAdmin
from core.responses import error_response, success_response

from .analytics_extensions import (
    get_ai_dashboard_stats,
    get_detection_analytics,
    get_driver_analytics,
    get_heatmap_points,
    get_officer_performance,
)
from .demo_stats import enrich_report_stats
from .evidence_archive import search_evidence_archive
from .excel_export import build_enforcement_monthly_workbook
from .pdf_report import build_dashboard_report_pdf
from .services import get_admin_stats, get_driver_stats, get_police_report_stats, get_police_stats


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response(get_admin_stats(request))


class PoliceDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('police', 'admin'):
            return success_response(get_driver_stats(request.user, request))
        return success_response(get_police_stats(request.user, request))


class PoliceReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('police', 'admin'):
            return success_response(get_driver_stats(request.user, request))
        return success_response(get_police_report_stats(request.user, request))


class DriverDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success_response(get_driver_stats(request.user, request))


class AdminReportPDFView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        stats = enrich_report_stats(get_admin_stats(request))
        pdf = build_dashboard_report_pdf(
            stats,
            title='Admin Analytics Report',
            scope='System-wide (all users)',
        )
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="camtraffic-admin-report.pdf"'
        return response


class PoliceReportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('police', 'admin'):
            stats = enrich_report_stats(get_driver_stats(request.user, request))
            pdf = build_dashboard_report_pdf(
                stats,
                title='Driver Summary Report',
                scope=f'Driver: {request.user.full_name}',
            )
        else:
            stats = enrich_report_stats(get_police_report_stats(request.user, request))
            pdf = build_dashboard_report_pdf(
                stats,
                title='Police Analytics Report',
                scope=f'Officer: {request.user.full_name}',
            )
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="camtraffic-report.pdf"'
        return response


class EnforcementMonthlyExcelView(APIView):
    """Export violations + fines for a calendar month as .xlsx (admin or police)."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        now = timezone.now()
        try:
            year = int(request.query_params.get('year', now.year))
            month = int(request.query_params.get('month', now.month))
        except (TypeError, ValueError):
            return error_response('Invalid year or month', status_code=400)
        if month < 1 or month > 12:
            return error_response('Month must be 1–12', status_code=400)
        if year < 2000 or year > 2100:
            return error_response('Year out of range', status_code=400)

        try:
            content = build_enforcement_monthly_workbook(
                user=request.user,
                year=year,
                month=month,
            )
        except RuntimeError as exc:
            return error_response(str(exc), status_code=503)

        filename = f'camtraffic-enforcement-{year}-{month:02d}.xlsx'
        response = HttpResponse(
            content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class EvidenceArchiveView(APIView):
    """Unified search across detection, violation, and fine evidence images."""
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        plate = (request.query_params.get('plate') or '').strip()
        source_type = (request.query_params.get('type') or 'all').strip().lower()
        if source_type not in ('all', 'detection', 'violation', 'fine'):
            source_type = 'all'
        try:
            limit = int(request.query_params.get('limit') or 60)
        except (TypeError, ValueError):
            limit = 60
        rows = search_evidence_archive(
            request,
            user=request.user,
            plate=plate,
            source_type=source_type,
            limit=limit,
        )
        return success_response({
            'count': len(rows),
            'results': rows,
        })


class AdminSystemBackupListView(APIView):
    """List stored system backup archives (admin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response({'backups': list_backups()})


class AdminSystemBackupView(APIView):
    """Create and download a full system backup ZIP (admin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        include_weights = request.query_params.get('include_weights', 'false').lower() == 'true'
        try:
            path, manifest = create_system_backup(include_weights=include_weights, store_copy=True)
        except Exception as exc:
            return error_response(f'Backup failed: {exc}', status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response = FileResponse(
            path.open('rb'),
            content_type='application/zip',
            as_attachment=True,
            filename=manifest['filename'],
        )
        response['Content-Length'] = manifest['size_bytes']
        return response


class AdminSystemBackupRestoreView(APIView):
    """Restore system from a stored backup archive (admin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, filename):
        from pathlib import Path

        from django.conf import settings

        safe_name = Path(filename).name
        if not safe_name.startswith('camtraffic-backup-') or not safe_name.endswith('.zip'):
            return error_response('Invalid backup filename.', status_code=status.HTTP_400_BAD_REQUEST)

        backup_path = Path(getattr(settings, 'BACKUP_ROOT', settings.BASE_DIR / 'backups')) / safe_name
        if not backup_path.is_file():
            return error_response('Backup not found.', status_code=status.HTTP_404_NOT_FOUND)

        include_media = request.data.get('include_media', True)
        if isinstance(include_media, str):
            include_media = include_media.lower() not in ('false', '0', 'no')

        try:
            result = restore_system_backup(
                backup_path,
                restore_media=bool(include_media),
                restore_database=True,
            )
        except FileNotFoundError as exc:
            return error_response(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return error_response(f'Restore failed: {exc}', status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return success_response(result, message='System restore completed')


class AdminHeatmapView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response({'points': get_heatmap_points()})


class AdminOfficerPerformanceView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response({'officers': get_officer_performance()})


class AdminDriverAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response({'drivers': get_driver_analytics()})


class AdminAIDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response(get_ai_dashboard_stats(request.user, request))


class AdminDetectionAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        return success_response(get_detection_analytics(request.user))
