"""
Professional PDF Receipt Generation for Fines
Using ReportLab with government-style formatting
"""
import io
import logging
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.platypus import (
    Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

logger = logging.getLogger(__name__)


class FineReceiptPDF:
    """Professional PDF receipt generator for traffic fines"""
    
    def __init__(self, fine, include_evidence: bool = False):
        self.fine = fine
        self.include_evidence = include_evidence
        self.buffer = io.BytesIO()
        self.styles = getSampleStyleSheet()
        self._add_custom_styles()
    
    def _add_custom_styles(self):
        """Add custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='Header',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1E40AF'),
            spaceAfter=20,
            alignment=1,  # Center
            fontName='Helvetica-Bold',
        ))
        
        self.styles.add(ParagraphStyle(
            name='SubHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#475569'),
            spaceAfter=12,
            fontName='Helvetica-Bold',
        ))
        
        self.styles.add(ParagraphStyle(
            name='FieldLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=2,
            fontName='Helvetica-Bold',
        ))
        
        self.styles.add(ParagraphStyle(
            name='FieldValue',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=10,
            fontName='Helvetica',
        ))
        
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#94A3B8'),
            alignment=1,  # Center
            fontName='Helvetica',
        ))
    
    def generate(self) -> bytes:
        """Generate PDF and return as bytes"""
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            rightMargin=30*mm,
            leftMargin=30*mm,
            topMargin=20*mm,
            bottomMargin=20*mm,
            title=f'Fine Receipt - {self.fine.id}',
            author='CamTraffic System',
            subject='Traffic Fine Receipt',
        )
        
        story = []
        
        # Header
        story.append(self._create_header())
        story.append(Spacer(1, 10*mm))
        
        # Receipt info
        story.append(self._create_receipt_info())
        story.append(Spacer(1, 8*mm))
        
        # Fine details table
        story.append(self._create_fine_details())
        story.append(Spacer(1, 8*mm))
        
        # Payment info (if paid)
        if self.fine.status == 'paid' and self.fine.paid_at:
            story.append(self._create_payment_info())
            story.append(Spacer(1, 8*mm))
        
        # Violation details (if linked)
        if self.fine.violation_id:
            story.append(self._create_violation_details())
            story.append(Spacer(1, 8*mm))
        
        # Evidence images (if requested and available)
        if self.include_evidence:
            evidence_section = self._create_evidence_section()
            if evidence_section:
                story.append(evidence_section)
                story.append(Spacer(1, 8*mm))
        
        # Legal notice
        story.append(self._create_legal_notice())
        story.append(Spacer(1, 6*mm))
        
        # Footer
        story.append(self._create_footer())
        
        # Build PDF
        doc.build(story, onFirstPage=self._add_watermark, onLaterPages=self._add_watermark)
        
        # Get PDF bytes
        pdf_bytes = self.buffer.getvalue()
        self.buffer.close()
        
        return pdf_bytes
    
    def _create_header(self):
        """Create document header"""
        data = [
            [Paragraph('<b>Royal Government of Cambodia</b>', self.styles['Header'])],
            [Paragraph('Ministry of Public Works and Transport', self.styles['Normal'])],
            [Paragraph('<b>CamTraffic Digital Enforcement System</b>', self.styles['SubHeader'])],
            [Paragraph('Traffic Fine Official Receipt', self.styles['Heading2'])],
        ]
        
        table = Table(data, colWidths=[doc_width := 150*mm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1E40AF')),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 12),
        ]))
        
        return table
    
    def _create_receipt_info(self):
        """Create receipt information section"""
        data = [
            ['Receipt No:', f'<b>{self.fine.id}</b>'],
            ['Issue Date:', self.fine.created_at.strftime('%B %d, %Y at %I:%M %p')],
            ['Status:', f'<b>{self.fine.status.upper()}</b>'],
        ]
        
        if self.fine.status == 'paid' and self.fine.paid_at:
            data.append(['Paid Date:', self.fine.paid_at.strftime('%B %d, %Y at %I:%M %p')])
        
        table = Table(data, colWidths=[40*mm, 110*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        return table
    
    def _create_fine_details(self):
        """Create fine details table"""
        # Calculate total
        amount = float(self.fine.amount)
        
        data = [
            [Paragraph('<b>Driver Information</b>', self.styles['SubHeader'])],
            ['Full Name:', self.fine.driver.full_name],
            ['License No:', self.fine.driver.license_no or 'N/A'],
            ['Phone:', self.fine.driver.phone or 'N/A'],
            ['', ''],  # Spacer
            [Paragraph('<b>Fine Details</b>', self.styles['SubHeader'])],
            ['Violation:', self.fine.reason],
            ['Location:', self.fine.location],
            ['Vehicle Plate:', self.fine.vehicle_plate or 'N/A'],
            ['', ''],  # Spacer
            [Paragraph('<b>Amount Breakdown</b>', self.styles['SubHeader'])],
            ['Base Fine Amount:', f'${amount:.2f} USD'],
            ['', f'{amount * 4100:.0f} KHR'],
            ['Processing Fee:', '$0.00 USD'],
            ['', ''],  # Separator
            [Paragraph('<b>TOTAL AMOUNT DUE</b>', self.styles['SubHeader']), 
             Paragraph(f'<b>${amount:.2f} USD</b><br/><b>{amount * 4100:.0f} KHR</b>', self.styles['SubHeader'])],
        ]
        
        table = Table(data, colWidths=[70*mm, 80*mm])
        table.setStyle(TableStyle([
            ('SPAN', (0, 0), (1, 0)),  # Header spans
            ('SPAN', (0, 5), (1, 5)),
            ('SPAN', (0, 10), (1, 10)),
            ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#DBEAFE')),
            ('BACKGROUND', (0, 5), (1, 5), colors.HexColor('#DBEAFE')),
            ('BACKGROUND', (0, 10), (1, 10), colors.HexColor('#DBEAFE')),
            ('BACKGROUND', (0, -1), (1, -1), colors.HexColor('#1E40AF')),
            ('TEXTCOLOR', (0, -1), (1, -1), colors.white),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 1), (-1, -2), 0.5, colors.HexColor('#CBD5E1')),
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#3B82F6')),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#1E40AF')),
        ]))
        
        return table
    
    def _create_payment_info(self):
        """Create payment information section"""
        data = [
            [Paragraph('<b>Payment Information</b>', self.styles['SubHeader'])],
            ['Payment Method:', self.fine.payment_method or 'N/A'],
            ['Transaction Reference:', self.fine.payment_reference or 'N/A'],
            ['Payment Date:', self.fine.paid_at.strftime('%B %d, %Y at %I:%M %p') if self.fine.paid_at else 'N/A'],
            ['Processed By:', self.fine.police.full_name if self.fine.police_id else 'System'],
        ]
        
        table = Table(data, colWidths=[50*mm, 100*mm])
        table.setStyle(TableStyle([
            ('SPAN', (0, 0), (1, 0)),
            ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#D1FAE5')),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#F1F5F9')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        
        return table
    
    def _create_violation_details(self):
        """Create violation details if linked"""
        violation = self.fine.violation
        
        data = [
            [Paragraph('<b>Violation Details</b>', self.styles['SubHeader'])],
            ['Violation Type:', violation.violation_type.replace('_', ' ').title()],
            ['Detected Sign:', violation.detected_sign_code or 'N/A'],
            ['Observed Action:', violation.observed_action.replace('_', ' ').title()],
            ['Camera:', violation.camera.name if violation.camera_id else 'N/A'],
            ['Detection Date:', violation.violation_date.strftime('%B %d, %Y at %I:%M %p')],
        ]
        
        if violation.ai_confidence_score:
            data.append(['AI Confidence:', f'{float(violation.ai_confidence_score) * 100:.1f}%'])
        
        table = Table(data, colWidths=[50*mm, 100*mm])
        table.setStyle(TableStyle([
            ('SPAN', (0, 0), (1, 0)),
            ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#FEF3C7')),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#F1F5F9')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        
        return table
    
    def _create_evidence_section(self):
        """Create evidence images section"""
        images = []
        
        if self.fine.evidence_image:
            images.append(self.fine.evidence_image)
        
        if self.fine.violation_id:
            violation = self.fine.violation
            if violation.evidence_image:
                images.append(violation.evidence_image)
            if violation.plate_evidence_image:
                images.append(violation.plate_evidence_image)
        
        if not images:
            return None
        
        # Create table with image thumbnails
        data = [[Paragraph('<b>Evidence Photos</b>', self.styles['SubHeader'])]]
        
        for img_path in images[:3]:  # Max 3 images
            try:
                # In production, load from media storage
                # For now, just show placeholder
                data.append([Paragraph(f'<i>Evidence Image: {img_path.name}</i>', self.styles['Normal'])])
            except Exception as e:
                logger.warning(f'Could not load evidence image: {e}')
        
        table = Table(data, colWidths=[150*mm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#EDE9FE')),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        
        return table
    
    def _create_legal_notice(self):
        """Create legal notice and disclaimer"""
        text = """
        <b>Important Notice:</b><br/>
        This receipt is issued under the Cambodia Land Traffic Law and Road Traffic Regulations. 
        Payment of this fine does not waive your right to appeal. Appeals must be submitted within 
        30 days of the issuance date. For questions or to submit an appeal, please visit our 
        online portal or contact your local traffic office.<br/><br/>
        
        <b>Payment Options:</b><br/>
        • Online: www.camtraffic.gov.kh/citizen/fines<br/>
        • KHQR: Scan QR code at any bank or payment app<br/>
        • Bank Transfer: See payment instructions on website<br/>
        • Cash: Visit authorized payment centers<br/><br/>
        
        <b>For Inquiries:</b><br/>
        Email: support@camtraffic.gov.kh | Phone: 023 XXX XXX
        """
        
        return Paragraph(text, self.styles['Normal'])
    
    def _create_footer(self):
        """Create document footer"""
        footer_text = f"""
        <i>This is an official computer-generated receipt. No signature required.</i><br/>
        Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>
        CamTraffic Digital Enforcement System © {datetime.now().year} Royal Government of Cambodia
        """
        
        return Paragraph(footer_text, self.styles['Footer'])
    
    def _add_watermark(self, canvas_obj, doc):
        """Add watermark to each page"""
        canvas_obj.saveState()
        
        # Add "PAID" watermark if paid
        if self.fine.status == 'paid':
            canvas_obj.setFillColor(colors.Color(0.1, 0.8, 0.1, alpha=0.1))
            canvas_obj.setFont('Helvetica-Bold', 120)
            canvas_obj.translate(A4[0]/2, A4[1]/2)
            canvas_obj.rotate(45)
            canvas_obj.drawCentredString(0, 0, 'PAID')
        
        # Add page number
        page_num = canvas_obj.getPageNumber()
        text = f"Page {page_num}"
        canvas_obj.setFillColor(colors.grey)
        canvas_obj.setFont('Helvetica', 9)
        canvas_obj.drawRightString(A4[0] - 30*mm, 15*mm, text)
        
        canvas_obj.restoreState()


def generate_fine_receipt_pdf(fine, include_evidence: bool = False) -> bytes:
    """
    Generate PDF receipt for a fine
    
    Args:
        fine: Fine object
        include_evidence: Whether to include evidence images
    
    Returns:
        bytes: PDF content
    """
    generator = FineReceiptPDF(fine, include_evidence=include_evidence)
    return generator.generate()
