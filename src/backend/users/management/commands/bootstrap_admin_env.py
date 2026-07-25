"""Create or update an admin from CAMTRAFFIC_BOOTSTRAP_ADMIN_* env vars (Render, no Shell)."""
import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from authentication.password_policy import password_complexity_errors

User = get_user_model()


class Command(BaseCommand):
    help = (
        'Upsert administrator from CAMTRAFFIC_BOOTSTRAP_ADMIN_EMAIL and '
        'CAMTRAFFIC_BOOTSTRAP_ADMIN_PASSWORD (optional on hosted deploy).'
    )

    def handle(self, *args, **options):
        email = (os.getenv('CAMTRAFFIC_BOOTSTRAP_ADMIN_EMAIL') or '').strip().lower()
        password = os.getenv('CAMTRAFFIC_BOOTSTRAP_ADMIN_PASSWORD') or ''
        full_name = (os.getenv('CAMTRAFFIC_BOOTSTRAP_ADMIN_NAME') or 'Administrator').strip()

        if not email and not password:
            self.stdout.write('Bootstrap admin env not set — skipped.')
            return
        if not email or '@' not in email:
            raise CommandError('CAMTRAFFIC_BOOTSTRAP_ADMIN_EMAIL must be a valid email.')
        if not password:
            raise CommandError('CAMTRAFFIC_BOOTSTRAP_ADMIN_PASSWORD is required when email is set.')

        errors = password_complexity_errors(password)
        if errors:
            raise CommandError(' '.join(errors))

        existing = User.objects.filter(email=email).first()
        try:
            validate_password(password, existing)
        except ValidationError as exc:
            raise CommandError(' '.join(exc.messages)) from exc

        if existing:
            user = existing
            user.full_name = full_name or user.full_name
            user.role = 'admin'
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.email_verified = True
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Updated bootstrap administrator: {email}'))
        else:
            User.objects.create_user(
                email=email,
                password=password,
                full_name=full_name,
                role='admin',
                is_staff=True,
                is_superuser=True,
                is_active=True,
                email_verified=True,
            )
            self.stdout.write(self.style.SUCCESS(f'Created bootstrap administrator: {email}'))
