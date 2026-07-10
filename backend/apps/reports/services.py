from __future__ import annotations

from datetime import datetime

from django.core.files.base import ContentFile
from django.db.models import Avg, Count
from django.utils import timezone

from apps.cameras.models import Camera
from apps.detections.models import Detection
from apps.fines.models import Fine
from apps.violations.models import Violation

from .export_formats import ReportData, build_csv_content, build_excel_bytes, build_pdf_bytes
from .models import ReportExport

REPORT_CATALOG = [
    {
        'code': 'violations',
        'name': 'Violations Summary',
        'description': 'Violation counts and status breakdown for the selected period.',
        'supported_formats': ['csv', 'pdf', 'excel'],
    },
    {
        'code': 'detections',
        'name': 'AI Detections Summary',
        'description': 'Detection volume, confidence metrics, and camera coverage.',
        'supported_formats': ['csv', 'pdf', 'excel'],
    },
    {
        'code': 'fines',
        'name': 'Fines Summary',
        'description': 'Fine totals and payment status overview.',
        'supported_formats': ['csv', 'pdf', 'excel'],
    },
    {
        'code': 'cameras',
        'name': 'Camera Status Report',
        'description': 'Camera availability, status, and station assignment snapshot.',
        'supported_formats': ['csv', 'pdf', 'excel'],
    },
]

SUPPORTED_REPORT_TYPES = {item['code'] for item in REPORT_CATALOG}

OFFICER_REPORT_CATALOG = [
    {
        'code': 'violations',
        'name': 'Station Violations Summary',
        'description': 'Violation counts and status breakdown for your assigned station.',
        'supported_formats': ['csv', 'pdf', 'excel'],
    },
    {
        'code': 'detections',
        'name': 'Station Detections Summary',
        'description': 'Detection volume and confidence metrics for station cameras.',
        'supported_formats': ['csv', 'pdf', 'excel'],
    },
    {
        'code': 'fines',
        'name': 'Station Fines Summary',
        'description': 'Fine totals and payment status for violations at your station.',
        'supported_formats': ['csv', 'pdf', 'excel'],
    },
    {
        'code': 'cameras',
        'name': 'Station Camera Report',
        'description': 'Camera availability and health snapshot for your station.',
        'supported_formats': ['csv', 'pdf', 'excel'],
    },
]

REPORT_TITLES = {item['code']: item['name'] for item in REPORT_CATALOG}


def _parse_date_range(parameters: dict) -> tuple[datetime | None, datetime | None]:
    date_from = parameters.get('date_from')
    date_to = parameters.get('date_to')
    start = datetime.fromisoformat(date_from) if date_from else None
    end = datetime.fromisoformat(date_to) if date_to else None
    if start and timezone.is_naive(start):
        start = timezone.make_aware(start)
    if end and timezone.is_naive(end):
        end = timezone.make_aware(end)
    return start, end


def _filter_by_range(queryset, field_name: str, parameters: dict):
    start, end = _parse_date_range(parameters)
    if start:
        queryset = queryset.filter(**{f'{field_name}__gte': start})
    if end:
        queryset = queryset.filter(**{f'{field_name}__lte': end})
    return queryset


def _build_violations_data(parameters: dict) -> ReportData:
    queryset = Violation.objects.all()
    station_id = parameters.get('station_id')
    if station_id:
        queryset = queryset.filter(camera__station_id=station_id)
    queryset = _filter_by_range(queryset, 'detected_at', parameters)
    summary_rows: list[tuple[str, str | int | float]] = [('total_violations', queryset.count())]
    for row in queryset.values('status').annotate(count=Count('id')).order_by('status'):
        summary_rows.append((f'status_{row["status"]}', row['count']))

    detail_headers = ['id', 'status', 'detected_at', 'camera_id', 'traffic_sign_id']
    detail_rows = [
        [
            violation.id,
            violation.status,
            violation.detected_at.isoformat(),
            violation.camera_id,
            violation.traffic_sign_id,
        ]
        for violation in queryset.select_related('camera', 'traffic_sign').order_by('-detected_at')[:500]
    ]
    return ReportData(
        title=REPORT_TITLES['violations'],
        report_type='violations',
        generated_at=timezone.now().isoformat(),
        summary_rows=summary_rows,
        detail_headers=detail_headers,
        detail_rows=detail_rows,
    )


