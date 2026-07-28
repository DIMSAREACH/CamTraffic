"""Rewrite all User profiles to realistic Cambodia data (no sample/demo labels).

Preserves login emails, passwords, roles, and FKs. Idempotent.
"""
from __future__ import annotations

import hashlib
import re

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()

KH_FIRST = [
    'Sokha', 'Dara', 'Sophea', 'Vannak', 'Chenda', 'Rithy', 'Pisey', 'Bopha',
    'Makara', 'Srey', 'Nita', 'Vichea', 'Pheak', 'Sothea', 'Kanha', 'Rotha',
    'Sopheak', 'Dalin', 'Ravy', 'Sokun', 'Thida', 'Vuthy', 'Sreymom', 'Panha',
    'Bora', 'Neang', 'Kosal', 'Vanna', 'Ratana', 'Chamroeun', 'Sopheap', 'Mony',
    'Phalla', 'Sreyleak', 'Vibol', 'Sreynich', 'Chantha', 'Kimseng', 'Arun', 'Seyha',
]

KH_LAST = [
    'Sok', 'Chan', 'Kim', 'Chea', 'Hun', 'Lim', 'Meas', 'Pich',
    'Phan', 'Ouk', 'Touch', 'San', 'Keo', 'Nhem', 'Prak', 'Yim',
    'Ly', 'Heng', 'Chhorn', 'Seng', 'Ou', 'Thach', 'Ear', 'Chhim',
    'Mao', 'Ros', 'Sam', 'Dy', 'Khiev', 'Noun', 'Tieng', 'Um',
]

MOBILE_PREFIXES = [
    '12', '15', '16', '17', '61', '67', '68', '69', '70', '71',
    '76', '77', '78', '79', '81', '85', '87', '89', '92', '95', '96', '97', '98',
]

ADDRESSES = [
    'Monivong Blvd, Chamkarmon, Phnom Penh',
    'Norodom Blvd, Daun Penh, Phnom Penh',
    'Russian Blvd, Tuol Kork, Phnom Penh',
    'Mao Tse Tung Blvd, Boeng Keng Kang, Phnom Penh',
    'Sihanouk Blvd, Independence Monument, Phnom Penh',
    'Sisowath Quay, Riverside, Phnom Penh',
    'Kampuchea Krom Blvd, 7 Makara, Phnom Penh',
    'Veng Sreng Blvd, Mean Chey, Phnom Penh',
    'Street 271, Sen Sok, Phnom Penh',
    'National Road 1, Kien Svay, Kandal',
    'National Road 4, Chaom Chau, Phnom Penh',
    'National Road 5, Prek Pnov, Phnom Penh',
    'National Road 6, Skun Junction, Kampong Cham',
    'Sivatha Blvd, Siem Reap',
    'Street 1, Battambang City Center',
    'Ekareach St, Sihanoukville',
    'Preah Sihanouk Blvd, Kampot',
    'Street 13, Takeo Town',
    'Provincial Road, Kampong Speu',
    'City Center, Prey Veng',
]

# Stable profiles for known thesis login accounts (emails stay the same).
FIXED_PROFILES = {
    'admin@camtraffic.demo': {
        'full_name': 'Sokha Meas',
        'phone': '+855 12 200 001',
        'address': 'Ministry of Public Works and Transport, Phnom Penh',
    },
    'admin@camtraffic.gov.kh': {
        'full_name': 'Sokha Meas',
        'phone': '+855 12 200 001',
        'address': 'Ministry of Public Works and Transport, Phnom Penh',
    },
    'officer@camtraffic.demo': {
        'full_name': 'Dara Chan',
        'phone': '+855 12 111 222',
        'address': 'Phnom Penh Traffic Police HQ, Monivong Blvd, Phnom Penh',
    },
    'officer@camtraffic.gov.kh': {
        'full_name': 'Dara Chan',
        'phone': '+855 12 111 222',
        'address': 'Phnom Penh Traffic Police HQ, Monivong Blvd, Phnom Penh',
    },
    'driver@camtraffic.demo': {
        'full_name': 'Kosal Pich',
        'phone': '+855 16 555 666',
        'address': 'Sen Sok, Phnom Penh',
    },
    'driver@example.com': {
        'full_name': 'Kosal Pich',
        'phone': '+855 16 555 666',
        'address': 'Sen Sok, Phnom Penh',
    },
    'driver2@camtraffic.demo': {
        'full_name': 'Vanna Sok',
        'phone': '+855 77 777 888',
        'address': 'Russei Keo, Phnom Penh',
    },
    'korbkimheang18@gmail.com': {
        'full_name': 'Korb Kimheang',
        'phone': '+855 12 675 733',
        'address': 'Street 271, Sangkat Phnom Penh Thmey, Khan Sen Sok, Phnom Penh',
    },
}

