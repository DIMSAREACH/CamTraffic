"""Seed Cambodia CCTV roads and cameras for live feeds + map views."""
from __future__ import annotations

from decimal import Decimal
from pathlib import Path
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from infrastructure.models import Camera, Road

# Government-scale Phnom Penh + provincial coverage (lat/lng for map/heatmap)
CAMERA_FLEET = [
    # Phnom Penh — Monivong corridor
    {
        'road': ('Chaktomuk Walk Street — Daun Penh', 'urban', 'Phnom Penh', 'Phnom Penh', 30, 1.8, 11.5685000, 104.9312000),
        'name': 'Chaktomuk Walk Street Cam',
        'code': 'CAM-PP-001',
        'model': 'Hikvision DS-2CD2T47G2',
        'brand': 'Hikvision',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 11.5685000,
        'lng': 104.9312000,
        'province': 'Phnom Penh',
        'district': 'Daun Penh',
        'street': 'Chaktomuk / Sisowath Quay',
        'detections': 48,
    },
    {
        'road': ('Sisowath Quay — Riverside', 'urban', 'Phnom Penh', 'Phnom Penh', 30, 2.1, 11.5698000, 104.9305000),
        'name': 'Riverside Road Traffic Cam',
        'code': 'CAM-PP-002',
        'model': 'Dahua IPC-HFW2831S',
        'brand': 'Dahua',
        'camera_type': 'ptz',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-ptz.jpg',
        'lat': 11.5698000,
        'lng': 104.9305000,
        'province': 'Phnom Penh',
        'district': 'Daun Penh',
        'street': 'Sisowath Quay',
        'detections': 36,
    },
    {
        'road': ('Norodom Blvd — Daun Penh', 'urban', 'Phnom Penh', 'Phnom Penh', 40, 3.8, 11.5620000, 104.9280000),
        'name': 'Norodom Royal Palace Gate',
        'code': 'CAM-PP-003',
        'model': 'Hikvision DS-2CD2387G2',
        'brand': 'Hikvision',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 11.5620000,
        'lng': 104.9280000,
        'province': 'Phnom Penh',
        'district': 'Daun Penh',
        'street': 'Norodom Blvd',
        'detections': 41,
    },
    {
        'road': ('Russian Blvd — Tuol Kork', 'urban', 'Phnom Penh', 'Phnom Penh', 50, 5.1, 11.5685000, 104.8882000),
        'name': 'Russian Blvd Near Airport Spur',
        'code': 'CAM-PP-004',
        'model': 'Axis Q1656',
        'brand': 'Axis',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/nr6-highway.jpg',
        'lat': 11.5685000,
        'lng': 104.8882000,
        'province': 'Phnom Penh',
        'district': 'Tuol Kork',
        'street': 'Russian Blvd',
        'detections': 29,
    },
    {
        'road': ('Mao Tse Tung Blvd — BKK', 'urban', 'Phnom Penh', 'Phnom Penh', 40, 2.6, 11.5488000, 104.9172000),
        'name': 'Mao Tse Tung / Sihanouk Junction',
        'code': 'CAM-PP-005',
        'model': 'Hikvision DS-2CD2T47G2',
        'brand': 'Hikvision',
        'camera_type': 'ptz',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-ptz.jpg',
        'lat': 11.5488000,
        'lng': 104.9172000,
        'province': 'Phnom Penh',
        'district': 'Boeng Keng Kang',
        'street': 'Mao Tse Tung Blvd',
        'detections': 52,
    },
    {
        'road': ('Sihanouk Blvd — Independence Monument', 'intersection', 'Phnom Penh', 'Phnom Penh', 40, 1.2, 11.5564000, 104.9280000),
        'name': 'Independence Monument Circle Cam',
        'code': 'CAM-PP-006',
        'model': 'Dahua IPC-HFW5442',
        'brand': 'Dahua',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 11.5564000,
        'lng': 104.9280000,
        'province': 'Phnom Penh',
        'district': 'Chamkar Mon',
        'street': 'Sihanouk Blvd',
        'detections': 61,
    },
    {
        'road': ('Kampuchea Krom Blvd — 7 Makara', 'urban', 'Phnom Penh', 'Phnom Penh', 40, 3.4, 11.5632000, 104.9045000),
        'name': 'Kampuchea Krom Market Approach',
        'code': 'CAM-PP-007',
        'model': 'Hikvision DS-2CD2387G2',
        'brand': 'Hikvision',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 11.5632000,
        'lng': 104.9045000,
        'province': 'Phnom Penh',
        'district': '7 Makara',
        'street': 'Kampuchea Krom Blvd',
        'detections': 33,
    },
    {
        'road': ('Sisowath Quay — Riverside', 'urban', 'Phnom Penh', 'Phnom Penh', 30, 2.1, 11.5698000, 104.9305000),
        'name': 'Riverside Night Corridor Cam',
        'code': 'CAM-PP-008',
        'model': 'Axis P3265',
        'brand': 'Axis',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-ptz.jpg',
        'lat': 11.5698000,
        'lng': 104.9305000,
        'province': 'Phnom Penh',
        'district': 'Daun Penh',
        'street': 'Sisowath Quay',
        'detections': 27,
    },
    {
        'road': ('Street 271 — Toul Tom Poung', 'urban', 'Phnom Penh', 'Phnom Penh', 30, 1.8, 11.5365000, 104.9210000),
        'name': 'Russian Market Approach Cam',
        'code': 'CAM-PP-009',
        'model': 'Hikvision DS-2CD2T47G2',
        'brand': 'Hikvision',
        'camera_type': 'fixed',
        'status': 'maintenance',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 11.5365000,
        'lng': 104.9210000,
        'province': 'Phnom Penh',
        'district': 'Chamkar Mon',
        'street': 'Street 271',
        'detections': 8,
    },
    {
        'road': ('Veng Sreng Blvd — Mean Chey', 'urban', 'Phnom Penh', 'Phnom Penh', 50, 6.0, 11.5128000, 104.9102000),
        'name': 'Veng Sreng Industrial Corridor',
        'code': 'CAM-PP-010',
        'model': 'Dahua IPC-HFW2831S',
        'brand': 'Dahua',
        'camera_type': 'speed',
        'status': 'active',
        'frame_source_url': '/media/cctv/nr6-highway.jpg',
        'lat': 11.5128000,
        'lng': 104.9102000,
        'province': 'Phnom Penh',
        'district': 'Mean Chey',
        'street': 'Veng Sreng Blvd',
        'detections': 44,
    },
    {
        'road': ('Chaom Chau Roundabout — NR4', 'highway', 'Phnom Penh', 'Phnom Penh', 60, 2.4, 11.5220000, 104.8470000),
        'name': 'Chaom Chau Toll Approach',
        'code': 'CAM-PP-011',
        'model': 'Axis Q1656',
        'brand': 'Axis',
        'camera_type': 'speed',
        'status': 'active',
        'frame_source_url': '/media/cctv/nr6-highway.jpg',
        'lat': 11.5220000,
        'lng': 104.8470000,
        'province': 'Phnom Penh',
        'district': 'Pou Senchey',
        'street': 'National Road 4',
        'detections': 58,
    },
    {
        'road': ('Chbar Ampov Bridge Approach', 'urban', 'Phnom Penh', 'Phnom Penh', 40, 1.5, 11.5305000, 104.9458000),
        'name': 'Chbar Ampov Bridge Cam East',
        'code': 'CAM-PP-012',
        'model': 'Hikvision DS-2CD2387G2',
        'brand': 'Hikvision',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 11.5305000,
        'lng': 104.9458000,
        'province': 'Phnom Penh',
        'district': 'Chbar Ampov',
        'street': 'National Road 1',
        'detections': 39,
    },
    # Kandal
    {
        'road': ('NR6 Highway — Kandal', 'highway', 'Ta Khmau', 'Kandal', 80, 18.5, 11.4835000, 104.9502000),
        'name': 'NR6 Speed Cam East',
        'code': 'CAM-KD-001',
        'model': 'Axis Q1656',
        'brand': 'Axis',
        'camera_type': 'speed',
        'status': 'active',
        'frame_source_url': '/media/cctv/nr6-highway.jpg',
        'lat': 11.4835000,
        'lng': 104.9502000,
        'province': 'Kandal',
        'district': 'Ta Khmau',
        'street': 'National Road 6',
        'detections': 67,
    },
    {
        'road': ('NR6 Highway — Kandal', 'highway', 'Ta Khmau', 'Kandal', 80, 18.5, 11.4835000, 104.9502000),
        'name': 'NR6 Backup Cam',
        'code': 'CAM-KD-002',
        'model': 'Generic IP Cam',
        'brand': 'Generic',
        'camera_type': 'fixed',
        'status': 'offline',
        'frame_source_url': '',
        'lat': 11.4812000,
        'lng': 104.9488000,
        'province': 'Kandal',
        'district': 'Ta Khmau',
        'street': 'National Road 6',
        'detections': 0,
    },
    {
        'road': ('NR1 — Kien Svay Interchange', 'highway', 'Kien Svay', 'Kandal', 80, 12.0, 11.4500000, 105.0200000),
        'name': 'NR1 Kien Svay Speed Gate',
        'code': 'CAM-KD-003',
        'model': 'Hikvision DS-2CD2T47G2',
        'brand': 'Hikvision',
        'camera_type': 'speed',
        'status': 'active',
        'frame_source_url': '/media/cctv/nr6-highway.jpg',
        'lat': 11.4500000,
        'lng': 105.0200000,
        'province': 'Kandal',
        'district': 'Kien Svay',
        'street': 'National Road 1',
        'detections': 55,
    },
    # Siem Reap
    {
        'road': ('Sivatha Blvd — Siem Reap', 'urban', 'Siem Reap', 'Siem Reap', 40, 3.2, 13.3618000, 103.8600000),
        'name': 'Sivatha Night Market Cam',
        'code': 'CAM-SR-001',
        'model': 'Dahua IPC-HFW2831S',
        'brand': 'Dahua',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 13.3618000,
        'lng': 103.8600000,
        'province': 'Siem Reap',
        'district': 'Siem Reap',
        'street': 'Sivatha Blvd',
        'detections': 31,
    },
    {
        'road': ('National Road 6 — Siem Reap Approach', 'highway', 'Siem Reap', 'Siem Reap', 70, 8.0, 13.3400000, 103.8800000),
        'name': 'SR Airport Road Speed Cam',
        'code': 'CAM-SR-002',
        'model': 'Axis Q1656',
        'brand': 'Axis',
        'camera_type': 'speed',
        'status': 'active',
        'frame_source_url': '/media/cctv/nr6-highway.jpg',
        'lat': 13.3400000,
        'lng': 103.8800000,
        'province': 'Siem Reap',
        'district': 'Siem Reap',
        'street': 'National Road 6',
        'detections': 42,
    },
    # Battambang
    {
        'road': ('Street 1 — Battambang Center', 'urban', 'Battambang', 'Battambang', 40, 2.0, 13.0957000, 103.2022000),
        'name': 'Battambang City Center Cam',
        'code': 'CAM-BT-001',
        'model': 'Hikvision DS-2CD2387G2',
        'brand': 'Hikvision',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-ptz.jpg',
        'lat': 13.0957000,
        'lng': 103.2022000,
        'province': 'Battambang',
        'district': 'Battambang',
        'street': 'Street 1',
        'detections': 22,
    },
    # Sihanoukville
    {
        'road': ('Ekareach Street — Sihanoukville', 'urban', 'Sihanoukville', 'Preah Sihanouk', 40, 2.8, 10.6093000, 103.5296000),
        'name': 'Ekareach Port Approach Cam',
        'code': 'CAM-SHV-001',
        'model': 'Dahua IPC-HFW5442',
        'brand': 'Dahua',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 10.6093000,
        'lng': 103.5296000,
        'province': 'Preah Sihanouk',
        'district': 'Sihanoukville',
        'street': 'Ekareach Street',
        'detections': 28,
    },
    {
        'road': ('NR4 — Sihanoukville Gateway', 'highway', 'Sihanoukville', 'Preah Sihanouk', 80, 15.0, 10.6500000, 103.5600000),
        'name': 'NR4 SHV Gateway Speed Cam',
        'code': 'CAM-SHV-002',
        'model': 'Axis Q1656',
        'brand': 'Axis',
        'camera_type': 'speed',
        'status': 'active',
        'frame_source_url': '/media/cctv/nr6-highway.jpg',
        'lat': 10.6500000,
        'lng': 103.5600000,
        'province': 'Preah Sihanouk',
        'district': 'Sihanoukville',
        'street': 'National Road 4',
        'detections': 49,
    },
    # Extra PP coverage
    {
        'road': ('Charles de Gaulle Blvd', 'urban', 'Phnom Penh', 'Phnom Penh', 40, 2.2, 11.5580000, 104.9120000),
        'name': 'Olympic Stadium Approach Cam',
        'code': 'CAM-PP-013',
        'model': 'Hikvision DS-2CD2T47G2',
        'brand': 'Hikvision',
        'camera_type': 'ptz',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-ptz.jpg',
        'lat': 11.5580000,
        'lng': 104.9120000,
        'province': 'Phnom Penh',
        'district': '7 Makara',
        'street': 'Charles de Gaulle Blvd',
        'detections': 35,
    },
    {
        'road': ('Samdech Pan Avenue', 'urban', 'Phnom Penh', 'Phnom Penh', 40, 1.6, 11.5450000, 104.9285000),
        'name': 'BKK1 Commercial Strip Cam',
        'code': 'CAM-PP-014',
        'model': 'Axis P3265',
        'brand': 'Axis',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 11.5450000,
        'lng': 104.9285000,
        'province': 'Phnom Penh',
        'district': 'Boeng Keng Kang',
        'street': 'Samdech Pan',
        'detections': 26,
    },
    {
        'road': ('Koh Pich Boulevard', 'urban', 'Phnom Penh', 'Phnom Penh', 50, 2.0, 11.5455000, 104.9380000),
        'name': 'Diamond Island Bridge Cam',
        'code': 'CAM-PP-015',
        'model': 'Dahua IPC-HFW2831S',
        'brand': 'Dahua',
        'camera_type': 'fixed',
        'status': 'active',
        'frame_source_url': '/media/cctv/monivong-intersection.jpg',
        'lat': 11.5455000,
        'lng': 104.9380000,
        'province': 'Phnom Penh',
        'district': 'Chamkar Mon',
        'street': 'Koh Pich Blvd',
        'detections': 19,
    },
    {
        'road': ('Steung Meanchey Overpass', 'urban', 'Phnom Penh', 'Phnom Penh', 50, 1.4, 11.5200000, 104.8900000),
        'name': 'Steung Meanchey Overpass Cam',
        'code': 'CAM-PP-016',
        'model': 'Hikvision DS-2CD2387G2',
        'brand': 'Hikvision',
        'camera_type': 'fixed',
        'status': 'inactive',
        'frame_source_url': '',
        'lat': 11.5200000,
        'lng': 104.8900000,
        'province': 'Phnom Penh',
        'district': 'Mean Chey',
        'street': 'Steung Meanchey',
        'detections': 0,
    },
]


