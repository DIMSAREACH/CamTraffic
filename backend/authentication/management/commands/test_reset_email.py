"""Send a test password-reset email: python manage.py test_reset_email user@example.com"""
from django.core.management.base import BaseCommand, CommandError

from authentication.password_reset import PasswordResetError, email_configured, request_password_reset
from authentication.resend_email import resend_configured


class Command(BaseCommand):
    help = 'Send a password reset email to a registered account (Resend or SMTP).'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Registered account email')

    def handle(self, *args, **options):
        email = options['email'].strip()
        if resend_configured():
            self.stdout.write('Using Resend API.')
        elif not email_configured():
            self.stderr.write(
                self.style.WARNING(
                    'Set RESEND_API_KEY + RESEND_FROM_EMAIL (or SMTP) in .env — '
                    'in DEBUG the link prints in the console only.',
                ),
            )
        try:
            request_password_reset(email)
        except PasswordResetError as exc:
            raise CommandError(exc.message) from exc
        self.stdout.write(self.style.SUCCESS(f'Reset email sent to {email}.'))
