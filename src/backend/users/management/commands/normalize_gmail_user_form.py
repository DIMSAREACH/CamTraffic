"""Rewrite user emails/names to the thesis Gmail form used by Korb Kimheang.

Form:
  full_name → "Korb Kimheang"  (Title Case Given Family)
  email     → korbkimheang18@gmail.com  (lowercase given+family + 2 digits + @gmail.com)

Preserves system demo logins (*@camtraffic.demo / *.gov.kh) and already-correct Gmail forms
when --force is not set. Idempotent.
"""
from __future__ import annotations

import hashlib
import re

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()

# Login accounts used in docs / E2E — email stays; name still normalized when needed.
KEEP_EMAIL_SUFFIXES = ('@camtraffic.demo', '@camtraffic.gov.kh', '@traffic.kh', '@police.gov.kh')
KEEP_EMAILS = {
    'korbkimheang18@gmail.com',
    'dimsareach009@gmail.com',
}

KH_FIRST = [
    'Sokha', 'Dara', 'Sophea', 'Vannak', 'Chenda', 'Rithy', 'Pisey', 'Bopha',
    'Makara', 'Srey', 'Nita', 'Vichea', 'Pheak', 'Sothea', 'Kanha', 'Rotha',
    'Sopheak', 'Dalin', 'Ravy', 'Sokun', 'Thida', 'Vuthy', 'Sreymom', 'Panha',
    'Bora', 'Neang', 'Kosal', 'Vanna', 'Ratana', 'Chamroeun', 'Sopheap', 'Mony',
    'Phalla', 'Sreyleak', 'Vibol', 'Sreynich', 'Chantha', 'Kimseng', 'Arun', 'Seyha',
    'Korb', 'Dim',
]

KH_LAST = [
    'Sok', 'Chan', 'Kim', 'Chea', 'Hun', 'Lim', 'Meas', 'Pich',
    'Phan', 'Ouk', 'Touch', 'San', 'Keo', 'Nhem', 'Prak', 'Yim',
    'Ly', 'Heng', 'Chhorn', 'Seng', 'Ou', 'Thach', 'Ear', 'Chhim',
    'Mao', 'Ros', 'Sam', 'Dy', 'Khiev', 'Noun', 'Tieng', 'Um',
    'Kimheang', 'Sareach',
]

GMAIL_FORM_RE = re.compile(r'^[a-z]+[0-9]{2,3}@gmail\.com$')


def _stable_int(seed: str, modulo: int) -> int:
    digest = hashlib.sha256(seed.encode('utf-8')).hexdigest()
    return int(digest[:12], 16) % modulo


def _title_name(raw: str, seed: str) -> str:
    parts = re.findall(r'[A-Za-z]+', raw or '')
    if len(parts) >= 2:
        return f'{parts[0].title()} {parts[-1].title()}'
    if len(parts) == 1:
        last = KH_LAST[_stable_int(f'{seed}:last', len(KH_LAST))]
        return f'{parts[0].title()} {last}'
    first = KH_FIRST[_stable_int(f'{seed}:first', len(KH_FIRST))]
    last = KH_LAST[_stable_int(f'{seed}:last', len(KH_LAST))]
    return f'{first} {last}'


def _local_from_name(full_name: str) -> str:
    parts = re.findall(r'[A-Za-z]+', full_name or '')
    first = (parts[0] if parts else 'citizen').lower()
    last = (parts[-1] if len(parts) > 1 else 'kh').lower()
    first = re.sub(r'[^a-z]', '', first) or 'citizen'
    last = re.sub(r'[^a-z]', '', last) or 'kh'
    return f'{first}{last}'


def _gmail_from_name(full_name: str, seed: str, used: set[str]) -> str:
    base = _local_from_name(full_name)
    # Prefer two digits like …18@gmail.com
    n = 10 + _stable_int(f'{seed}:n', 90)
    candidate = f'{base}{n}@gmail.com'
    guard = 0
    while candidate.lower() in used or User.objects.filter(email__iexact=candidate).exists():
        n += 1
        if n > 99:
            n = 10
            base = f'{base}x'
        candidate = f'{base}{n}@gmail.com'
        guard += 1
        if guard > 200:
            candidate = f'{base}{_stable_int(seed, 900) + 100}@gmail.com'
            break
    used.add(candidate.lower())
    return candidate


def _keep_email(email: str) -> bool:
    low = (email or '').strip().lower()
    if low in KEEP_EMAILS:
        return True
    return any(low.endswith(suf) for suf in KEEP_EMAIL_SUFFIXES)


def _already_gmail_form(email: str, full_name: str) -> bool:
    low = (email or '').strip().lower()
    if not GMAIL_FORM_RE.match(low):
        return False
    local = low.split('@', 1)[0]
    # Strip trailing digits
    stem = re.sub(r'\d+$', '', local)
    expect = _local_from_name(full_name)
    return stem == expect or stem.startswith(expect)


class Command(BaseCommand):
    help = (
        'Rewrite User Management emails/names to firstnamelastnameNN@gmail.com '
        '(same form as korbkimheang18@gmail.com)'
    )

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview without writing')
        parser.add_argument(
            '--force',
            action='store_true',
            help='Rewrite even emails that already match the Gmail form',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry = options['dry_run']
        force = options['force']
        used = {
            (u.email or '').strip().lower()
            for u in User.objects.all()
            if u.email
        }
        updated = 0
        skipped = 0

        qs = User.objects.all().order_by('role', 'email')
        # Two-pass: first reserve KEEP emails + already-correct forms, then rewrite others.
        for user in qs:
            email = (user.email or '').strip()
            seed = email.lower() or str(user.pk)
            new_name = _title_name(user.full_name, seed)
            changes: dict[str, str] = {}

            if user.full_name != new_name:
                changes['full_name'] = new_name

            name_for_email = changes.get('full_name', user.full_name)
            if _keep_email(email):
                pass
            elif force or not _already_gmail_form(email, name_for_email) or 'full_name' in changes:
                used.discard(email.lower())
                new_email = _gmail_from_name(name_for_email, seed, used)
                if new_email.lower() != email.lower():
                    changes['email'] = new_email
                else:
                    used.add(email.lower())
            else:
                used.add(email.lower())

            if not changes:
                skipped += 1
                continue

            updated += 1
            preview = ', '.join(f'{k}={v!r}' for k, v in changes.items())
            self.stdout.write(f'  {email} ({user.role}): {preview}')

            if not dry:
                # Email uniqueness: update carefully
                if 'email' in changes:
                    # Temporarily park if colliding (should not with used-set)
                    user.email = changes['email']
                if 'full_name' in changes:
                    user.full_name = changes['full_name']
                user.save(update_fields=list(changes.keys()))

        mode = 'DRY-RUN' if dry else 'APPLIED'
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'[{mode}] Updated {updated} users, unchanged {skipped}, total {qs.count()}',
        ))
        if dry:
            self.stdout.write('Re-run without --dry-run to apply.')
