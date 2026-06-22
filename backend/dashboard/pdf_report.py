"""Build dashboard analytics PDF (ReportLab)."""
from __future__ import annotations

from io import BytesIO

from django.utils import timezone


def _line(canvas, y: float, text: str, x: float = 50, size: int = 11, bold: bool = False) -> float:
    canvas.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    canvas.drawString(x, y, text[:120])
    return y - (size + 10)


def build_dashboard_report_pdf(stats: dict, *, title: str, scope: str) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    y = 800

    y = _line(p, y, title, bold=True, size=18)
    y = _line(p, y, 'CamTraffic — Traffic Enforcement Analytics', size=10)
    y = _line(p, y, f'Scope: {scope}', size=10)
    y = _line(p, y, f'Generated: {timezone.now().strftime("%Y-%m-%d %H:%M")}', size=10)
    y -= 8

    y = _line(p, y, 'Summary', bold=True, size=13)
    summary_rows = [
        ('Total users', stats.get('total_users', 0)),
        ('Drivers', stats.get('total_drivers', 0)),
        ('Police', stats.get('total_police', 0)),
        ('Total fines', stats.get('total_fines', 0)),
        ('Paid fines', stats.get('paid_fines', 0)),
        ('Pending fines', stats.get('pending_fines', 0)),
        ('Fine revenue (USD)', stats.get('fine_revenue', 0)),
        ('AI detections', stats.get('total_detections', 0)),
        ('Detection accuracy (%)', stats.get('detection_accuracy', 0)),
        ('Violations', stats.get('total_violations', 0)),
        ('Vehicles registered', stats.get('total_vehicles', 0)),
        ('Traffic signs in catalog', stats.get('total_signs', 0)),
    ]
    for label, value in summary_rows:
        y = _line(p, y, f'  {label}: {value}', size=10)
        if y < 80:
            p.showPage()
            y = 800

    y -= 6
    y = _line(p, y, 'Monthly fines (last 6 months)', bold=True, size=13)
    monthly = stats.get('monthly_fines') or []
    if not monthly:
        y = _line(p, y, '  No fine data', size=10)
    else:
        for row in monthly:
            month = row.get('month', '')
            count = row.get('count', 0)
            revenue = row.get('revenue', 0)
            y = _line(p, y, f'  {month}: {count} fines, ${revenue:,.2f} revenue', size=10)
            if y < 80:
                p.showPage()
                y = 800

    y -= 6
    y = _line(p, y, 'Top violation types', bold=True, size=13)
    for row in (stats.get('violation_by_type') or [])[:8]:
        y = _line(
            p,
            y,
            f"  {row.get('violation_type', 'Unknown')}: {row.get('count', 0)}",
            size=10,
        )
        if y < 80:
            p.showPage()
            y = 800

    y -= 6
    y = _line(p, y, 'Top fine reasons', bold=True, size=13)
    for row in (stats.get('fine_by_reason') or [])[:8]:
        y = _line(p, y, f"  {row.get('reason', 'Other')}: {row.get('count', 0)}", size=10)
        if y < 80:
            p.showPage()
            y = 800

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer.getvalue()
