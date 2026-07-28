"""Email notification service for CamTraffic system."""
from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailNotificationService:
    """Service for sending email notifications to users."""
    
    @staticmethod
    def send_violation_notification(violation) -> bool:
        """
        Send email notification when a new violation is created.
        
        Args:
            violation: TrafficViolation instance
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            driver_email = violation.driver.user.email
            if not driver_email:
                logger.warning(f'No email for driver {violation.driver.user.id}')
                return False
            
            context = {
                'driver_name': violation.driver.user.full_name,
                'violation_type': violation.get_violation_type_display() if hasattr(violation, 'get_violation_type_display') else violation.violation_type,
                'violation_date': violation.violation_date,
                'location': violation.location,
                'description': violation.description,
                'view_url': f'{settings.FRONTEND_URL}/violations/{violation.id}' if hasattr(settings, 'FRONTEND_URL') else '#',
            }
            
            # Render email templates
            html_content = render_to_string('emails/violation_notification.html', context)
            text_content = strip_tags(html_content)
            
            # Send email
            email = EmailMultiAlternatives(
                subject=f'Traffic Violation Notice - {violation.violation_type}',
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[driver_email],
            )
            email.attach_alternative(html_content, 'text/html')
            email.send(fail_silently=False)
            
            logger.info(f'Violation notification sent to {driver_email}')
            return True
            
        except Exception as e:
            logger.error(f'Failed to send violation notification: {e}')
            return False
    
    @staticmethod
    def send_fine_notification(fine) -> bool:
        """
        Send email notification when a fine is issued.
        
        Args:
            fine: Fine instance
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            driver_email = fine.driver.email
            if not driver_email:
                logger.warning(f'No email for driver {fine.driver.id}')
                return False
            
            context = {
                'driver_name': fine.driver.full_name,
                'fine_amount': fine.amount,
                'reason': fine.reason,
                'location': fine.location,
                'vehicle_plate': fine.vehicle_plate,
                'due_date': fine.due_date,
                'created_at': fine.created_at,
                'view_url': f'{settings.FRONTEND_URL}/fines/{fine.id}' if hasattr(settings, 'FRONTEND_URL') else '#',
            }
            
            html_content = render_to_string('emails/fine_notification.html', context)
            text_content = strip_tags(html_content)
            
            email = EmailMultiAlternatives(
                subject=f'Traffic Fine Issued - ${fine.amount}',
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[driver_email],
            )
            email.attach_alternative(html_content, 'text/html')
            email.send(fail_silently=False)
            
            logger.info(f'Fine notification sent to {driver_email}')
            return True
            
        except Exception as e:
            logger.error(f'Failed to send fine notification: {e}')
            return False
    
    @staticmethod
    def send_payment_confirmation(fine) -> bool:
        """
        Send email confirmation when payment is received.
        
        Args:
            fine: Fine instance
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            driver_email = fine.driver.email
            if not driver_email:
                logger.warning(f'No email for driver {fine.driver.id}')
                return False
            
            context = {
                'driver_name': fine.driver.full_name,
                'fine_amount': fine.amount,
                'payment_method': fine.payment_method,
                'payment_reference': fine.payment_reference,
                'paid_at': fine.paid_at,
            }
            
            html_content = render_to_string('emails/payment_confirmation.html', context)
            text_content = strip_tags(html_content)
            
            email = EmailMultiAlternatives(
                subject='Payment Confirmation - Fine Paid',
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[driver_email],
            )
            email.attach_alternative(html_content, 'text/html')
            email.send(fail_silently=False)
            
            logger.info(f'Payment confirmation sent to {driver_email}')
            return True
            
        except Exception as e:
            logger.error(f'Failed to send payment confirmation: {e}')
            return False
    
    @staticmethod
    def send_payment_reminder(fine) -> bool:
        """
        Send payment reminder for overdue fines.
        
        Args:
            fine: Fine instance
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            driver_email = fine.driver.email
            if not driver_email:
                logger.warning(f'No email for driver {fine.driver.id}')
                return False
            
            context = {
                'driver_name': fine.driver.full_name,
                'fine_amount': fine.amount,
                'reason': fine.reason,
                'due_date': fine.due_date,
                'days_overdue': (fine.due_date - fine.created_at).days if fine.due_date else 0,
                'view_url': f'{settings.FRONTEND_URL}/fines/{fine.id}' if hasattr(settings, 'FRONTEND_URL') else '#',
            }
            
            html_content = render_to_string('emails/payment_reminder.html', context)
            text_content = strip_tags(html_content)
            
            email = EmailMultiAlternatives(
                subject='Payment Reminder - Overdue Fine',
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[driver_email],
            )
            email.attach_alternative(html_content, 'text/html')
            email.send(fail_silently=False)
            
            logger.info(f'Payment reminder sent to {driver_email}')
            return True
            
        except Exception as e:
            logger.error(f'Failed to send payment reminder: {e}')
            return False
    
    @staticmethod
    def send_appeal_status_update(appeal, new_status: str) -> bool:
        """
        Send notification when appeal status changes.
        
        Args:
            appeal: Appeal instance
            new_status: New status of the appeal
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            driver_email = appeal.driver.email
            if not driver_email:
                logger.warning(f'No email for driver {appeal.driver.id}')
                return False
            
            context = {
                'driver_name': appeal.driver.full_name,
                'violation_type': appeal.violation.violation_type if hasattr(appeal, 'violation') else 'N/A',
                'appeal_status': new_status,
                'reviewed_at': appeal.reviewed_at if hasattr(appeal, 'reviewed_at') else None,
                'reviewer_note': appeal.reviewer_note if hasattr(appeal, 'reviewer_note') else '',
            }
            
            html_content = render_to_string('emails/appeal_status_update.html', context)
            text_content = strip_tags(html_content)
            
            email = EmailMultiAlternatives(
                subject=f'Appeal Status Update - {new_status}',
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[driver_email],
            )
            email.attach_alternative(html_content, 'text/html')
            email.send(fail_silently=False)
            
            logger.info(f'Appeal status update sent to {driver_email}')
            return True
            
        except Exception as e:
            logger.error(f'Failed to send appeal status update: {e}')
            return False
    
    @staticmethod
    def send_generic_notification(
        recipient_email: str,
        subject: str,
        template_name: str,
        context: dict[str, Any],
    ) -> bool:
        """
        Send a generic email notification.
        
        Args:
            recipient_email: Email address of recipient
            subject: Email subject line
            template_name: Name of the email template (without .html)
            context: Template context dict
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            if not recipient_email:
                logger.warning('No recipient email provided')
                return False
            
            html_content = render_to_string(f'emails/{template_name}.html', context)
            text_content = strip_tags(html_content)
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email],
            )
            email.attach_alternative(html_content, 'text/html')
            email.send(fail_silently=False)
            
            logger.info(f'Generic notification sent to {recipient_email}')
            return True
            
        except Exception as e:
            logger.error(f'Failed to send generic notification: {e}')
            return False
