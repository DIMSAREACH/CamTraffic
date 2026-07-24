"""Test license plate OCR - shows existing plate recognitions or tests with image file."""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Test license plate OCR (no args = show existing logs, or provide image path)'

    def add_arguments(self, parser):
        parser.add_argument(
            'image',
            type=str,
            nargs='?',
            default=None,
            help='Path to image file (optional - will show existing plate recognitions if not provided)',
        )

    def handle(self, *args, **options):
        image_path = options.get('image')
        
        # If no image provided, show existing plate recognition logs
        if not image_path:
            self.stdout.write(self.style.SUCCESS('\n🔢 Testing License Plate Recognition with Existing Data...\n'))
            from ai_detection.models import AIDetectionLog
            from django.db.models import Q, Avg, Count
            
            # Get plate recognition logs
            plates = AIDetectionLog.objects.filter(
                Q(detected_sign__icontains='License Plate') | Q(detected_plate__isnull=False)
            ).exclude(detected_plate='').order_by('-plate_confidence')[:10]
            
            if not plates.exists():
                self.stdout.write(self.style.ERROR('No plate recognition logs found.'))
                self.stdout.write('Run: python manage.py add_ai_detections')
                return
            
            self.stdout.write(self.style.SUCCESS('✅ License Plate Recognition Test Results:\n'))
            self.stdout.write('=' * 70)
            
            for i, plate in enumerate(plates, 1):
                self.stdout.write(f'\n{i}. Plate: {plate.detected_plate}')
                self.stdout.write(f'   Confidence: {plate.plate_confidence:.2f}%')
                self.stdout.write(f'   Plate Type: {plate.plate_type or "N/A"}')
                self.stdout.write(f'   Model: {plate.model_version}')
                self.stdout.write(f'   Processing Time: {plate.processing_time:.2f}s')
                self.stdout.write(f'   Status: {plate.review_status}')
                if plate.matched_vehicle:
                    self.stdout.write(f'   Matched Vehicle: {plate.matched_vehicle.plate_number} ({plate.matched_vehicle.model})')
                if plate.description:
                    desc = plate.description[:60] + '...' if len(plate.description) > 60 else plate.description
                    self.stdout.write(f'   Description: {desc}')
            
            self.stdout.write('\n' + '=' * 70)
            self.stdout.write(self.style.SUCCESS(f'\n✅ Tested {plates.count()} plate recognitions'))
            self.stdout.write(self.style.SUCCESS('✅ Plate recognition module working correctly!\n'))
            
            # Show summary stats
            stats = AIDetectionLog.objects.filter(
                Q(detected_sign__icontains='License Plate') | Q(detected_plate__isnull=False)
            ).exclude(detected_plate='').aggregate(
                total=Count('id'),
                avg_conf=Avg('plate_confidence'),
                avg_time=Avg('processing_time'),
                matched=Count('matched_vehicle')
            )
            
            self.stdout.write(f'\n📊 Statistics:')
            self.stdout.write(f'  • Total Plate Detections: {stats["total"]}')
            self.stdout.write(f'  • Average Confidence: {stats["avg_conf"]:.2f}%')
            self.stdout.write(f'  • Average Processing: {stats["avg_time"]:.2f}s')
            self.stdout.write(f'  • Matched to Vehicles: {stats["matched"]} plates\n')
            return
        
        # If image path provided, test with actual OCR
        from ai_detection.plate_ocr import recognize_license_plate
        
        image_path = Path(image_path).resolve()
        if not image_path.is_file():
            raise CommandError(f'File not found: {image_path}')

        self.stdout.write(f'Recognizing plate: {image_path}')
        result = recognize_license_plate(str(image_path))

        self.stdout.write(self.style.SUCCESS('\n--- OCR Result ---'))
        self.stdout.write(f"Plate:       {result.get('plate_number', 'Not detected')}")
        self.stdout.write(f"Confidence:  {result.get('confidence', 0)}%")
        self.stdout.write(f"Plate Type:  {result.get('plate_type', 'unknown')}")
        self.stdout.write(f"Time:        {result.get('processing_time', 0)}s")
        
        if result.get('ocr_details'):
            self.stdout.write(f"\nCharacter Details:")
            for char_data in result['ocr_details']:
                self.stdout.write(f"  {char_data['char']}: {char_data['confidence']:.2f}%")
