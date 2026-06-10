"""Seed demo roads and cameras for FE-08 camera feed testing."""
from django.core.management.base import BaseCommand

from infrastructure.models import Camera, Road


class Command(BaseCommand):
    help = 'Create sample roads and cameras for camera feed UI testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete existing roads/cameras before seeding (cameras only if roads empty)',
        )

    def handle(self, *args, **options):
        if options['clear']:
            Camera.objects.all().delete()
            Road.objects.all().delete()
            self.stdout.write('Cleared roads and cameras.')

        if Road.objects.exists():
            self.stdout.write(self.style.WARNING(
                'Roads already exist — skipping seed. Use --clear to replace demo data.',
            ))
            self.stdout.write(f'  Roads: {Road.objects.count()}, Cameras: {Camera.objects.count()}')
            return

        road1 = Road.objects.create(
            name='Monivong Blvd — Chamkar Mon',
            road_type='urban',
            city='Phnom Penh',
            region='Phnom Penh',
            speed_limit=50,
            status='active',
            length_km=4.2,
        )
        road2 = Road.objects.create(
            name='NR6 Highway — Kandal',
            road_type='highway',
            city='Ta Khmau',
            region='Kandal',
            speed_limit=80,
            status='active',
            length_km=18.5,
        )

        cameras = [
            Camera(
                road=road1,
                name='Monivong Intersection Cam A',
                code='CAM-PP-001',
                model='Hikvision DS-2CD2T47G2',
                camera_type='fixed',
                status='active',
                frame_source_url='https://picsum.photos/seed/camtraffic1/960/540',
            ),
            Camera(
                road=road1,
                name='Monivong Intersection Cam B',
                code='CAM-PP-002',
                model='Dahua IPC-HFW2831S',
                camera_type='ptz',
                status='maintenance',
                frame_source_url='https://picsum.photos/seed/camtraffic2/960/540',
            ),
            Camera(
                road=road2,
                name='NR6 Speed Cam East',
                code='CAM-KD-001',
                model='Axis Q1656',
                camera_type='speed',
                status='active',
                frame_source_url='https://picsum.photos/seed/camtraffic3/960/540',
            ),
            Camera(
                road=road2,
                name='NR6 Backup Cam',
                code='CAM-KD-002',
                model='Generic IP Cam',
                camera_type='fixed',
                status='inactive',
                frame_source_url='',
            ),
        ]
        Camera.objects.bulk_create(cameras)

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {Road.objects.count()} roads and {Camera.objects.count()} cameras.',
        ))
        self.stdout.write('Open admin portal → Camera Feeds (/admin/cameras) to test.')
