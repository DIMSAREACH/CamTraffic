"""Create the first administrator with an email and password you choose."""
import getpass

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from authentication.password_policy import password_complexity_errors

User = get_user_model()


class Command(BaseCommand):
    help = 'Create an administrator account (you choose email and password)'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Administrator email')
        parser.add_argument('--full-name', type=str, help='Display name')
        parser.add_argument(
            '--password',
            type=str,
            help='Password (avoid on CLI — prefer interactive prompt)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Update password if this email already exists',
        )

    def handle(self, *args, **options):
        email = (options.get('email') or '').strip().lower()
        full_name = (options.get('full_name') or '').strip()
        password = options.get('password')
        force = options.get('force')

        if not email:
            email = input('Admin email: ').strip().lower()
        if not full_name:
            full_name = input('Full name: ').strip()
        if not email or '@' not in email:
            raise CommandError('A valid email is required.')
        if not full_name:
            raise CommandError('Full name is required.')

        existing = User.objects.filter(email=email).first()
        if existing and not force:
            raise CommandError(
                f'User {email} already exists. Use --force to set a new admin password, '
                'or choose another email.'
            )

        if not password:
            password = getpass.getpass('Password: ')
            confirm = getpass.getpass('Confirm password: ')
            if password != confirm:
                raise CommandError('Passwords do not match.')

        errors = password_complexity_errors(password)
        if errors:
            raise CommandError(' '.join(errors))
        try:
            validate_password(password, existing)
        except ValidationError as exc:
            raise CommandError(' '.join(exc.messages)) from exc

        if existing:
            user = existing
            user.full_name = full_name
            user.role = 'admin'
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Updated administrator: {email}'))
        else:
            User.objects.create_user(
                email=email,
                password=password,
                full_name=full_name,
                role='admin',
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
            self.stdout.write(self.style.SUCCESS(f'Created administrator: {email}'))

        self.stdout.write('Sign in at the admin portal (http://localhost:5174) with this email and password.')
