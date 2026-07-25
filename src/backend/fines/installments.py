"""
Payment Installment System for Fines
Allows drivers to pay fines in multiple installments
"""
from decimal import Decimal
from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from core.models import TimeStampedUUIDModel


class InstallmentPlan(TimeStampedUUIDModel):
    """Payment installment plan for a fine"""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('defaulted', 'Defaulted'),
        ('cancelled', 'Cancelled'),
    ]
    
    fine = models.OneToOneField(
        'fines.Fine',
        on_delete=models.CASCADE,
        related_name='installment_plan'
    )
    
    # Plan details
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    num_installments = models.IntegerField()
    installment_amount = models.DecimalField(max_digits=10, decimal_places=2)
    final_installment_amount = models.DecimalField(max_digits=10, decimal_places=2)  # May differ due to rounding
    
    # Interest/fees
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))  # % per installment
    setup_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Schedule
    start_date = models.DateField()
    end_date = models.DateField()
    payment_day_of_month = models.IntegerField(default=1)  # Day of month for payments
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    completed_at = models.DateTimeField(null=True, blank=True)
    defaulted_at = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    remaining_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'installment_plans'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['fine', 'status'], name='idx_installment_fine_status'),
            models.Index(fields=['status', 'end_date'], name='idx_installment_status_end'),
        ]
    
    def __str__(self):
        return f'Installment Plan for Fine {self.fine.id} - {self.num_installments} payments'
    
    def save(self, *args, **kwargs):
        # Calculate remaining amount
        self.remaining_amount = self.total_amount - self.paid_amount
        super().save(*args, **kwargs)