BAD_NAME_RE = re.compile(
    r'(demo|sample|test|admin system|system administrator|^administrator$|john doe|jane smith)',
    re.I,
)
HAS_DIGIT_RE = re.compile(r'\d')


def _stable_int(seed: str, modulo: int) -> int:
    digest = hashlib.sha256(seed.encode('utf-8')).hexdigest()
    return int(digest[:12], 16) % modulo


def _pick_name(seed: str) -> str:
    first = KH_FIRST[_stable_int(f'{seed}:first', len(KH_FIRST))]
    last = KH_LAST[_stable_int(f'{seed}:last', len(KH_LAST))]
    return f'{first} {last}'


def _pick_phone(seed: str) -> str:
    prefix = MOBILE_PREFIXES[_stable_int(f'{seed}:pfx', len(MOBILE_PREFIXES))]
    mid = 100 + _stable_int(f'{seed}:mid', 900)
    last = 100 + _stable_int(f'{seed}:end', 900)
    return f'+855 {prefix} {mid:03d} {last:03d}'


def _pick_address(seed: str) -> str:
    return ADDRESSES[_stable_int(f'{seed}:addr', len(ADDRESSES))]


def _needs_name_fix(name: str) -> bool:
    n = (name or '').strip()
    if not n:
        return True
    if BAD_NAME_RE.search(n):
        return True
    if ' ' not in n:
        return True
    if HAS_DIGIT_RE.search(n):
        return True
    if n.lower().startswith('officer '):
        return True
    return False


def _normalize_phone(phone: str, seed: str) -> str:
    """Return a standard Cambodia mobile: +855 XX XXX XXX with a real operator prefix."""
    raw = (phone or '').strip()
    if re.fullmatch(r'\+855 \d{2} \d{3} \d{3}', raw):
        prefix = raw.split()[1]
        if prefix in MOBILE_PREFIXES:
            return raw

    digits = re.sub(r'\D', '', raw)
    if digits.startswith('855'):
        digits = digits[3:]
    if digits.startswith('0'):
        digits = digits[1:]

    if len(digits) >= 8:
        digits = digits[-8:]
        prefix = digits[:2]
        if prefix in MOBILE_PREFIXES:
            return f'+855 {digits[:2]} {digits[2:5]} {digits[5:]}'

    return _pick_phone(seed)


def _needs_address_fix(address: str) -> bool:
    a = (address or '').strip()
    if not a:
        return True
    if BAD_NAME_RE.search(a):
        return True
    kh_places = (
        'phnom penh', 'siem reap', 'battambang', 'kandal', 'kampong',
        'sihanouk', 'kampot', 'takeo', 'prey veng', 'cambodia', 'blvd',
        'street', 'road',
    )
    low = a.lower()
    return not any(p in low for p in kh_places)


class Command(BaseCommand):
    help = 'Update all users to realistic Cambodia names, +855 phones, and KH addresses (no sample labels)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would change without writing',
        )
        parser.add_argument(
            '--force-all-names',
            action='store_true',
            help='Regenerate every display name (except FIXED_PROFILES), not only bad ones',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry = options['dry_run']
        force_names = options['force_all_names']
        updated = 0
        skipped = 0

        qs = User.objects.all().order_by('role', 'email')
        for user in qs:
            email = (user.email or '').strip().lower()
            seed = email or str(user.pk)
            changes: dict[str, str] = {}

            fixed = FIXED_PROFILES.get(email)
            if fixed:
                if user.full_name != fixed['full_name']:
                    changes['full_name'] = fixed['full_name']
                if user.phone != fixed['phone']:
                    changes['phone'] = fixed['phone']
                if user.address != fixed['address']:
                    changes['address'] = fixed['address']
            else:
                if force_names or _needs_name_fix(user.full_name):
                    new_name = _pick_name(seed)
                    if new_name != user.full_name:
                        changes['full_name'] = new_name

                new_phone = _normalize_phone(user.phone, seed)
                if new_phone != (user.phone or '').strip():
                    changes['phone'] = new_phone

                if _needs_address_fix(user.address):
                    changes['address'] = _pick_address(seed)

            if not changes:
                skipped += 1
                continue

            updated += 1
            preview = ', '.join(f'{k}={v!r}' for k, v in changes.items())
            self.stdout.write(f'  {email} ({user.role}): {preview}')

            if not dry:
                for key, value in changes.items():
                    setattr(user, key, value)
                user.save(update_fields=[*changes.keys()])

        mode = 'DRY-RUN' if dry else 'APPLIED'
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'[{mode}] Updated {updated} users, unchanged {skipped}, total {qs.count()}',
        ))
        if dry:
            self.stdout.write('Re-run without --dry-run to apply.')
