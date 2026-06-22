"""Reactivate deactivated user accounts (restore sign-in access)."""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = 'Reactivate one or more deactivated user accounts'

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
            count = qs.update(is_active=True)
            if count == 0:
                self.stdout.write(self.style.WARNING('No deactivated accounts found.'))
                return
            self.stdout.write(self.style.SUCCESS(f'Reactivated {count} account(s).'))
            return

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise CommandError(f'No user found with email: {email}')
        if user.is_active:
            self.stdout.write(self.style.WARNING(f'{email} is already active.'))
            return

        user.is_active = True
        user.save(update_fields=['is_active', 'updated_at'])
        from users.profile_services import sync_profile_status

        sync_profile_status(user)
        self.stdout.write(self.style.SUCCESS(f'Reactivated: {email}'))
