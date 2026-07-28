"""Replace demo/thesis labels and thin location lists with real Cambodia places.

Also diversifies repetitive locations and driver-facing labels so every
portal (admin / officer / citizen) shows believable Khmer traffic data.
"""
from __future__ import annotations

import hashlib
import re

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from fines.models import Fine
from infrastructure.models import Camera, Road
from traffic_signs.models import TrafficSign
from violations.models import TrafficViolation

DEMO_RE = re.compile(
    r'\s*[—\-–]?\s*(Thesis Demo[^.]*|All-Modules Workflow Demo|Workflow Demo|Demo Zone)\s*',
    re.I,
)

# Real corridors used by CamTraffic CCTV / enforcement.
LOCATIONS = [
    'Monivong Blvd & St 214, Chamkarmon, Phnom Penh',
    'Norodom Blvd & St 178, Daun Penh, Phnom Penh',
    'Russian Blvd near Royal University of Phnom Penh',
    'Mao Tse Tung Blvd & St 271, Boeng Keng Kang, Phnom Penh',
    'Sihanouk Blvd, Independence Monument, Phnom Penh',
    'Sisowath Quay, Riverside, Phnom Penh',
    'Kampuchea Krom Blvd, 7 Makara, Phnom Penh',
    'Veng Sreng Blvd, Mean Chey, Phnom Penh',
    'Charles de Gaulle Blvd & St 271, Phnom Penh',
    'National Road 1, Chbar Ampov Bridge, Phnom Penh',
    'National Road 4, Chaom Chau Roundabout, Phnom Penh',
    'National Road 5, Prek Pnov, Phnom Penh',
    'National Road 6, Skun Junction, Kampong Cham',
    'Sivatha Blvd, Old Market, Siem Reap',
    'Pub Street Approach, Siem Reap',
    'Street 1, Battambang City Center',
    'Ekareach St, Port Approach, Sihanoukville',
    'Preah Sihanouk Blvd, Kampot Town',
    'Street 13, Takeo Town Center',
    'Provincial Road, Kampong Speu Market',
]

VIOLATION_REASONS = {
    'SPEEDING': 'Exceeded posted speed limit on Cambodian national road',
    'NO_PARKING': 'Parked where No Parking sign is posted',
    'ILLEGAL_U_TURN': 'Performed U-turn where No U-Turn is indicated',
    'NO_STOPPING': 'Stopped in a No Stopping zone',
    'ROAD_CLOSED': 'Entered a road closed to all vehicles',
    'RED_LIGHT': 'Failed to stop at red traffic signal',
    'NO_ENTRY': 'Entered a No Entry road section',
}


THIN_LOCATIONS = {
    '',
    'phnom penh',
    'siem reap',
    'battambang',
    'phnom penh, chamkarmon',
    'siem reap, old market',
    'battambang, street 1 city center',
}


def _needs_location(value: str | None) -> bool:
    text = (value or '').strip()
    low = text.lower()
    if not text:
        return True
    if 'demo' in low or 'thesis' in low or 'workflow' in low:
        return True
    if low in THIN_LOCATIONS:
        return True
    if len(text) < 18:
        return True
    return False


def _stable_pick(seed: str, items: list[str]) -> str:
    digest = hashlib.sha256(seed.encode('utf-8')).hexdigest()
    return items[int(digest[:8], 16) % len(items)]


def _clean_text(value: str | None, fallback: str = '') -> str:
    text = (value or '').strip()
    if not text:
        return fallback
    cleaned = DEMO_RE.sub(' ', text)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip(' —-–')
    return cleaned or fallback


class Command(BaseCommand):
    help = 'Replace demo/thesis labels with real Cambodia locations and reasons'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')

    @transaction.atomic
    def handle(self, *args, **options):
        dry = options['dry_run']
        updated = {'violations': 0, 'fines': 0, 'cameras': 0, 'roads': 0, 'signs': 0}

        for row in TrafficViolation.objects.all().iterator():
            loc = _clean_text(row.location)
            if _needs_location(loc):
                loc = _stable_pick(f'vloc:{row.id}', LOCATIONS)
            desc = _clean_text(row.description)
            if not desc or 'demo' in (desc or '').lower() or 'workflow' in (desc or '').lower():
                key = (row.violation_type or '').upper()
                desc = VIOLATION_REASONS.get(key, 'Traffic violation under Cambodia traffic law')
            if loc != (row.location or '') or desc != (row.description or ''):
                updated['violations'] += 1
                if not dry:
                    row.location = loc
                    row.description = desc
                    row.save(update_fields=['location', 'description'])

        for row in Fine.objects.all().iterator():
            loc = _clean_text(row.location)
            if _needs_location(loc):
                loc = _stable_pick(f'floc:{row.id}', LOCATIONS)
            reason = _clean_text(row.reason)
            if (
                not reason
                or 'demo' in reason.lower()
                or 'all-modules' in reason.lower()
                or 'workflow' in reason.lower()
            ):
                reason = 'Traffic fine issued under Cambodia traffic enforcement schedule'
            if loc != (row.location or '') or reason != (row.reason or ''):
                updated['fines'] += 1
                if not dry:
                    row.location = loc
                    row.reason = reason
                    row.save(update_fields=['location', 'reason'])

        for cam in Camera.objects.all().iterator():
            changed = False
            name = _clean_text(cam.name, cam.name or 'Traffic Camera')
            desc = _clean_text(getattr(cam, 'description', None) or '')
            if name != (cam.name or ''):
                cam.name = name
                changed = True
            if hasattr(cam, 'description') and desc != (cam.description or ''):
                cam.description = desc
                changed = True
            if changed:
                updated['cameras'] += 1
                if not dry:
                    fields = ['name']
                    if hasattr(cam, 'description'):
                        fields.append('description')
                    cam.save(update_fields=fields)

        for road in Road.objects.all().iterator():
            name = _clean_text(road.name, road.name or 'Road')
            desc = _clean_text(getattr(road, 'description', None) or '')
            changed = False
            if name != (road.name or ''):
                road.name = name
                changed = True
            if hasattr(road, 'description') and desc != (road.description or ''):
                road.description = desc
                changed = True
            if changed:
                updated['roads'] += 1
                if not dry:
                    fields = ['name']
                    if hasattr(road, 'description'):
                        fields.append('description')
                    road.save(update_fields=fields)

        for sign in TrafficSign.objects.all().iterator():
            fields = []
            for attr in ('sign_name', 'sign_name_en', 'description', 'description_en'):
                if not hasattr(sign, attr):
                    continue
                old = getattr(sign, attr) or ''
                new = _clean_text(old, old)
                if new != old:
                    setattr(sign, attr, new)
                    fields.append(attr)
            if fields:
                updated['signs'] += 1
                if not dry:
                    sign.save(update_fields=fields)

        mode = 'DRY-RUN' if dry else 'UPDATED'
        self.stdout.write(self.style.SUCCESS(f'{mode}: {updated}'))
        leftover = TrafficViolation.objects.filter(
            Q(location__icontains='demo') | Q(location__icontains='thesis')
        ).count()
        leftover_f = Fine.objects.filter(
            Q(location__icontains='demo') | Q(location__icontains='thesis')
        ).count()
        self.stdout.write(f'Remaining demo locations — violations: {leftover}, fines: {leftover_f}')
