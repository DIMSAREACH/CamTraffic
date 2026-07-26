"""
Process detection for all camera snapshots in the system.
Useful for batch processing all camera footage.

Usage:
    python manage.py detect_all_cameras [options]
"""
import logging
import time
from pathlib import Path

from django.core.management.base import BaseCommand

from infrastructure.models import Camera
from ai_detection.frame_capture import capture_frame_from_url
from ai_detection.pipeline import run_detection_pipeline
from ai_detection.models import AIDetectionLog

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Capture and detect vehicles/signs from all active cameras'

    def add_arguments(self, parser):
        parser.add_argument(
            '--active-only',
            action='store_true',
            help='Process only active cameras',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of cameras to process',
        )
        parser.add_argument(
            '--delay',
            type=int,
            default=2,
            help='Delay between camera captures (seconds)',
        )

    def handle(self, *args, **options):
        active_only = options['active_only']
        limit = options['limit']
        delay = options['delay']

        self.stdout.write(self.style.SUCCESS('📹 Processing all cameras...'))
        
        # Get cameras
        query = Camera.objects.all()
        if active_only:
            query = query.filter(status='active')
        
        if limit:
            query = query[:limit]
        
        cameras = list(query)
        total = len(cameras)
        
        if total == 0:
            self.stdout.write(self.style.WARNING('No cameras found'))
            return
        
        self.stdout.write(f'Found {total} cameras to process')
        
        processed = 0
        errors = 0
        
        for idx, camera in enumerate(cameras, 1):
            try:
                self.stdout.write(f'\n[{idx}/{total}] Processing {camera.name}...')
                
                # Get frame URL
                frame_url = camera.effective_frame_url()
                if not frame_url:
                    self.stdout.write(self.style.WARNING('  ⊘ No frame URL configured'))
                    continue
                
                self.stdout.write(f'  📍 Location: {camera.road.name if camera.road else "Unknown"}')
                self.stdout.write(f'  🔗 URL: {frame_url[:50]}...')
                
                # Capture frame
                frame_path, filename = capture_frame_from_url(frame_url, camera.code)
                
                if not frame_path or not Path(frame_path).exists():
                    self.stdout.write(self.style.ERROR('  ✗ Frame capture failed'))
                    errors += 1
                    continue
                
                self.stdout.write(f'  ✓ Frame captured: {filename}')
                
                # Run detection
                result = run_detection_pipeline(
                    frame_path,
                    original_filename=filename,
                    camera_id=str(camera.id),
                    live_fast=True,
                    enable_ocr=True,
                    enable_plate=True,
                )
                
                if result:
                    vehicles = result.get('vehicles', [])
                    signs = result.get('signs', [])
                    plate = result.get('plate_result', {})
                    
                    self.stdout.write(self.style.SUCCESS(
                        f'  ✓ Detected: {len(vehicles)} vehicles, {len(signs)} signs'
                    ))
                    
                    if plate and plate.get('plate_text'):
                        self.stdout.write(f'  🚗 Plate: {plate["plate_text"]} ({plate.get("plate_confidence", 0):.1f}%)')
                    
                    processed += 1
                else:
                    self.stdout.write(self.style.ERROR('  ✗ Detection failed'))
                    errors += 1
                
                # Delay between cameras
                if idx < total:
                    time.sleep(delay)
            
            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(f'  ✗ Error: {exc}'))
                logger.exception('Camera detection error for %s', camera.id)
        
        # Summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('✅ Camera batch processing complete!'))
        self.stdout.write(f'  • Total cameras: {total}')
        self.stdout.write(self.style.SUCCESS(f'  • Processed: {processed}'))
        self.stdout.write(self.style.ERROR(f'  • Errors: {errors}'))
