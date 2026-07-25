"""Generate and attach registration photos for vehicles missing images.

Usage:
  python manage.py seed_vehicle_photos
  python manage.py seed_vehicle_photos --limit 50
  python manage.py seed_vehicle_photos --force
"""
from __future__ import annotations

import hashlib
import io
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db.models import Q
from PIL import Image, ImageDraw, ImageFont

from vehicles.models import Vehicle

COLOR_MAP = {
    'white': (245, 245, 245),
    'black': (30, 30, 30),
    'silver': (180, 185, 190),
    'grey': (140, 145, 150),
    'gray': (140, 145, 150),
    'red': (200, 45, 45),
    'blue': (40, 100, 200),
    'green': (40, 140, 80),
    'yellow': (230, 190, 40),
    'orange': (230, 120, 40),
}


def _body_color(color_name: str) -> tuple[int, int, int]:
    c = (color_name or '').lower()
    for key, rgb in COLOR_MAP.items():
        if key in c:
            return rgb
    digest = hashlib.md5(c.encode()).hexdigest()
    return (int(digest[0:2], 16) % 160 + 40, int(digest[2:4], 16) % 160 + 40, int(digest[4:6], 16) % 160 + 40)


def _draw_car(draw: ImageDraw.ImageDraw, body: tuple[int, int, int], w: int, h: int) -> None:
    # Body
    draw.rounded_rectangle((90, 170, w - 90, 280), radius=28, fill=body)
    # Cabin
    cabin = tuple(max(0, min(255, x - 25)) for x in body)
    draw.rounded_rectangle((180, 110, w - 180, 180), radius=18, fill=cabin)
    # Windows
    draw.rounded_rectangle((200, 120, 300, 165), radius=8, fill=(180, 210, 230))
    draw.rounded_rectangle((320, 120, w - 200, 165), radius=8, fill=(180, 210, 230))
    # Wheels
    draw.ellipse((140, 250, 220, 330), fill=(40, 40, 45))
    draw.ellipse((w - 220, 250, w - 140, 330), fill=(40, 40, 45))
    draw.ellipse((158, 268, 202, 312), fill=(120, 120, 125))
    draw.ellipse((w - 202, 268, w - 158, 312), fill=(120, 120, 125))


def _draw_motorcycle(draw: ImageDraw.ImageDraw, body: tuple[int, int, int], w: int, h: int) -> None:
    draw.ellipse((120, 230, 220, 330), fill=(40, 40, 45))
    draw.ellipse((w - 220, 230, w - 120, 330), fill=(40, 40, 45))
    draw.ellipse((145, 255, 195, 305), fill=(130, 130, 135))
    draw.ellipse((w - 195, 255, w - 145, 305), fill=(130, 130, 135))
    draw.polygon([(180, 240), (280, 150), (360, 150), (420, 240)], fill=body)
    draw.rounded_rectangle((250, 145, 340, 175), radius=10, fill=tuple(max(0, x - 30) for x in body))
    draw.line([(200, 250), (420, 250)], fill=(50, 50, 55), width=8)


def _draw_truck(draw: ImageDraw.ImageDraw, body: tuple[int, int, int], w: int, h: int) -> None:
    draw.rounded_rectangle((70, 150, 220, 280), radius=16, fill=body)
    draw.rounded_rectangle((210, 120, w - 70, 280), radius=12, fill=tuple(max(0, x - 20) for x in body))
    draw.rounded_rectangle((90, 165, 180, 215), radius=8, fill=(180, 210, 230))
    for cx in (130, 280, 400, 520):
        draw.ellipse((cx - 35, 255, cx + 35, 325), fill=(40, 40, 45))
        draw.ellipse((cx - 18, 272, cx + 18, 308), fill=(120, 120, 125))


def _draw_bus(draw: ImageDraw.ImageDraw, body: tuple[int, int, int], w: int, h: int) -> None:
    draw.rounded_rectangle((70, 110, w - 70, 280), radius=20, fill=body)
    for x0 in range(100, w - 140, 90):
        draw.rounded_rectangle((x0, 135, x0 + 70, 195), radius=8, fill=(180, 210, 230))
    for cx in (150, 320, 490):
        draw.ellipse((cx - 38, 250, cx + 38, 326), fill=(40, 40, 45))
        draw.ellipse((cx - 18, 270, cx + 18, 306), fill=(120, 120, 125))


