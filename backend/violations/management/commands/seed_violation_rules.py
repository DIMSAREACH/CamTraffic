from django.core.management.base import BaseCommand

from violations.services import seed_default_rules


class Command(BaseCommand):
    help = 'Seed default traffic violation rules (sign + action → violation type).'

    def handle(self, *args, **options):
        created = seed_default_rules()
        self.stdout.write(self.style.SUCCESS(f'Violation rules seeded ({created} new rows).'))
