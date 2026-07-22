"""CLI test for Cambodia license plate OCR (EasyOCR + vehicle context)."""
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from ai_detection.plate_ocr import plate_ocr_enabled, recognize_plate
from ai_detection.result_compose import compose_detection_payload
from ai_detection.vehicle_detection import detect_vehicles, vehicle_detection_enabled


def default_sample_path() -> Path:
    return Path(settings.BASE_DIR).parent / 'ai' / 'test_samples' / 'plate_2A-1234.png'


def ensure_samples() -> list[Path]:
    import importlib.util
    import sys

    script = Path(settings.BASE_DIR).parent / 'ai' / 'test_samples' / 'generate_plate_samples.py'
    spec = importlib.util.spec_from_file_location('generate_plate_samples', script)
    if spec is None or spec.loader is None:
        raise CommandError(f'Cannot load sample generator: {script}')
    module = importlib.util.module_from_spec(spec)
    sys.modules['generate_plate_samples'] = module
    spec.loader.exec_module(module)

    root = Path(settings.BASE_DIR).parent / 'ai' / 'test_samples'
    return [
        module.write_plate_closeup(root / 'plate_2A-1234.png'),
        module.write_car_with_plate(root / 'car_with_plate_2A-1234.jpg'),
    ]


class Command(BaseCommand):
    help = 'Test license plate OCR on an image (EasyOCR). Use --generate-sample for built-in test images.'

    def add_arguments(self, parser):
        parser.add_argument(
            'image',
            nargs='?',
            type=str,
            help='Path to image (PNG/JPG). Defaults to ai/test_samples/plate_2A-1234.png',
        )
        parser.add_argument(
            '--generate-sample',
            action='store_true',
            help='Generate synthetic test images in ai/test_samples/ and exit',
        )
        parser.add_argument(
            '--full',
            action='store_true',
            help='Also run vehicle detection and composed API-style payload',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Print raw JSON result',
        )

    def handle(self, *args, **options):
        if options['generate_sample']:
            paths = ensure_samples()
            self.stdout.write(self.style.SUCCESS('Generated sample images:'))
            for path in paths:
                self.stdout.write(f'  {path}')
            self.stdout.write('\nRun: python manage.py test_plate_ocr')
            return

        image_path = Path(options['image']).resolve() if options['image'] else default_sample_path()
        if not image_path.is_file():
            self.stdout.write(self.style.WARNING(f'Sample not found: {image_path}'))
            self.stdout.write('Generating samples first...')
            ensure_samples()
            if not image_path.is_file():
                raise CommandError(f'Could not create sample image: {image_path}')

        if not plate_ocr_enabled():
            raise CommandError('Plate OCR is disabled. Set AI_PLATE_OCR_ENABLED=True in .env')

        self.stdout.write(f'Image:  {image_path}')
        self.stdout.write(f'OCR:    enabled (min confidence {settings.AI_PLATE_OCR_MIN_CONFIDENCE})')
        self.stdout.write(f'Langs:  {", ".join(settings.AI_PLATE_OCR_LANGUAGES)}')

        vehicles: list[dict] = []
        if options['full'] and vehicle_detection_enabled():
            vehicles = detect_vehicles(str(image_path))
            self.stdout.write(f'Vehicles: {len(vehicles)} detected')

        plate_result = recognize_plate(str(image_path), vehicles)

        if options['json']:
            payload = {'plate': plate_result, 'vehicles': vehicles}
            if options['full']:
                sign_stub = {
                    'sign_name': 'ស្លាកមិនស្គាល់',
                    'sign_name_en': 'Unknown sign',
                    'confidence': 0.0,
                    'description': '',
                    'guidance': '',
                    'class_key': '',
                }
                payload['composed'] = compose_detection_payload(sign_stub, vehicles, plate_result)
            self.stdout.write(json.dumps(payload, indent=2, ensure_ascii=False))
            return

        self._print_plate_result(plate_result)

        if options['full']:
            sign_stub = {
                'sign_name': 'ស្លាកមិនស្គាល់',
                'sign_name_en': 'Unknown sign',
                'confidence': 0.0,
                'description': '',
                'guidance': '',
                'class_key': '',
            }
            composed = compose_detection_payload(sign_stub, vehicles, plate_result)
            self.stdout.write(self.style.SUCCESS('\n--- Composed API payload ---'))
            self.stdout.write(f"Mode:        {composed.get('detection_mode')}")
            self.stdout.write(f"Title:       {composed.get('display_title_en')}")
            if composed.get('detected_plate'):
                self.stdout.write(f"Plate:       {composed['detected_plate']} ({composed.get('plate_confidence', 0):.1f}%)")
            matched = composed.get('matched_vehicle')
            if matched:
                self.stdout.write(
                    f"DB match:    {matched['plate_number']} — {matched['owner_name']}",
                )
            self.stdout.write(f"\nDescription:\n{composed.get('description', '')}")

        if not plate_result.get('plate_text'):
            self.stdout.write(self.style.WARNING(
                '\nNo plate read. Try ai/test_samples/plate_2A-1234.png or lower AI_PLATE_OCR_MIN_CONFIDENCE.',
            ))

    def _print_plate_result(self, result: dict) -> None:
        self.stdout.write(self.style.SUCCESS('\n--- Plate OCR result ---'))
        self.stdout.write(f"Engine:      {result.get('ocr_engine', 'none')}")
        self.stdout.write(f"Plate:       {result.get('plate_text') or '(none)'}")
        self.stdout.write(f"Confidence:  {float(result.get('plate_confidence') or 0):.1f}%")
        self.stdout.write(f"Type:        {result.get('plate_type') or '(none)'}")

        matched = result.get('matched_vehicle')
        if matched:
            self.stdout.write(
                f"DB match:    {matched['plate_number']} — {matched['owner_name']} ({matched['vehicle_type']})",
            )
        elif result.get('plate_text'):
            self.stdout.write('DB match:    (not in database — run: python manage.py seed_data)')

        reads = result.get('raw_reads') or []
        if reads:
            self.stdout.write('\nRaw OCR reads:')
            for item in reads[:8]:
                self.stdout.write(
                    f"  {item.get('text')} ({item.get('confidence', 0):.1f}%) "
                    f"[{item.get('region', 'unknown')}] raw={item.get('raw_text', '')!r}",
                )
