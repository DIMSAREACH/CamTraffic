"""
PDF Receipt Download API Endpoints
"""
from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsDriver, IsPoliceOrAdmin
from fines.models import Fine
from fines.pdf_receipt import generate_fine_receipt_pdf


class DownloadFineReceiptView(APIView):
    """
    Download PDF receipt for a fine
    
    GET /api/fines/<fine_id>/receipt/pdf/
    Query params:
        - include_evidence: boolean (default: false)

    Drivers: own fines only. Officers/admins: any fine (enforcement copy).
    """
    permission_classes = [IsAuthenticated, IsDriver | IsPoliceOrAdmin]
    
    def get(self, request, fine_id):
        # Get fine
        try:
            fine = Fine.objects.select_related(
                'driver', 'police', 'violation', 'violation__camera', 'violation__vehicle',
            ).get(id=fine_id)
        except Fine.DoesNotExist:
            return Response(
                {'error': 'Fine not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        role = getattr(request.user, 'role', None)
        if role == 'driver' and fine.driver_id != request.user.id:
            return Response(
                {'error': 'You do not have permission to access this receipt'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if fine is paid (optional - can allow unpaid receipts too)
        # if fine.status != 'paid':
        #     return Response(
        #         {'error': 'Receipt only available for paid fines'},
        #         status=status.HTTP_400_BAD_REQUEST
        #     )
        
        # Parse query params
        include_evidence = request.query_params.get('include_evidence', 'false').lower() == 'true'
        
        # Generate PDF
        try:
            pdf_bytes = generate_fine_receipt_pdf(fine, include_evidence=include_evidence)
        except Exception as e:
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Return as downloadable file
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        filename = f'fine_receipt_{fine.id}.pdf'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(pdf_bytes)
        
        return response


class DownloadMultipleFineReceiptsView(APIView):
    """
    Download combined PDF receipt for multiple fines
    
    POST /api/fines/receipts/pdf/
    Body: { "fine_ids": ["uuid1", "uuid2", ...] }
    """
    permission_classes = [IsAuthenticated, IsDriver | IsPoliceOrAdmin]
    
    def post(self, request):
        fine_ids = request.data.get('fine_ids', [])
        
        if not fine_ids or not isinstance(fine_ids, list):
            return Response(
                {'error': 'fine_ids must be a non-empty array'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Limit to 10 fines per request
        if len(fine_ids) > 10:
            return Response(
                {'error': 'Maximum 10 fines per request'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get fines — drivers: own only; officers/admins: any requested ids
        role = getattr(request.user, 'role', None)
        qs = Fine.objects.filter(id__in=fine_ids).select_related(
            'driver', 'police', 'violation', 'violation__camera', 'violation__vehicle',
        )
        if role == 'driver':
            qs = qs.filter(driver_id=request.user.id)
        fines = qs

        if not fines.exists():
            return Response(
                {'error': 'No accessible fines found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate combined PDF
        try:
            from reportlab.platypus import SimpleDocTemplate, PageBreak
            import io
            
            buffer = io.BytesIO()
            # Note: For simplicity, we'll generate separate PDFs and merge
            # In production, consider using PyPDF2 for proper merging
            
            pdf_bytes = generate_fine_receipt_pdf(fines.first())
            
            # For now, return first fine's receipt
            # TODO: Implement proper multi-page PDF merging
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="fines_receipt_{len(fines)}_items.pdf"'
        response['Content-Length'] = len(pdf_bytes)
        
        return response