class InstallmentPayment(TimeStampedUUIDModel):
    """Individual installment payment record"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('skipped', 'Skipped'),
    ]
    
    plan = models.ForeignKey(
        InstallmentPlan,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    
    # Payment details
    installment_number = models.IntegerField()  # 1, 2, 3, etc.
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Payment gateway info
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=255, blank=True)
    
    # Late fees
    late_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    days_overdue = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'installment_payments'
        ordering = ['installment_number']
        indexes = [
            models.Index(fields=['plan', 'installment_number'], name='idx_installment_plan_num'),
            models.Index(fields=['status', 'due_date'], name='idx_installment_status_due'),
        ]
        unique_together = [['plan', 'installment_number']]
    
    def __str__(self):
        return f'Payment {self.installment_number} for Plan {self.plan.id} - {self.status}'
    
    @property
    def is_overdue(self):
        """Check if payment is overdue"""
        if self.status == 'paid':
            return False
        return timezone.now().date() > self.due_date


class InstallmentService:
    """Service for managing installment plans"""
    
    # Configuration
    MIN_INSTALLMENTS = 2
    MAX_INSTALLMENTS = 12
    MIN_FINE_AMOUNT = Decimal('50.00')  # Minimum fine amount to qualify for installments
    INTEREST_RATE = Decimal('2.00')  # 2% per installment (configurable)
    SETUP_FEE = Decimal('5.00')  # Setup fee (configurable)
    LATE_FEE_PER_DAY = Decimal('1.00')  # Late fee per day
    
    @classmethod
    def create_installment_plan(
        cls,
        fine,
        num_installments: int,
        start_date=None,
        payment_day_of_month: int = 1,
    ) -> dict:
        """
        Create an installment plan for a fine
        
        Args:
            fine: Fine object
            num_installments: Number of installments (2-12)
            start_date: First payment date (default: next month)
            payment_day_of_month: Day of month for payments (1-28)
        
        Returns:
            dict with success status and plan/errors
        """
        # Validation
        if fine.status == 'paid':
            return {'success': False, 'error': 'Fine is already paid'}
        
        if hasattr(fine, 'installment_plan') and fine.installment_plan:
            return {'success': False, 'error': 'Installment plan already exists'}
        
        if fine.amount < cls.MIN_FINE_AMOUNT:
            return {
                'success': False,
                'error': f'Fine amount must be at least ${cls.MIN_FINE_AMOUNT} USD for installments'
            }
        
        if not cls.MIN_INSTALLMENTS <= num_installments <= cls.MAX_INSTALLMENTS:
            return {
                'success': False,
                'error': f'Number of installments must be between {cls.MIN_INSTALLMENTS} and {cls.MAX_INSTALLMENTS}'
            }
        
        if not 1 <= payment_day_of_month <= 28:
            return {'success': False, 'error': 'Payment day must be between 1 and 28'}
        
        # Calculate dates
        if not start_date:
            from dateutil.relativedelta import relativedelta
            start_date = (timezone.now().date() + relativedelta(months=1)).replace(day=payment_day_of_month)
        
        # Calculate installment amounts
        base_amount = fine.amount
        interest_amount = base_amount * cls.INTEREST_RATE / Decimal('100') * num_installments
        total_with_interest = base_amount + interest_amount + cls.SETUP_FEE
        
        installment_amount = (total_with_interest / num_installments).quantize(Decimal('0.01'))
        final_amount = total_with_interest - (installment_amount * (num_installments - 1))
        
        # Calculate end date
        from dateutil.relativedelta import relativedelta
        end_date = start_date + relativedelta(months=num_installments - 1)
        
        try:
            with transaction.atomic():
                # Create plan
                plan = InstallmentPlan.objects.create(
                    fine=fine,
                    total_amount=total_with_interest,
                    num_installments=num_installments,
                    installment_amount=installment_amount,
                    final_installment_amount=final_amount,
                    interest_rate=cls.INTEREST_RATE,
                    setup_fee=cls.SETUP_FEE,
                    start_date=start_date,
                    end_date=end_date,
                    payment_day_of_month=payment_day_of_month,
                    remaining_amount=total_with_interest,
                )
                
                # Create installment payment records
                current_date = start_date
                for i in range(1, num_installments + 1):
                    amount = final_amount if i == num_installments else installment_amount
                    
                    InstallmentPayment.objects.create(
                        plan=plan,
                        installment_number=i,
                        amount=amount,
                        due_date=current_date,
                    )
                    
                    # Move to next month
                    current_date = current_date + relativedelta(months=1)
                    # Ensure we stay on the same day of month
                    current_date = current_date.replace(day=payment_day_of_month)
                
                # Update fine status
                fine.status = 'installment'
                fine.save()
                
                return {
                    'success': True,
                    'plan': plan,
                    'breakdown': {
                        'original_amount': float(base_amount),
                        'interest': float(interest_amount),
                        'setup_fee': float(cls.SETUP_FEE),
                        'total_amount': float(total_with_interest),
                        'installment_amount': float(installment_amount),
                        'final_installment': float(final_amount),
                        'num_installments': num_installments,
                        'interest_rate': float(cls.INTEREST_RATE),
                    },
                }
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def process_installment_payment(
        cls,
        payment_id: str,
        amount: Decimal,
        payment_method: str,
        payment_reference: str = '',
    ) -> dict:
        """
        Process an installment payment
        
        Args:
            payment_id: InstallmentPayment ID
            amount: Amount paid
            payment_method: Payment method used
            payment_reference: Payment reference/transaction ID
        
        Returns:
            dict with success status
        """
        try:
            with transaction.atomic():
                payment = InstallmentPayment.objects.select_related('plan', 'plan__fine').get(id=payment_id)
                plan = payment.plan
                
                if payment.status == 'paid':
                    return {'success': False, 'error': 'Payment already processed'}
                
                # Calculate late fee if overdue
                late_fee = Decimal('0.00')
                if payment.is_overdue:
                    days_overdue = (timezone.now().date() - payment.due_date).days
                    late_fee = cls.LATE_FEE_PER_DAY * days_overdue
                    payment.late_fee = late_fee
                    payment.days_overdue = days_overdue
                
                total_due = payment.amount + late_fee
                
                if amount < total_due:
                    return {
                        'success': False,
                        'error': f'Insufficient payment. Amount due: ${total_due} USD (including ${late_fee} late fee)'
                    }
                
                # Mark payment as paid
                payment.status = 'paid'
                payment.paid_at = timezone.now()
                payment.paid_amount = amount
                payment.payment_method = payment_method
                payment.payment_reference = payment_reference
                payment.save()
                
                # Update plan
                plan.paid_amount += amount
                plan.remaining_amount = plan.total_amount - plan.paid_amount
                
                # Check if plan is completed
                remaining_payments = plan.payments.filter(status='pending').count()
                if remaining_payments == 0:
                    plan.status = 'completed'
                    plan.completed_at = timezone.now()
                    
                    # Mark fine as paid
                    plan.fine.status = 'paid'
                    plan.fine.paid_at = timezone.now()
                    plan.fine.payment_method = 'installment'
                    plan.fine.payment_reference = f'Installment Plan {plan.id}'
                    plan.fine.save()
                
                plan.save()
                
                return {
                    'success': True,
                    'payment': payment,
                    'plan_status': plan.status,
                    'remaining_installments': remaining_payments,
                    'remaining_amount': float(plan.remaining_amount),
                }
        
        except InstallmentPayment.DoesNotExist:
            return {'success': False, 'error': 'Payment not found'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def check_overdue_payments(cls):
        """
        Check for overdue payments and update statuses
        Should be run daily via Celery task
        """
        from django.db.models import Q
        
        today = timezone.now().date()
        
        # Get pending payments that are overdue
        overdue_payments = InstallmentPayment.objects.filter(
            status='pending',
            due_date__lt=today
        ).select_related('plan', 'plan__fine')
        
        updated_count = 0
        defaulted_plans = []
        
        for payment in overdue_payments:
            # Mark as overdue
            payment.status = 'overdue'
            days_overdue = (today - payment.due_date).days
            payment.days_overdue = days_overdue
            payment.late_fee = cls.LATE_FEE_PER_DAY * days_overdue
            payment.save()
            
            updated_count += 1
            
            # Check if plan should be defaulted (e.g., 30+ days overdue on any payment)
            if days_overdue >= 30:
                plan = payment.plan
                if plan.status == 'active':
                    plan.status = 'defaulted'
                    plan.defaulted_at = timezone.now()
                    plan.save()
                    
                    # Update fine status
                    plan.fine.status = 'overdue'
                    plan.fine.save()
                    
                    defaulted_plans.append(plan.id)
        
        return {
            'overdue_payments_updated': updated_count,
            'defaulted_plans': len(defaulted_plans),
            'plan_ids': defaulted_plans,
        }
    
    @classmethod
    def get_next_payment(cls, plan: InstallmentPlan):
        """Get the next pending payment for a plan"""
        return plan.payments.filter(
            status__in=['pending', 'overdue']
        ).order_by('installment_number').first()
    
    @classmethod
    def calculate_early_payoff_amount(cls, plan: InstallmentPlan) -> Decimal:
        """
        Calculate amount to pay off all remaining installments early
        May include discount for early payoff
        """
        remaining = plan.remaining_amount
        
        # Optional: Give 50% discount on remaining interest for early payoff
        # For now, return full remaining amount
        return remaining
