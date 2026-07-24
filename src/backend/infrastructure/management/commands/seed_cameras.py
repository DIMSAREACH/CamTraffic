"""Seed demo roads and cameras for live camera AI Detection (FE-08 + AI Center)."""
from pathlib import Path
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand

from infrastructure.models import Camera, Road


class Command(BaseCommand):
    help = 'Create/update sample roads and cameras for live camera detection'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete existing roads/cameras before seeding',
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Upsert demo cameras by code (creates missing roads/cameras)',
        )
        parser.add_argument(
            '--sync-media',
            action='store_true',
            help='Copy demo-cameras JPEGs into MEDIA_ROOT/demo-cameras for backend capture',
        )

    def handle(self, *args, **options):
        self._sync_demo_media()

        if options['clear']:
            Camera.objects.all().delete()
            Road.objects.all().delete()
            self.stdout.write('Cleared roads and cameras.')

        if options['fix'] or options['clear'] or not Camera.objects.exists():
            self._upsert_demo()
            return

        self.stdout.write(self.style.WARNING(
            'Cameras already exist — skipping. Use --fix to refresh demo URLs, or --clear to replace.',
        ))
        self.stdout.write(f'  Roads: {Road.objects.count()}, Cameras: {Camera.objects.count()}')

    def _upsert_demo(self) -> None:
        road1, _ = Road.objects.get_or_create(
            name='Monivong Blvd — Chamkar Mon',
            defaults={
                'road_type': 'urban',
                'city': 'Phnom Penh',
                'region': 'Phnom Penh',
                'speed_limit': 50,
                'status': 'active',
                'length_km': 4.2,
            },
        )
        road2, _ = Road.objects.get_or_create(
            name='NR6 Highway — Kandal',
            defaults={
                'road_type': 'highway',
                'city': 'Ta Khmau',
                'region': 'Kandal',
                'speed_limit': 80,
                'status': 'active',
                'length_km': 18.5,
            },
        )

        specs = [
            {
                'road': road1,
                'name': 'Monivong Intersection Cam A',
                'code': 'CAM-PP-001',
                'model': 'Hikvision DS-2CD2T47G2',
                'camera_type': 'fixed',
                'status': 'active',
                'frame_source_url': '/demo-cameras/monivong-intersection.jpg',
            },
            {
                'road': road1,
                'name': 'Monivong Intersection Cam B',
                'code': 'CAM-PP-002',
                'model': 'Dahua IPC-HFW2831S',
                'camera_type': 'ptz',
                'status': 'maintenance',
                'frame_source_url': '/demo-cameras/monivong-ptz.jpg',
            },
            {
                'road': road2,
                'name': 'NR6 Speed Cam East',
                'code': 'CAM-KD-001',
                'model': 'Axis Q1656',
                'camera_type': 'speed',
                'status': 'active',
                'frame_source_url': '/demo-cameras/nr6-highway.jpg',
            },
            {
                'road': road2,
                'name': 'NR6 Backup Cam',
                'code': 'CAM-KD-002',
                'model': 'Generic IP Cam',
                'camera_type': 'fixed',
                'status': 'inactive',
                'frame_source_url': '',
            },
        ]

        created = updated = 0
        for spec in specs:
            cam, was_created = Camera.objects.update_or_create(
                code=spec['code'],
                defaults={
                    'road': spec['road'],
                    'name': spec['name'],
                    'model': spec['model'],
                    'camera_type': spec['camera_type'],
                    'status': spec['status'],
                    'frame_source_url': spec['frame_source_url'],
                    'ai_enabled': True,
                    'detection_type': 'street',
                    'province': 'Phnom Penh' if 'PP' in spec['code'] else 'Kandal',
                    'district': 'Chamkar Mon' if 'PP' in spec['code'] else 'Ta Khmau',
                    'resolution': '1080p',
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1
            self.stdout.write(
                f'  {"Created" if was_created else "Updated"} {cam.code} → '
                f'{cam.frame_source_url or "(empty)"} [{cam.status}]',
            )

        self.stdout.write(self.style.SUCCESS(
            f'Demo cameras ready ({created} created, {updated} updated). '
            f'Roads={Road.objects.count()}, Cameras={Camera.objects.count()}.',
        ))
        self.stdout.write('AI Detection → Live Camera, or Camera Feeds (/admin/cameras).')
        self.stdout.write(
            'Production: set Camera.frame_source_url to HTTP snapshot or RTSP '
            '(+ STREAM_GATEWAY_URL for RTSP).',
        )

    def _sync_demo_media(self) -> None:
        """Ensure backend can resolve /demo-cameras/ via MEDIA_ROOT as a fallback."""
        repo = Path(getattr(settings, 'REPO_ROOT', Path(settings.BASE_DIR).resolve().parents[1]))
        sources = [
            repo / 'src' / 'web' / 'admin' / 'public' / 'demo-cameras',
            repo / 'src' / 'web' / 'user' / 'public' / 'demo-cameras',
        ]
        dest = Path(settings.MEDIA_ROOT) / 'demo-cameras'
        dest.mkdir(parents=True, exist_ok=True)
        copied = 0
        for src_dir in sources:
            if not src_dir.is_dir():
                continue
            for jpg in src_dir.glob('*.jpg'):
                target = dest / jpg.name
                if not target.exists() or target.stat().st_size != jpg.stat().st_size:
                    shutil.copy2(jpg, target)
                    copied += 1
        if copied:
            self.stdout.write(f'Synced {copied} demo frame(s) → {dest}')
        else:
            self.stdout.write(f'Demo media ready at {dest}')
