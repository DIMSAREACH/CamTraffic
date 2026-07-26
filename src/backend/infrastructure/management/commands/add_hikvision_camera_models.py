"""
Add Hikvision iDS-TCD402 camera model configurations to the database.
This command helps quickly set up cameras with the professional traffic detection model.
"""
from django.core.management.base import BaseCommand

from infrastructure.models import Camera
from infrastructure.camera_models import get_hikvision_traffic_camera


class Command(BaseCommand):
    help = 'Update cameras with Hikvision iDS-TCD402-CR/12/64G specifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--camera-ids',
            nargs='+',
            type=str,
            help='Specific camera IDs to update (UUID)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Update all cameras without a model set',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        camera_ids = options.get('camera_ids')
        update_all = options.get('all')
        dry_run = options.get('dry_run')

        spec = get_hikvision_traffic_camera()

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN MODE - No changes will be made'))

        # Get cameras to update
        if camera_ids:
            cameras = Camera.objects.filter(id__in=camera_ids)
            self.stdout.write(f'Found {cameras.count()} cameras by ID')
        elif update_all:
            cameras = Camera.objects.filter(model='').exclude(is_disabled=True)
            self.stdout.write(f'Found {cameras.count()} cameras without model')
        else:
            self.stdout.write(
                self.style.ERROR('❌ Specify --camera-ids or --all')
            )
            return

        if cameras.count() == 0:
            self.stdout.write(self.style.WARNING('No cameras to update'))
            return

        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(f'📹 Hikvision {spec.model_code} - {spec.model_name}')
        self.stdout.write('=' * 70)
        self.stdout.write(f'Manufacturer: {spec.manufacturer}')
        self.stdout.write(f'Radar: {spec.radar_frequency_ghz} GHz')
        self.stdout.write(f'Detection range: {spec.radar_range_m[0]}-{spec.radar_range_m[1]}m')
        self.stdout.write(f'Speed range: {spec.speed_range_kmh[0]} to {spec.speed_range_kmh[1]} km/h')
        self.stdout.write(f'Accuracy: ±{spec.speed_accuracy_kmh} km/h')
        self.stdout.write(f'Lane coverage: {spec.lane_coverage} lanes')
        self.stdout.write(f'Max targets: {spec.max_targets}')
        self.stdout.write(f'Capture rate: {spec.capture_rate_percent}%')
        self.stdout.write(f'Weather: {spec.ip_rating}, All-weather capable')
        self.stdout.write('=' * 70 + '\n')

        updated = 0
        for camera in cameras:
            self.stdout.write(f'\n[{camera.code}] {camera.name}')
            self.stdout.write(f'  Location: {camera.road.name}')
            self.stdout.write(f'  Current model: {camera.model or "(none)"}')
            self.stdout.write(f'  Current brand: {camera.brand or "(none)"}')

            if not dry_run:
                # Update camera with Hikvision specs
                camera.model = spec.model_code
                camera.brand = spec.manufacturer
                camera.resolution = spec.resolution
                camera.fps = spec.frame_rate
                camera.camera_type = 'speed'  # Traffic flow detection type
                camera.ai_enabled = True
                camera.save(
                    update_fields=[
                        'model',
                        'brand',
                        'resolution',
                        'fps',
                        'camera_type',
                        'ai_enabled',
                    ]
                )

                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Updated to {spec.model_code}')
                )
                updated += 1
            else:
                self.stdout.write(
                    self.style.WARNING(f'  → Would update to {spec.model_code}')
                )

        self.stdout.write('\n' + '=' * 70)
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would update {cameras.count()} cameras')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'✅ Updated {updated} cameras successfully!')
            )
        self.stdout.write('=' * 70)

        if not dry_run and updated > 0:
            self.stdout.write('\n💡 Camera specifications:')
            self.stdout.write('  - Radar-assisted detection (77 GHz)')
            self.stdout.write('  - 256 simultaneous target tracking')
            self.stdout.write('  - Virtual coil detection')
            self.stdout.write('  - 4-lane coverage per camera')
            self.stdout.write('  - All-weather operation (IP67)')
            self.stdout.write('  - Speed accuracy: ±2 km/h')
