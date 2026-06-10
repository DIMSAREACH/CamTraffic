"""Run AI detection on a local image file (for development / thesis testing)."""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from ai_detection.services import detect_traffic_sign


class Command(BaseCommand):
    help = 'Test traffic sign detection on an image file and print the result'

    def add_arguments(self, parser):
        parser.add_argument(
            'image',
            type=str,
            help='Path to image (PNG/JPG/WEBP)',
        )

    def handle(self, *args, **options):
        image_path = Path(options['image']).resolve()
        if not image_path.is_file():
            raise CommandError(f'File not found: {image_path}')

        self.stdout.write(f'Detecting: {image_path}')
        result = detect_traffic_sign(str(image_path))

        self.stdout.write(self.style.SUCCESS('\n--- Detection result ---'))
        self.stdout.write(f"Sign:        {result['sign_name']}")
        if result.get('sign_code'):
            self.stdout.write(f"Sign code:   {result['sign_code']}")
        self.stdout.write(f"Confidence:  {result['confidence']}%")
        self.stdout.write(f"Time:        {result.get('processing_time', 0)}s")
        self.stdout.write(f"\nDescription:\n{result['description']}")
        self.stdout.write(f"\nGuidance:\n{result['guidance']}")
