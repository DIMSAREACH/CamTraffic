"""
Create test cameras with Hikvision iDS-TCD402 specifications for testing without hardware.
Useful for development and demonstration.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from infrastructure.models import Camera, Road
from infrastructure.camera_models import get_hikvision_traffic_camera


class Command(BaseCommand):
    help = 'Create test cameras with Hikvision specs (for testing without hardware)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=3,
            help='Number of test cameras to create',
        )
        parser.add_argument(
            '--use-local-images',
            action='store_true',
            help='Use local image paths instead of RTSP streams',
        )

    def handle(self, *args, **options):
        count = options['count']
        use_local = options['use_local_images']

        spec = get_hikvision_traffic_camera()

        self.stdout.write(self.style.SUCCESS('🧪 Creating Test Hikvision Cameras'))
        self.stdout.write('=' * 70)

        # Get or create test roads
        test_roads = [
            {
                'name': 'Monivong Boulevard — Phnom Penh',
                'code': 'NR1-PP',
                'road_type': 'urban',
                'speed_limit': 60,
                'lanes': 4,
            },
            {
                'name': 'Russian Boulevard — Phnom Penh',
                'code': 'NR2-PP',
                'road_type': 'urban',
                'speed_limit': 50,
                'lanes': 4,
            },
            {
                'name': 'National Road 6 — Siem Reap',
                'code': 'NR6-SR',
                'road_type': 'highway',
                'speed_limit': 90,
                'lanes': 4,
            },
        ]

        roads = []
        for road_data in test_roads:
            road, created = Road.objects.get_or_create(
                road_code=road_data['code'],
                defaults=road_data,
            )
            roads.append(road)
            if created:
                self.stdout.write(f'  ✓ Created road: {road.name}')

        # Camera test configurations
        camera_configs = [
            {
                'name': 'Monivong-Sihanouk Intersection (TEST)',
                'code': 'TEST-HIK-001',
                'description': 'Test Hikvision camera - Monivong/Sihanouk intersection',
                'camera_type': 'speed',
                'latitude': 11.5564,
                'longitude': 104.9282,
            },
            {
                'name': 'Russian Blvd North Entrance (TEST)',
                'code': 'TEST-HIK-002',
                'description': 'Test Hikvision camera - Russian Boulevard entry',
                'camera_type': 'speed',
                'latitude': 11.5789,
                'longitude': 104.8922,
            },
            {
                'name': 'NR6 Highway Monitor (TEST)',
                'code': 'TEST-HIK-003',
                'description': 'Test Hikvision camera - Highway speed enforcement',
                'camera_type': 'speed',
                'latitude': 13.3633,
                'longitude': 103.8564,
            },
        ]

        created_count = 0
        for i, config in enumerate(camera_configs[:count]):
            road = roads[i % len(roads)]

            # Use local test images instead of RTSP
            if use_local:
                frame_url = f'/media/cctv/test-hikvision-{i+1}.jpg'
            else:
                # Simulated RTSP URL (won't work without real camera)
                frame_url = f'http://192.168.1.{100+i}/snapshot.jpg'

            camera, created = Camera.objects.update_or_create(
                code=config['code'],
                defaults={
                    'road': road,
                    'name': config['name'],
                    'model': spec.model_code,
                    'brand': spec.manufacturer,
                    'camera_type': config['camera_type'],
                    'resolution': spec.resolution,
                    'fps': spec.frame_rate,
                    'frame_source_url': frame_url,
                    'ip_address': f'192.168.1.{100+i}',
                    'port': 554,
                    'latitude': config.get('latitude'),
                    'longitude': config.get('longitude'),
                    'status': 'active',
                    'ai_enabled': True,
                    'confidence_threshold': 0.35,
                    'description': config['description'],
                    'installed_date': timezone.now().date(),
                },
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'\n✓ Created camera: {camera.code}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'\n↻ Updated camera: {camera.code}')
                )

            self.stdout.write(f'  Name: {camera.name}')
            self.stdout.write(f'  Road: {camera.road.name}')
            self.stdout.write(f'  Model: {camera.model}')
            self.stdout.write(f'  Frame URL: {camera.frame_source_url}')
            self.stdout.write(f'  Type: {camera.camera_type}')

        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS(f'✅ Created {created_count} test cameras'))
        self.stdout.write('=' * 70)

        self.stdout.write('\n💡 Next steps:')
        self.stdout.write('  1. Add test images to /media/cctv/')
        self.stdout.write('  2. Test detection: curl /api/cameras/')
        self.stdout.write('  3. Check camera specs in response')
        self.stdout.write('\n📝 To remove test cameras:')
        self.stdout.write('  python manage.py shell -c "')
        self.stdout.write('  from infrastructure.models import Camera')
        self.stdout.write('  Camera.objects.filter(code__startswith=\'TEST-\').delete()"')
