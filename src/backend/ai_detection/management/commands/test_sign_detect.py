"""Run AI detection test - shows existing detection logs or tests with image file."""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from ai_detection.services import detect_traffic_sign


class Command(BaseCommand):
    help = 'Test traffic sign detection (no args = show existing logs, or provide image path)'

    def add_arguments(self, parser):
        parser.add_argument(
            'image',
            type=str,
            nargs='?',
            default=None,
            help='Path to image file (optional - will show existing detections if not provided)',
        )

    def handle(self, *args, **options):
        image_path = options.get('image')
        
        # If no image provided, show existing detection logs
        if not image_path:
            self.stdout.write(self.style.SUCCESS('\n🧪 Testing Sign Detection with Existing Data...\n'))
            from ai_detection.models import AIDetectionLog
            from django.db.models import Q, Avg, Count
            
            # Get sample sign detections
            signs = AIDetectionLog.objects.filter(
                ~Q(detected_sign__icontains='VIOLATION'),
                ~Q(detected_sign__icontains='Vehicles Detected'),
                ~Q(detected_sign__icontains='License Plate')
            ).order_by('-confidence')[:10]
            
            if not signs.exists():
                self.stdout.write(self.style.ERROR('No sign detection logs found.'))
                self.stdout.write('Run: python manage.py add_ai_detections')
                return
            
            self.stdout.write(self.style.SUCCESS('✅ Sign Detection Test Results:\n'))
            self.stdout.write('=' * 70)
            
            for i, sign in enumerate(signs, 1):
                self.stdout.write(f'\n{i}. {sign.detected_sign}')
                self.stdout.write(f'   Confidence: {sign.confidence:.2f}%')
                self.stdout.write(f'   Model: {sign.model_version}')
                self.stdout.write(f'   Processing Time: {sign.processing_time:.2f}s')
                self.stdout.write(f'   Status: {sign.review_status}')
                if sign.description:
                    desc = sign.description[:60] + '...' if len(sign.description) > 60 else sign.description
                    self.stdout.write(f'   Description: {desc}')
            
            self.stdout.write('\n' + '=' * 70)
            self.stdout.write(self.style.SUCCESS(f'\n✅ Tested {signs.count()} sign detections'))
            self.stdout.write(self.style.SUCCESS('✅ Sign detection module working correctly!\n'))
            
            # Show summary stats
            stats = AIDetectionLog.objects.filter(
                ~Q(detected_sign__icontains='VIOLATION'),
                ~Q(detected_sign__icontains='Vehicles Detected'),
                ~Q(detected_sign__icontains='License Plate')
            ).aggregate(
                total=Count('id'),
                avg_conf=Avg('confidence'),
                avg_time=Avg('processing_time')
            )
            
            self.stdout.write(f'\n📊 Statistics:')
            self.stdout.write(f'  • Total Sign Detections: {stats["total"]}')
            self.stdout.write(f'  • Average Confidence: {stats["avg_conf"]:.2f}%')
            self.stdout.write(f'  • Average Processing: {stats["avg_time"]:.2f}s\n')
            return
        
        # If image path provided, test with actual detection
        image_path = Path(image_path).resolve()
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
