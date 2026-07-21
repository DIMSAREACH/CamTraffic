"""Reactivate deactivated / soft-deleted user accounts (restore sign-in access)."""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from users.profile_services import restore_user

User = get_user_model()


class Command(BaseCommand):
    help = 'Reactivate one or more deactivated or soft-deleted user accounts'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email of the account to reactivate')
        parser.add_argument(
            '--all',
            action='store_true',
            help='Reactivate every deactivated account',
        )

    def handle(self, *args, **options):
        email = (options.get('email') or '').strip().lower()
        reactivate_all = options.get('all')

        if not email and not reactivate_all:
            raise CommandError('Provide --email <address> or --all')

        if email and reactivate_all:
            raise CommandError('Use either --email or --all, not both')

        if reactivate_all:
            qs = User.objects.filter(is_active=False)
            count = 0
            for user in qs.iterator():
                restore_user(user)
                count += 1
            if count == 0:
                self.stdout.write(self.style.WARNING('No deactivated accounts found.'))
                return
            self.stdout.write(self.style.SUCCESS(f'Reactivated {count} account(s).'))
            return

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise CommandError(f'No user found with email: {email}')
        if user.is_active and not user.deleted_at:
            self.stdout.write(self.style.WARNING(f'{email} is already active.'))
            return

        restore_user(user)
        self.stdout.write(self.style.SUCCESS(f'Reactivated: {email}'))