class Command(BaseCommand):
    help = 'Create/update Cambodia CCTV roads and cameras for live camera detection + maps'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete existing roads/cameras before seeding',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Upsert demo cameras by code (creates missing roads/cameras)',
        )
        parser.add_argument(
            '--sync-media',
            action='store_true',
            help='Copy Phnom Penh CCTV JPEGs into MEDIA_ROOT/cctv for live capture',
        )

    def handle(self, *args, **options):
        self._sync_cctv_media()

        if options['clear']:
            Camera.objects.all().delete()
            Road.objects.all().delete()
            self.stdout.write('Cleared roads and cameras.')

        if options['force'] or options['clear'] or not Camera.objects.exists():
            self._upsert_fleet()
            return

        self.stdout.write(self.style.WARNING(
            'Cameras already exist — skipping. Use --force to refresh CCTV frame URLs, or --clear to replace.',
        ))
        self.stdout.write(f'  Roads: {Road.objects.count()}, Cameras: {Camera.objects.count()}')

    def _upsert_fleet(self) -> None:
        road_cache: dict[str, Road] = {}
        created = updated = 0
        now = timezone.now()

        for spec in CAMERA_FLEET:
            road_key = spec['road'][0]
            if road_key not in road_cache:
                name, road_type, city, region, speed, length, rlat, rlng = spec['road']
                road, _ = Road.objects.update_or_create(
                    name=name,
                    defaults={
                        'road_type': road_type,
                        'city': city,
                        'region': region,
                        'province': region,
                        'district': city,
                        'commune': '',
                        'village': '',
                        'country': 'Cambodia',
                        'road_code': f'RD-{abs(hash(name)) % 100000:05d}',
                        'description': f'Traffic corridor: {name}',
                        'direction': 'bidirectional',
                        'speed_limit': speed,
                        'status': 'active',
                        'length_km': Decimal(str(length)),
                        'latitude': Decimal(f'{rlat:.7f}'),
                        'longitude': Decimal(f'{rlng:.7f}'),
                        'start_latitude': Decimal(f'{rlat:.7f}'),
                        'start_longitude': Decimal(f'{rlng:.7f}'),
                        'is_deleted': False,
                    },
                )
                road_cache[road_key] = road
            road = road_cache[road_key]

            # Production fleet uses /media/cctv/ stills (or RTSP/HTTP). Never seed demo-cameras paths.
            frame_url = (spec.get('frame_source_url') or '').strip()
            if 'demo-cameras' in frame_url or frame_url.startswith('/demo-'):
                frame_url = ''

            cam, was_created = Camera.objects.update_or_create(
                code=spec['code'],
                defaults={
                    'road': road,
                    'name': spec['name'],
                    'model': spec['model'],
                    'brand': spec.get('brand', ''),
                    'camera_type': spec['camera_type'],
                    'status': spec['status'],
                    'frame_source_url': frame_url,
                    'ai_enabled': True,
                    'detection_type': 'street',
                    'province': spec['province'],
                    'district': spec['district'],
                    'street': spec['street'],
                    'resolution': '1080p',
                    'latitude': Decimal(f"{spec['lat']:.7f}"),
                    'longitude': Decimal(f"{spec['lng']:.7f}"),
                    'detection_count_today': spec.get('detections', 0),
                    'last_ping': now if spec['status'] == 'active' else None,
                    'last_sync_at': now if spec['status'] == 'active' else None,
                    'fps': 25,
                    'recording_enabled': spec['status'] == 'active',
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
            f'Cambodia CCTV fleet ready ({created} created, {updated} updated). '
            f'Roads={Road.objects.count()}, Cameras={Camera.objects.count()}.',
        ))
        self.stdout.write('AI Detection → Live Camera, or Camera Feeds (/admin/cameras).')
        self.stdout.write(
            'Production: set Camera.frame_source_url to HTTP snapshot or RTSP '
            '(+ STREAM_GATEWAY_URL for RTSP).',
        )

    def _sync_cctv_media(self) -> None:
        """Copy Phnom Penh street stills into MEDIA_ROOT/cctv for live YOLO capture."""
        repo = Path(getattr(settings, 'REPO_ROOT', Path(settings.BASE_DIR).resolve().parents[1]))
        sources = [
            repo / 'ai' / 'datasets' / 'samples' / 'live_camera_frames',
            repo / 'src' / 'web' / 'admin' / 'public' / 'demo-cameras',
            repo / 'src' / 'web' / 'user' / 'public' / 'demo-cameras',
        ]
        dest = Path(settings.MEDIA_ROOT) / 'cctv'
        dest.mkdir(parents=True, exist_ok=True)
        names = ('monivong-intersection.jpg', 'monivong-ptz.jpg', 'nr6-highway.jpg')
        for name in names:
            target = dest / name
            for src_dir in sources:
                src = src_dir / name
                if src.is_file():
                    if not target.exists() or target.stat().st_mtime < src.stat().st_mtime:
                        shutil.copy2(src, target)
                    break
        # Also keep legacy demo-cameras copies for older absolute paths during transition.
        legacy = Path(settings.MEDIA_ROOT) / 'demo-cameras'
        if legacy.is_dir() or any((s / names[0]).is_file() for s in sources):
            legacy.mkdir(parents=True, exist_ok=True)
            for name in names:
                target = legacy / name
                src = dest / name
                if src.is_file() and (not target.exists() or target.stat().st_mtime < src.stat().st_mtime):
                    shutil.copy2(src, target)
