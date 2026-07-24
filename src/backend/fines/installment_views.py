"""
API views for Payment Installment System
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsDriver
from fines.models import Fine
from fines.installments import InstallmentService, InstallmentPlan, InstallmentPayment


class CreateInstallmentPlanView(APIView):
    """
    Create installment plan for a fine
    
    POST /api/fines/<fine_id>/installments/create/
    Body: {
        "num_installments": 6,
        "payment_day_of_month": 1
    }
    """
    permission_classes = [IsAuthenticated, IsDriver]
    
    def post(self, request, fine_id):
        # Get fine
        try:
            fine = Fine.objects.get(id=fine_id)
        except Fine.DoesNotExist:
            return Response(
                {'error': 'Fine not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check ownership
        if fine.driver_id != request.user.id:
            return Response(
                {'error': 'You do not have permission to create installment plan for this fine'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parse request data
        num_installments = request.data.get('num_installments', 6)
        payment_day = request.data.get('payment_day_of_month', 1)
        
        # Create plan
        result = InstallmentService.create_installment_plan(
            fine=fine,
            num_installments=int(num_installments),
            payment_day_of_month=int(payment_day),
        )
        
        if not result['success']:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        plan = result['plan']
        
        # Return plan details
        return Response({
            'success': True,
            'plan': {
                'id': str(plan.id),
                'fine_id': str(plan.fine_id),
                'total_amount': float(plan.total_amount),
                'num_installments': plan.num_installments,
                'installment_amount': float(plan.installment_amount),
                'start_date': plan.start_date.isoformat(),
                'end_date': plan.end_date.isoformat(),
                'status': plan.status,
            },
            'breakdown': result['breakdown'],
            'next_payment': self._format_payment(InstallmentService.get_next_payment(plan)),
        }, status=status.HTTP_201_CREATED)
    
    def _format_payment(self, payment):
        """Format payment for response"""
        if not payment:
            return None
        
        return {
            'id': str(payment.id),
            'installment_number': payment.installment_number,
            'amount': float(payment.amount),
            'due_date': payment.due_date.isoformat(),
            'status': payment.status,
            'late_fee': float(payment.late_fee) if payment.late_fee else 0,
        }


class GetInstallmentPlanView(APIView):
    """
    Get installment plan details
    
    GET /api/fines/<fine_id>/installments/
    """
    permission_classes = [IsAuthenticated, IsDriver]
    
    def get(self, request, fine_id):
        # Get fine
        try:
            fine = Fine.objects.get(id=fine_id)
        except Fine.DoesNotExist:
            return Response(
                {'error': 'Fine not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check ownership
        if fine.driver_id != request.user.id:
            return Response(
                {'error': 'You do not have permission to view this installment plan'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get plan
        if not hasattr(fine, 'installment_plan'):
            return Response(
                {'error': 'No installment plan found for this fine'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        plan = fine.installment_plan
        payments = plan.payments.all().order_by('installment_number')
        
        return Response({
            'plan': {
                'id': str(plan.id),
                'fine_id': str(plan.fine_id),
                'total_amount': float(plan.total_amount),
                'paid_amount': float(plan.paid_amount),
                'remaining_amount': float(plan.remaining_amount),
                'num_installments': plan.num_installments,
                'installment_amount': float(plan.installment_amount),
                'start_date': plan.start_date.isoformat(),
                'end_date': plan.end_date.isoformat(),
                'payment_day_of_month': plan.payment_day_of_month,
                'status': plan.status,
                'interest_rate': float(plan.interest_rate),
                'setup_fee': float(plan.setup_fee),
            },
            'payments': [
                {
                    'id': str(p.id),
                    'installment_number': p.installment_number,
                    'amount': float(p.amount),
                    'due_date': p.due_date.isoformat(),
                    'status': p.status,
                    'paid_at': p.paid_at.isoformat() if p.paid_at else None,
                    'paid_amount': float(p.paid_amount),
                    'late_fee': float(p.late_fee),
                    'days_overdue': p.days_overdue,
                    'payment_method': p.payment_method,
                }
                for p in payments
            ],
            'next_payment': self._get_next_payment_info(plan),
            'summary': {
                'paid_count': payments.filter(status='paid').count(),
                'pending_count': payments.filter(status='pending').count(),
                'overdue_count': payments.filter(status='overdue').count(),
                'total_late_fees': float(sum(p.late_fee for p in payments)),
            },
        })
    
    def _get_next_payment_info(self, plan):
        """Get next payment information"""
        next_payment = InstallmentService.get_next_payment(plan)
        
        if not next_payment:
            return None
        
        return {
            'id': str(next_payment.id),
            'installment_number': next_payment.installment_number,
            'amount': float(next_payment.amount),
            'due_date': next_payment.due_date.isoformat(),
            'status': next_payment.status,
            'late_fee': float(next_payment.late_fee) if next_payment.late_fee else 0,
            'total_due': float(next_payment.amount + next_payment.late_fee),
        }


class PayInstallmentView(APIView):
    """
    Pay an installment
    
    POST /api/installments/<payment_id>/pay/
    Body: {
        "amount": 25.00,
        "payment_method": "khqr",
        "payment_reference": "TXN123456"
    }
    """
    permission_classes = [IsAuthenticated, IsDriver]
    
    def post(self, request, payment_id):
        # Get payment
        try:
            payment = InstallmentPayment.objects.select_related('plan', 'plan__fine').get(id=payment_id)
        except InstallmentPayment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check ownership
        if payment.plan.fine.driver_id != request.user.id:
            return Response(
                {'error': 'You do not have permission to pay this installment'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parse payment data
        amount = Decimal(str(request.data.get('amount', 0)))
        payment_method = request.data.get('payment_method', 'unknown')
        payment_reference = request.data.get('payment_reference', '')
        
        # Process payment
        result = InstallmentService.process_installment_payment(
            payment_id=str(payment_id),
            amount=amount,
            payment_method=payment_method,
            payment_reference=payment_reference,
        )
        
        if not result['success']:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'success': True,
            'message': 'Payment processed successfully',
            'payment': {
                'installment_number': result['payment'].installment_number,
                'amount_paid': float(result['payment'].paid_amount),
                'paid_at': result['payment'].paid_at.isoformat(),
            },
            'plan': {
                'status': result['plan_status'],
                'remaining_installments': result['remaining_installments'],
                'remaining_amount': result['remaining_amount'],
            },
        })


class GetDriverInstallmentsView(APIView):
    """
    Get all installment plans for current driver
    
    GET /api/driver/installments/
    """
    permission_classes = [IsAuthenticated, IsDriver]
    
    def get(self, request):
        # Get all fines with installment plans for this driver
        plans = InstallmentPlan.objects.filter(
            fine__driver_id=request.user.id
        ).select_related('fine').prefetch_related('payments').order_by('-created_at')
        
        return Response({
            'plans': [
                {
                    'id': str(plan.id),
                    'fine_id': str(plan.fine_id),
                    'fine_reason': plan.fine.reason,
                    'total_amount': float(plan.total_amount),
                    'paid_amount': float(plan.paid_amount),
                    'remaining_amount': float(plan.remaining_amount),
                    'num_installments': plan.num_installments,
                    'status': plan.status,
                    'next_due_date': self._get_next_due_date(plan),
                    'progress_percentage': (float(plan.paid_amount) / float(plan.total_amount) * 100) if plan.total_amount > 0 else 0,
                }
                for plan in plans
            ],
            'summary': {
                'total_plans': plans.count(),
                'active_plans': plans.filter(status='active').count(),
                'completed_plans': plans.filter(status='completed').count(),
                'defaulted_plans': plans.filter(status='defaulted').count(),
                'total_remaining': float(sum(p.remaining_amount for p in plans.filter(status='active'))),
            },
        })
    
    def _get_next_due_date(self, plan):
        """Get next payment due date"""
        next_payment = InstallmentService.get_next_payment(plan)
        return next_payment.due_date.isoformat() if next_payment else None


class CalculateInstallmentQuoteView(APIView):
    """
    Calculate installment quote without creating plan
    
    POST /api/fines/<fine_id>/installments/quote/
    Body: { "num_installments": 6 }
    """
    permission_classes = [IsAuthenticated, IsDriver]
    
    def post(self, request, fine_id):
        # Get fine
        try:
            fine = Fine.objects.get(id=fine_id)
        except Fine.DoesNotExist:
            return Response(
                {'error': 'Fine not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check ownership
        if fine.driver_id != request.user.id:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        num_installments = int(request.data.get('num_installments', 6))
        
        # Calculate quote
        if not InstallmentService.MIN_INSTALLMENTS <= num_installments <= InstallmentService.MAX_INSTALLMENTS:
            return Response(
                {'error': f'Number of installments must be between {InstallmentService.MIN_INSTALLMENTS} and {InstallmentService.MAX_INSTALLMENTS}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        base_amount = fine.amount
        interest_amount = base_amount * InstallmentService.INTEREST_RATE / Decimal('100') * num_installments
        total_with_interest = base_amount + interest_amount + InstallmentService.SETUP_FEE
        installment_amount = (total_with_interest / num_installments).quantize(Decimal('0.01'))
        
        return Response({
            'quote': {
                'original_amount': float(base_amount),
                'num_installments': num_installments,
                'installment_amount': float(installment_amount),
                'interest_rate': float(InstallmentService.INTEREST_RATE),
                'total_interest': float(interest_amount),
                'setup_fee': float(InstallmentService.SETUP_FEE),
                'total_amount': float(total_with_interest),
                'savings_vs_late_fees': 'Avoid accumulating daily late fees by choosing installments',
            },
            'options': [
                self._calculate_option(base_amount, n)
                for n in [3, 6, 9, 12]
                if InstallmentService.MIN_INSTALLMENTS <= n <= InstallmentService.MAX_INSTALLMENTS
            ],
        })
    
    def _calculate_option(self, base_amount, num_installments):
        """Calculate installment option"""
        interest_amount = base_amount * InstallmentService.INTEREST_RATE / Decimal('100') * num_installments
        total = base_amount + interest_amount + InstallmentService.SETUP_FEE
        installment = (total / num_installments).quantize(Decimal('0.01'))
        
        return {
            'num_installments': num_installments,
            'installment_amount': float(installment),
            'total_amount': float(total),
        }
