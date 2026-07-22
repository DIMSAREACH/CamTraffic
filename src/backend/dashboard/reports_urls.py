"""Thesis-aligned /api/reports/* aliases over dashboard analytics."""

from __future__ import annotations

import csv
import io
from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.urls import path
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsPoliceOrAdmin
from core.responses import success_response
from fines.models import Fine
from infrastructure.models import Camera
from violations.models import TrafficViolation


class ReportsDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        today = timezone.localdate()
        violations = TrafficViolation.objects.all()
        fines = Fine.objects.all()
        return success_response(
            {
                'total_violations': violations.count(),
                'today_violations': violations.filter(violation_date__date=today).count(),
                'active_cameras': Camera.objects.filter(status='active').count(),
                'pending_approvals': violations.filter(status='pending_review').count(),
                'total_fines': fines.count(),
                'paid_fines': fines.filter(status='paid').count(),
                'unpaid_fines': fines.filter(status__in=['pending', 'overdue']).count(),
                'paid_amount': float(fines.filter(status='paid').aggregate(s=Sum('amount'))['s'] or 0),
                'unpaid_amount': float(
                    fines.filter(status__in=['pending', 'overdue']).aggregate(s=Sum('amount'))['s'] or 0
                ),
            }
        )


class ReportsViolationsView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        period = (request.query_params.get('period') or 'monthly').lower()
        qs = TrafficViolation.objects.all()
        now = timezone.now()
        if period == 'daily':
            qs = qs.filter(violation_date__date=now.date())
        elif period == 'weekly':
            qs = qs.filter(violation_date__gte=now - timedelta(days=7))
        elif period == 'yearly':
            qs = qs.filter(violation_date__year=now.year)
        else:
            qs = qs.filter(violation_date__year=now.year, violation_date__month=now.month)

        by_type = list(
            qs.values('violation_type').annotate(count=Count('id')).order_by('-count')[:20]
        )
        monthly = list(
            TrafficViolation.objects.filter(violation_date__gte=now - timedelta(days=365))
            .annotate(month=TruncMonth('violation_date'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        return success_response(
            {
                'period': period,
                'total': qs.count(),
                'top_violation_types': by_type,
                'monthly_trends': [
                    {'month': m['month'].isoformat() if m['month'] else None, 'count': m['count']}
                    for m in monthly
                ],
            }
        )


class ReportsFinesView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        qs = Fine.objects.all()
        return success_response(
            {
                'total': qs.count(),
                'by_status': list(qs.values('status').annotate(count=Count('id'), amount=Sum('amount'))),
                'paid_vs_unpaid': {
                    'paid': qs.filter(status='paid').count(),
                    'unpaid': qs.filter(status__in=['pending', 'overdue']).count(),
                },
            }
        )


class ReportsExportCsvView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        report = (request.query_params.get('type') or 'violations').lower()
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        if report == 'fines':
            writer.writerow(['id', 'amount', 'status', 'location', 'vehicle_plate', 'created_at'])
            for f in Fine.objects.order_by('-created_at')[:5000]:
                writer.writerow([f.id, f.amount, f.status, f.location, f.vehicle_plate, f.created_at])
        else:
            writer.writerow(
                ['id', 'violation_type', 'status', 'location', 'plate', 'violation_date', 'confidence']
            )
            for v in TrafficViolation.objects.order_by('-violation_date')[:5000]:
                writer.writerow(
                    [
                        v.id,
                        v.violation_type,
                        v.status,
                        v.location,
                        v.plate_detected,
                        v.violation_date,
                        v.ai_confidence_score,
                    ]
                )
        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="camtraffic_{report}.csv"'
        return response


class ReportsExportPdfView(APIView):
    """Summary export. Branded PDF: GET /api/dashboard/admin/report/pdf/."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        summary = (
            'CamTraffic Report\n'
            f'Generated: {timezone.now().isoformat()}\n'
            f'Violations: {TrafficViolation.objects.count()}\n'
            f'Fines: {Fine.objects.count()}\n'
            f'Pending reviews: {TrafficViolation.objects.filter(status="pending_review").count()}\n'
            'See also: GET /api/dashboard/admin/report/pdf/\n'
        )
        response = HttpResponse(summary, content_type='application/octet-stream')
        response['Content-Disposition'] = 'attachment; filename="camtraffic_report.txt"'
        return response


urlpatterns = [
    path('dashboard/', ReportsDashboardView.as_view(), name='reports-dashboard'),
    path('violations/', ReportsViolationsView.as_view(), name='reports-violations'),
    path('fines/', ReportsFinesView.as_view(), name='reports-fines'),
    path('export/csv/', ReportsExportCsvView.as_view(), name='reports-export-csv'),
    path('export/pdf/', ReportsExportPdfView.as_view(), name='reports-export-pdf'),
]
