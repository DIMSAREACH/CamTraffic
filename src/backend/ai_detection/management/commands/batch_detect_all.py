"""
Django management command to batch process all images in database.
Detects vehicles, plates, and signs for all unprocessed or incomplete records.

Usage:
    python manage.py batch_detect_all [options]
    
Options:
    --reprocess: Reprocess all records even if already detected
    --limit N: Process only N records
"""
import logging
import tempfile
import urllib.request
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.conf import settings

from ai_detection.models import AIDetectionLog
from ai_detection.pipeline import run_detection_pipeline

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

    def handle(self, *args, **options):
        reprocess = options['reprocess']
        limit = options['limit']

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
        
        # Get detection logs with uploaded images
        logs = AIDetectionLog.objects.filter(query).filter(
            uploaded_image__isnull=False
        ).exclude(uploaded_image='').order_by('-created_at')
        
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
            temp_file = None
            try:
                self.stdout.write(f'\n[{idx}/{total}] Processing {log.id}...')
                
                # Get file - download from S3 if needed
                try:
                    file_path = log.uploaded_image.path
                except (NotImplementedError, AttributeError):
                    # File is on S3 - download it
                    try:
                        file_url = log.uploaded_image.url
                        
                        self.stdout.write(f'  📥 Downloading: {Path(log.uploaded_image.name).name}')
                        
                        # Download to temp file
                        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                        req = urllib.request.Request(file_url, headers={'User-Agent': 'CamTraffic/1.0'})
                        with urllib.request.urlopen(req, timeout=30) as response:
                            temp_file.write(response.read())
                        temp_file.close()
                        file_path = temp_file.name
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'  ⊘ Download failed: {e}'))
                        skipped += 1
                        continue
                
                self.stdout.write(f'  🖼️  Image: {Path(log.uploaded_image.name).name}')
                
                # Run detection pipeline
                result = run_detection_pipeline(
                    file_path,
                    original_filename=Path(log.uploaded_image.name).name,
                    live_fast=False,
                    enable_ocr=True,
                    enable_plate=True,
                )
                
                if result:
                    # Update log with results
                    vehicles = result.get('vehicles', [])
                    plate = result.get('plate_result', {})
                    
                    log.vehicle_count = len(vehicles)
                    log.detected_vehicles = vehicles
                    
                    if plate and plate.get('plate_text'):
                        log.detected_plate = plate['plate_text']
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
                        f'  ✓ Detected: {len(vehicles)} vehicles, plate: {plate.get("plate_text", "none")}'
                    ))
                else:
                    errors += 1
                    self.stdout.write(self.style.ERROR('  ✗ Detection failed'))
            
            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(f'  ✗ Error: {exc}'))
                logger.exception('Batch detection error for log %s', log.id)
            
            finally:
                # Cleanup temp file
                if temp_file:
                    try:
                        Path(temp_file.name).unlink(missing_ok=True)
                    except:
                        pass
        
        # Summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS(f'✅ Batch detection complete!'))
        self.stdout.write(f'  • Total records: {total}')
        self.stdout.write(self.style.SUCCESS(f'  • Processed: {processed}'))
        self.stdout.write(self.style.WARNING(f'  • Skipped: {skipped}'))
        self.stdout.write(self.style.ERROR(f'  • Errors: {errors}'))
