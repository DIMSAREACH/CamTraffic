"""Admin-only bulk data import APIs."""
from __future__ import annotations

from datetime import timedelta

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from audit.services import write_audit_log
from core.permissions import IsAdmin
from core.responses import error_response, success_response

from .importers import commit_job_rows
from .models import ImportJob
from .parsers import parse_upload
from .serializers import ImportJobDetailSerializer, ImportJobSerializer
from .templates import TEMPLATES, build_csv_template, build_xlsx_template, types_catalog
from .validators import validate_rows

IMPORT_TYPES = set(TEMPLATES.keys())
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


def _counts(report: list[dict]) -> dict:
    total = len(report)
    valid = sum(1 for r in report if r.get('status') == 'ok')
    skipped = sum(1 for r in report if r.get('status') == 'skip')
    failed = sum(1 for r in report if r.get('status') in ('error', 'failed'))
    success = sum(1 for r in report if r.get('status') == 'success')
    return {
        'total': total,
        'valid': valid,
        'skipped': skipped,
        'failed': failed,
        'success': success,
        'error': sum(1 for r in report if r.get('status') == 'error'),
    }


class ImportTypesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response(types_catalog())


class ImportTemplateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        import_type = (request.query_params.get('type') or '').strip().lower()
        fmt = (request.query_params.get('file_format') or request.query_params.get('fmt') or 'csv').strip().lower()
        if import_type not in IMPORT_TYPES:
            return error_response('Invalid import type.', status_code=400)
        if fmt not in ('csv', 'xlsx'):
            return error_response('file_format must be csv or xlsx.', status_code=400)

        if fmt == 'xlsx':
            content = build_xlsx_template(import_type)
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename = f'camtraffic-import-{import_type}.xlsx'
        else:
            content = build_csv_template(import_type)
            content_type = 'text/csv; charset=utf-8'
            filename = f'camtraffic-import-{import_type}.csv'

        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


def _first_value(data, key: str) -> str:
    """Multipart fields may arrive as a list; normalize to a single string."""
    value = data.get(key)
    if isinstance(value, (list, tuple)):
        value = value[0] if value else ''
    return str(value or '').strip()


class ImportValidateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        import_type = (
            _first_value(request.data, 'type')
            or (request.query_params.get('type') or '').strip()
        ).lower()
        upload = request.FILES.get('file') or request.FILES.get('upload')
        if import_type not in IMPORT_TYPES:
            return error_response(
                f'Invalid import type "{import_type or "(missing)"}". '
                f'Use one of: {", ".join(sorted(IMPORT_TYPES))}.',
                status_code=400,
            )
        if not upload:
            return error_response(
                'File is required. Choose a CSV or Excel (.xlsx) file and try again.',
                status_code=400,
            )
        if upload.size and upload.size > MAX_UPLOAD_BYTES:
            return error_response('File too large (max 5 MB).', status_code=400)

        content = upload.read()
        if not content:
            return error_response('Uploaded file is empty.', status_code=400)

        file_name = getattr(upload, 'name', 'upload.csv') or 'upload.csv'
        try:
            rows = parse_upload(import_type, file_name, content)
        except ValueError as exc:
            return error_response(str(exc), status_code=400)
        except Exception as exc:  # noqa: BLE001
            return error_response(
                f'Could not read file "{file_name}": {exc}. Use the downloadable CSV/XLSX template.',
                status_code=400,
            )

        if len(rows) > 2000:
            return error_response('Too many rows (max 2000 per file).', status_code=400)

        try:
            report = validate_rows(import_type, rows, actor=request.user)
            counts = _counts(report)

            job = ImportJob.objects.create(
                import_type=import_type,
                file_name=file_name[:255],
                status='validated',
                created_by=request.user,
                total_rows=counts['total'],
                valid_rows=counts['valid'],
                success_count=0,
                failed_count=counts['error'],
                skipped_count=counts['skipped'],
                rows_report=report,
                error_summary={'validate': counts},
                expires_at=timezone.now() + timedelta(hours=24),
            )
        except Exception as exc:  # noqa: BLE001
            return error_response(
                f'Validation could not be saved (database). Run migrations if ImportJob is missing: {exc}',
                status_code=500,
            )

        return success_response({
            'job_id': str(job.id),
            'import_type': import_type,
            'file_name': job.file_name,
            'rows': report,
            'counts': counts,
        }, message='Validation complete')


class ImportCommitView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        job_id = request.data.get('job_id')
        if not job_id:
            return error_response('job_id is required.', status_code=400)
        try:
            job = ImportJob.objects.get(pk=job_id)
        except ImportJob.DoesNotExist:
            return error_response('Import job not found.', status_code=404)

        if job.created_by_id and job.created_by_id != request.user.id and not request.user.is_superuser:
            return error_response('You can only commit your own import jobs.', status_code=403)

        if job.mark_expired_if_needed():
            return error_response('This import job has expired. Re-validate the file.', status_code=400)
        if job.status == 'committed':
            return error_response('This import job was already committed.', status_code=400)
        if job.status != 'validated':
            return error_response(f'Job status is {job.status}; expected validated.', status_code=400)
        if job.valid_rows < 1:
            return error_response('No valid rows to import.', status_code=400)

        try:
            updated = commit_job_rows(job.import_type, job.rows_report or [], actor=request.user)
        except Exception as exc:  # noqa: BLE001
            job.status = 'failed'
            job.error_summary = {**(job.error_summary or {}), 'commit_error': str(exc)}
            job.save(update_fields=['status', 'error_summary', 'updated_at'])
            return error_response(f'Import failed: {exc}', status_code=500)

        counts = _counts(updated)
        job.rows_report = updated
        job.status = 'committed'
        job.success_count = counts['success']
        job.failed_count = counts['failed']
        job.skipped_count = counts['skipped']
        job.error_summary = {**(job.error_summary or {}), 'commit': counts}
        job.save(update_fields=[
            'rows_report', 'status', 'success_count', 'failed_count', 'skipped_count',
            'error_summary', 'updated_at',
        ])

        write_audit_log(
            user=request.user,
            action='create',
            resource='data_import',
            resource_id=str(job.id),
            request=request,
            new_value={
                'import_type': job.import_type,
                'file_name': job.file_name,
                'success': job.success_count,
                'failed': job.failed_count,
                'skipped': job.skipped_count,
            },
        )
        return success_response({
            'job': ImportJobDetailSerializer(job).data,
            'counts': counts,
        }, message='Import completed')


class ImportHistoryListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = ImportJob.objects.select_related('created_by').all()
        import_type = (request.query_params.get('type') or '').strip().lower()
        if import_type in IMPORT_TYPES:
            qs = qs.filter(import_type=import_type)
        qs = qs.order_by('-created_at')[:100]
        return success_response(ImportJobSerializer(qs, many=True).data)


class ImportHistoryDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            job = ImportJob.objects.select_related('created_by').get(pk=pk)
        except ImportJob.DoesNotExist:
            return error_response('Import job not found.', status_code=404)
        return success_response(ImportJobDetailSerializer(job).data)
