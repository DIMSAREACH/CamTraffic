"""Validate required CamTraffic environment variables."""

from django.core.management.base import BaseCommand

from config.env import environment_name, validate_environment


class Command(BaseCommand):
    help = 'Validate required environment variables are set'

    def handle(self, *args, **options):
        env = environment_name()
        missing = validate_environment()

        if missing:
            self.stderr.write(self.style.ERROR(
                f'Environment "{env}" is missing required variables:',
            ))
            for key in missing:
                self.stderr.write(f'  - {key}')
            self.stderr.write('\nCopy .env.example to .env and fill in values.')
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS(
            f'Environment "{env}" validation passed.',
        ))