def _draw_tuktuk(draw: ImageDraw.ImageDraw, body: tuple[int, int, int], w: int, h: int) -> None:
    draw.rounded_rectangle((160, 140, w - 160, 270), radius=22, fill=body)
    draw.rounded_rectangle((200, 100, w - 200, 155), radius=14, fill=tuple(max(0, x - 25) for x in body))
    draw.rounded_rectangle((220, 110, w - 220, 145), radius=8, fill=(180, 210, 230))
    draw.ellipse((180, 245, 260, 325), fill=(40, 40, 45))
    draw.ellipse((w - 260, 245, w - 180, 325), fill=(40, 40, 45))
    draw.ellipse((200, 265, 240, 305), fill=(120, 120, 125))
    draw.ellipse((w - 240, 265, w - 200, 305), fill=(120, 120, 125))


DRAWERS = {
    'car': _draw_car,
    'motorcycle': _draw_motorcycle,
    'truck': _draw_truck,
    'bus': _draw_bus,
    'tuk-tuk': _draw_tuktuk,
}


def render_vehicle_photo(vehicle: Vehicle) -> bytes:
    w, h = 640, 400
    img = Image.new('RGB', (w, h), (232, 238, 245))
    draw = ImageDraw.Draw(img)
    # Soft sky gradient band
    for y in range(0, 140):
        tone = 210 + int(y * 0.15)
        draw.line([(0, y), (w, y)], fill=(tone, tone + 8, min(255, tone + 18)))
    # Ground
    draw.rectangle((0, 300, w, h), fill=(210, 216, 222))

    body = _body_color(vehicle.color or 'silver')
    drawer = DRAWERS.get(vehicle.vehicle_type, _draw_car)
    drawer(draw, body, w, h)

    # Plate badge
    plate = (vehicle.plate_number or 'N/A')[:14]
    draw.rounded_rectangle((w // 2 - 90, 340, w // 2 + 90, 378), radius=8, fill=(255, 255, 255), outline=(30, 30, 30), width=2)
    try:
        font = ImageFont.truetype('arial.ttf', 20)
        small = ImageFont.truetype('arial.ttf', 14)
    except OSError:
        font = ImageFont.load_default()
        small = font
    draw.text((w // 2, 359), plate, fill=(20, 20, 20), font=font, anchor='mm')
    label = f'{(vehicle.model or vehicle.vehicle_type or "Vehicle")[:28]}'
    draw.text((24, 18), label, fill=(40, 50, 65), font=small)

    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=88)
    return buf.getvalue()


class Command(BaseCommand):
    help = 'Attach generated registration photos to vehicles that have none'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=0, help='Max vehicles to update (0 = all)')
        parser.add_argument('--force', action='store_true', help='Replace existing photos too')

    def handle(self, *args, **options):
        qs = Vehicle.objects.all().order_by('plate_number')
        if not options['force']:
            qs = Vehicle.objects.filter(
                Q(registration_photo='') | Q(registration_photo__isnull=True)
            ).order_by('plate_number')
        limit = options['limit']
        if limit and limit > 0:
            qs = qs[:limit]

        updated = 0
        for vehicle in qs.iterator():
            jpeg = render_vehicle_photo(vehicle)
            safe_plate = ''.join(ch if ch.isalnum() else '-' for ch in (vehicle.plate_number or 'vehicle'))[:24]
            name = f'{safe_plate}-{vehicle.vehicle_type or "car"}.jpg'
            vehicle.registration_photo.save(name, ContentFile(jpeg), save=True)
            updated += 1
            if updated % 50 == 0:
                self.stdout.write(f'  … {updated} photos')

        self.stdout.write(self.style.SUCCESS(f'Vehicle photos attached: {updated}'))
        media_hint = Path('media/vehicles/registration')
        self.stdout.write(f'  Stored under MEDIA_ROOT/{media_hint.as_posix()}/')