def _build_detections_data(parameters: dict) -> ReportData:
    queryset = Detection.objects.all()
    station_id = parameters.get('station_id')
    if station_id:
        queryset = queryset.filter(camera__station_id=station_id)
    queryset = _filter_by_range(queryset, 'detected_at', parameters)
    avg_confidence = queryset.aggregate(avg=Avg('confidence'))['avg'] or 0.0
    summary_rows: list[tuple[str, str | int | float]] = [
        ('total_detections', queryset.count()),
        ('average_confidence', round(float(avg_confidence), 4)),
    ]

    detail_headers = ['id', 'camera_id', 'confidence', 'plate_number', 'detected_at']
    detail_rows = [
        [
            detection.id,
            detection.camera_id,
            detection.confidence,
            detection.plate_number,
            detection.detected_at.isoformat(),
        ]
        for detection in queryset.select_related('camera').order_by('-detected_at')[:500]
    ]
    return ReportData(
        title=REPORT_TITLES['detections'],
        report_type='detections',
        generated_at=timezone.now().isoformat(),
        summary_rows=summary_rows,
        detail_headers=detail_headers,
        detail_rows=detail_rows,
    )


def _build_fines_data(parameters: dict) -> ReportData:
    queryset = Fine.objects.select_related('violation', 'violation__camera')
    station_id = parameters.get('station_id')
    if station_id:
        queryset = queryset.filter(violation__camera__station_id=station_id)
    start, end = _parse_date_range(parameters)
    if start:
        queryset = queryset.filter(created_at__gte=start)
    if end:
        queryset = queryset.filter(created_at__lte=end)

    summary_rows: list[tuple[str, str | int | float]] = [('total_fines', queryset.count())]
    for row in queryset.values('status').annotate(count=Count('id')).order_by('status'):
        summary_rows.append((f'status_{row["status"]}', row['count']))

    detail_headers = ['reference_number', 'amount', 'currency', 'status', 'due_date', 'paid_at']
    detail_rows = [
        [
            fine.reference_number,
            fine.amount,
            fine.currency,
            fine.status,
            fine.due_date.isoformat(),
            fine.paid_at.isoformat() if fine.paid_at else '',
        ]
        for fine in queryset.order_by('-created_at')[:500]
    ]
    return ReportData(
        title=REPORT_TITLES['fines'],
        report_type='fines',
        generated_at=timezone.now().isoformat(),
        summary_rows=summary_rows,
        detail_headers=detail_headers,
        detail_rows=detail_rows,
    )


def _build_cameras_data(parameters: dict) -> ReportData:
    queryset = Camera.objects.select_related('station').all()
    station_id = parameters.get('station_id')
    if station_id:
        queryset = queryset.filter(station_id=station_id)
    if parameters.get('active_only', True):
        queryset = queryset.filter(is_active=True)

    summary_rows: list[tuple[str, str | int | float]] = [('total_cameras', queryset.count())]
    for row in queryset.values('status').annotate(count=Count('id')).order_by('status'):
        summary_rows.append((f'status_{row["status"]}', row['count']))

    detail_headers = ['code', 'name', 'status', 'location', 'station_code', 'last_health_check']
    detail_rows = [
        [
            camera.code,
            camera.name,
            camera.status,
            camera.location,
            camera.station.code if camera.station_id else '',
            camera.last_health_check.isoformat() if camera.last_health_check else '',
        ]
        for camera in queryset.order_by('name')
    ]
    return ReportData(
        title=REPORT_TITLES['cameras'],
        report_type='cameras',
        generated_at=timezone.now().isoformat(),
        summary_rows=summary_rows,
        detail_headers=detail_headers,
        detail_rows=detail_rows,
    )


def collect_report_data(report_type: str, parameters: dict) -> ReportData:
    builders = {
        'violations': _build_violations_data,
        'detections': _build_detections_data,
        'fines': _build_fines_data,
        'cameras': _build_cameras_data,
    }
    builder = builders.get(report_type)
    if builder is None:
        raise ValueError(f'Unsupported report type: {report_type}')
    return builder(parameters or {})


def build_report_file(export: ReportExport) -> tuple[bytes, str]:
    parameters = export.parameters or {}
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    data = collect_report_data(export.report_type, parameters)

    if export.format == ReportExport.Format.CSV:
        content = build_csv_content(data)
        filename = f'{export.report_type}_{export.id}_{timestamp}.csv'
        return content.encode('utf-8'), filename

    if export.format == ReportExport.Format.PDF:
        file_bytes = build_pdf_bytes(data)
        filename = f'{export.report_type}_{export.id}_{timestamp}.pdf'
        return file_bytes, filename

    if export.format == ReportExport.Format.EXCEL:
        file_bytes = build_excel_bytes(data)
        filename = f'{export.report_type}_{export.id}_{timestamp}.xlsx'
        return file_bytes, filename

    raise ValueError(f'Unsupported export format: {export.format}')


def generate_report_export(export: ReportExport) -> ReportExport:
    export.status = ReportExport.Status.PROCESSING
    export.save(update_fields=['status', 'updated_at'])

    try:
        file_bytes, filename = build_report_file(export)
        export.file.save(filename, ContentFile(file_bytes), save=False)
        export.status = ReportExport.Status.COMPLETED
        export.error_message = ''
    except Exception as exc:  # noqa: BLE001 - capture generation failures on export record
        export.status = ReportExport.Status.FAILED
        export.error_message = str(exc)

    export.save()
    return export
