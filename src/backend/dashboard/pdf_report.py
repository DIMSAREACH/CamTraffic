"""Build dashboard analytics PDF (ReportLab) with a professional layout."""
from __future__ import annotations

from io import BytesIO

from django.utils import timezone

BRAND_AMBER = '#D97706'
BRAND_BLUE = '#2563EB'
HEADER_BG = '#FFF7ED'
ROW_ALT = '#F8FAFC'
TEXT_DARK = '#0F172A'
TEXT_MUTED = '#64748B'
BORDER = '#E2E8F0'


def _fmt_currency(value) -> str:
    try:
        return f'${float(value):,.2f}'
    except (TypeError, ValueError):
        return str(value)


def _kpi_table(stats: dict) -> list[list[str]]:
    collection = 0
    total_fines = stats.get('total_fines') or 0
    paid = stats.get('paid_fines') or 0
    if total_fines:
        collection = round((paid / total_fines) * 100)

    return [
        ['Total Users', str(stats.get('total_users', 0)), 'Drivers', str(stats.get('total_drivers', 0))],
        ['Police Officers', str(stats.get('total_police', 0)), 'Vehicles', str(stats.get('total_vehicles', 0))],
        ['Total Fines', str(stats.get('total_fines', 0)), 'Paid Fines', str(stats.get('paid_fines', 0))],
        ['Pending Fines', str(stats.get('pending_fines', 0)), 'Collection Rate', f'{collection}%'],
        ['Fine Revenue', _fmt_currency(stats.get('fine_revenue', 0)), 'Violations', str(stats.get('total_violations', 0))],
        ['AI Detections', str(stats.get('total_detections', 0)), 'Model Accuracy', f"{stats.get('detection_accuracy', 0)}%"],
        ['Sign Catalog', str(stats.get('total_signs', 0)), 'Reporting', timezone.now().strftime('%b %Y')],
    ]


def _data_table(headers: list[str], rows: list[list[str]]) -> 'Table':
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib import colors

    data = [headers, *rows]
    table = Table(data, colWidths=[None] * len(headers), repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(HEADER_BG)),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor(BRAND_AMBER)),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor(TEXT_DARK)),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor(BORDER)),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor(ROW_ALT)]),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def _section_title(text: str) -> 'Paragraph':
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph
    from reportlab.lib import colors

    style = ParagraphStyle(
        name='SectionTitle',
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=colors.HexColor(TEXT_DARK),
        spaceBefore=14,
        spaceAfter=8,
        leading=14,
    )
    return Paragraph(text, style)


def _header_footer(canvas, doc, *, title: str):
    from reportlab.lib import colors
    from reportlab.lib.units import mm

    canvas.saveState()
    width, height = doc.pagesize

    canvas.setFillColor(colors.HexColor(BRAND_AMBER))
    canvas.rect(0, height - 18 * mm, width, 18 * mm, fill=1, stroke=0)

    canvas.setFillColor(colors.white)
    canvas.setFont('Helvetica-Bold', 11)
    canvas.drawString(18 * mm, height - 12 * mm, 'CamTraffic')
    canvas.setFont('Helvetica', 8)
    canvas.drawRightString(width - 18 * mm, height - 12 * mm, title[:72])

    canvas.setStrokeColor(colors.HexColor(BORDER))
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)

    canvas.setFillColor(colors.HexColor(TEXT_MUTED))
    canvas.setFont('Helvetica', 8)
    canvas.drawString(18 * mm, 8 * mm, f'Generated {timezone.now().strftime("%Y-%m-%d %H:%M")}')
    canvas.drawRightString(width - 18 * mm, 8 * mm, f'Page {doc.page}')
    canvas.restoreState()


def build_dashboard_report_pdf(stats: dict, *, title: str, scope: str) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=24 * mm,
        bottomMargin=20 * mm,
        title=title,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor(TEXT_DARK),
        spaceAfter=6,
        leading=24,
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor(TEXT_MUTED),
        spaceAfter=4,
        leading=14,
    )
    meta_style = ParagraphStyle(
        'ReportMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor(BRAND_BLUE),
        spaceAfter=2,
        leading=12,
    )

    story: list = []
    story.append(Paragraph(title, title_style))
    story.append(Paragraph('Traffic Enforcement Analytics Summary', subtitle_style))
    story.append(Paragraph(f'Scope: {scope}', meta_style))
    story.append(Paragraph(f'Reporting period: {timezone.now().strftime("%B %Y")}', meta_style))
    story.append(Spacer(1, 10))

    story.append(_section_title('Executive Summary'))
    kpi_data = _kpi_table(stats)
    kpi_table = Table(kpi_data, colWidths=[42 * mm, 38 * mm, 42 * mm, 38 * mm])
    kpi_table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFFFF')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
                ('FONTNAME', (2, 0), (2, -1), 'Helvetica'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
                ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor(TEXT_MUTED)),
                ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor(TEXT_MUTED)),
                ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor(TEXT_DARK)),
                ('TEXTCOLOR', (3, 0), (3, -1), colors.HexColor(TEXT_DARK)),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor(BORDER)),
                ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor(BORDER)),
                ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor(HEADER_BG), colors.white]),
                ('TOPPADDING', (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]
        )
    )
    story.append(kpi_table)
    story.append(Spacer(1, 8))

    story.append(_section_title('Monthly Fine Volume'))
    monthly = stats.get('monthly_fines') or []
    if monthly:
        monthly_rows = [
            [
                str(row.get('month', '')),
                str(row.get('count', 0)),
                _fmt_currency(row.get('revenue', 0)),
            ]
            for row in monthly
        ]
        story.append(_data_table(['Month', 'Fines Issued', 'Revenue'], monthly_rows))
    else:
        story.append(Paragraph('No monthly fine data available for this period.', subtitle_style))

    story.append(_section_title('Top Violation Types'))
    violations = stats.get('violation_by_type') or []
    if violations:
        violation_rows = [
            [str(row.get('violation_type', 'Unknown')), str(row.get('count', 0))]
            for row in violations[:10]
        ]
        story.append(_data_table(['Violation Type', 'Count'], violation_rows))
    else:
        story.append(Paragraph('No violation breakdown data available.', subtitle_style))

    story.append(_section_title('Top Fine Reasons'))
    reasons = stats.get('fine_by_reason') or []
    if reasons:
        reason_rows = [
            [str(row.get('reason', 'Other')), str(row.get('count', 0))]
            for row in reasons[:10]
        ]
        story.append(_data_table(['Reason', 'Count'], reason_rows))
    else:
        story.append(Paragraph('No fine reason breakdown data available.', subtitle_style))

    story.append(Spacer(1, 16))
    footer_note = ParagraphStyle(
        'FooterNote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        textColor=colors.HexColor(TEXT_MUTED),
        alignment=TA_LEFT,
    )
    story.append(
        Paragraph(
            'This report was generated automatically by CamTraffic. Figures reflect data available at export time.',
            footer_note,
        )
    )

    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, title=title),
        onLaterPages=lambda c, d: _header_footer(c, d, title=title),
    )
    buffer.seek(0)
    return buffer.getvalue()
