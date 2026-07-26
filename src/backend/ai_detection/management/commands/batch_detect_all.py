"""
Django management command to batch process all images/videos in database.
Detects vehicles, plates, and signs for all unprocessed or incomplete records.

Usage:
    python manage.py batch_detect_all [options]
    
Options:
    --reprocess: Reprocess all records even if already detected
    --limit N: Process only N records
    --source TYPE: Process only specific source (upload, camera, webcam)
"""
import logging
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Q

from ai_detection.models import AIDetectionLog
from ai_detection.pipeline import run_detection_pipeline
from ai_detection.services import process_video_file

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Batch process all detection records with vehicle/sign/plate detection'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reprocess',
            action='store_true',
            help='Reprocess all records even if already processed',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of records to process',
        )
        parser.add_argument(
            '--source',
            type=str,
            default=None,
            choices=['upload', 'camera', 'webcam', 'video'],
            help='Process only specific source type',
        )
        parser.add_argument(
            '--confidence',
            type=float,
            default=0.35,
            help='Minimum confidence threshold',
        )

    def handle(self, *args, **options):
        reprocess = options['reprocess']
        limit = options['limit']
        source = options['source']
        confidence = options['confidence']

        self.stdout.write(self.style.SUCCESS('🚀 Starting batch detection processing...'))
        
        # Build query
        query = Q()
        
        if not reprocess:
            # Only process incomplete detections
            query &= (
                Q(vehicle_count__isnull=True) |
                Q(vehicle_count=0) |
                Q(detected_vehicles='[]') |
                Q(detected_vehicles__isnull=True)
            )
        
        if source:
            query &= Q(source=source)
        
        # Get detection logs
        logs = AIDetectionLog.objects.filter(query).order_by('-created_at')
        
        if limit:
            logs = logs[:limit]
        
        total = logs.count()
        
        if total == 0:
            self.stdout.write(self.style.WARNING('✓ No records to process'))
            return
        
        self.stdout.write(f'📊 Found {total} records to process')
        
        # Process each log
        processed = 0
        errors = 0
        skipped = 0
        
        for idx, log in enumerate(logs, 1):
            try:
                self.stdout.write(f'\n[{idx}/{total}] Processing {log.id}...')
                
                # Get file path
                if log.uploaded_video:
                    file_path = log.uploaded_video.path
                    self.stdout.write(f'  📹 Video: {Path(file_path).name}')
                    
                    # Process video
                    result = process_video_file(
                        str(file_path),
                        output_dir=None,
                        skip_frames=5,  # Process every 5th frame for speed
                    )
                    
                    if result:
                        processed += 1
                        self.stdout.write(self.style.SUCCESS(f'  ✓ Video processed: {result.get("frames_processed", 0)} frames'))
                    else:
                        errors += 1
                        self.stdout.write(self.style.ERROR('  ✗ Video processing failed'))
                
                elif log.uploaded_image:
                    file_path = log.uploaded_image.path
                    self.stdout.write(f'  🖼️  Image: {Path(file_path).name}')
                    
                    # Run detection pipeline
                    result = run_detection_pipeline(
                        str(file_path),
                        original_filename=Path(file_path).name,
                        live_fast=False,
                        enable_ocr=True,
                        enable_plate=True,
                    )
                    
                    if result:
                        # Update log with results
                        vehicles = result.get('vehicles', [])
                        signs = result.get('signs', [])
                        plate = result.get('plate_result', {})
                        
                        log.vehicle_count = len(vehicles)
                        log.sign_count = len(signs)
                        log.detected_vehicles = vehicles
                        log.detected_signs = signs
                        
                        if plate and plate.get('plate_text'):
                            log.plate_detected = plate['plate_text']
                            log.plate_confidence = plate.get('plate_confidence', 0)
                        
                        # Save vehicle/plate evidence if available
                        if result.get('vehicle_snapshot_path'):
                            from django.core.files import File
                            with open(result['vehicle_snapshot_path'], 'rb') as f:
                                log.vehicle_snapshot.save(
                                    f'vehicle_{log.id}.jpg',
                                    File(f),
                                    save=False
                                )
                        
                        if result.get('plate_snapshot_path'):
                            from django.core.files import File
                            with open(result['plate_snapshot_path'], 'rb') as f:
                                log.plate_snapshot.save(
                                    f'plate_{log.id}.jpg',
                                    File(f),
                                    save=False
                                )
                        
                        log.save()
                        
                        processed += 1
                        self.stdout.write(self.style.SUCCESS(
                            f'  ✓ Detected: {len(vehicles)} vehicles, {len(signs)} signs, plate: {plate.get("plate_text", "none")}'
                        ))
                    else:
                        errors += 1
                        self.stdout.write(self.style.ERROR('  ✗ Detection failed'))
                
                else:
                    skipped += 1
                    self.stdout.write(self.style.WARNING('  ⊘ No image/video file'))
            
            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(f'  ✗ Error: {exc}'))
                logger.exception('Batch detection error for log %s', log.id)
        
        # Summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS(f'✅ Batch detection complete!'))
        self.stdout.write(f'  • Total records: {total}')
        self.stdout.write(self.style.SUCCESS(f'  • Processed: {processed}'))
        self.stdout.write(self.style.WARNING(f'  • Skipped: {skipped}'))
        self.stdout.write(self.style.ERROR(f'  • Errors: {errors}'))
