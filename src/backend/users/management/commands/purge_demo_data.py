"""Deactivate demo/sample accounts and strip demo camera URLs from production DBs."""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

User = get_user_model()

DEMO_EMAIL_SUFFIXES = ('@camtraffic.demo', '@example.com', '@test.local')
DEMO_URL_PATTERNS = (
    '/demo-cameras/',
    '/media/demo-cameras/',
    'picsum.photos',
    'placeholder.com',
    'example.com/camera',
)


class Command(BaseCommand):
    help = 'Purge demo users and demo camera frame URLs for production-truth databases'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Report only')
        parser.add_argument(
            '--deactivate-demo-users',
            action='store_true',
            default=True,
            help='Deactivate *@camtraffic.demo and similar accounts (default)',
        )
        parser.add_argument(
            '--clear-demo-cameras',
            action='store_true',
            default=True,
            help='Clear demo frame_source_url / rtsp values on cameras (default)',
        )
        parser.add_argument(
            '--keep-admin',
            action='store_true',
            help='Keep admin@camtraffic.demo active (thesis defense only)',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']
        if dry:
            self.stdout.write(self.style.WARNING('DRY RUN — no writes'))

        with transaction.atomic():
            if options['deactivate_demo_users']:
                self._purge_demo_users(dry, keep_admin=options['keep_admin'])
            if options['clear_demo_cameras']:
                self._clear_demo_cameras(dry)
            if dry:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS('Production data purge complete'))

    def _purge_demo_users(self, dry: bool, keep_admin: bool = False):
        qs = User.objects.filter(is_active=True)
        deactivated = 0
        for user in qs.iterator():
            email = (user.email or '').lower()
            if keep_admin and email == 'admin@camtraffic.demo':
                continue
            if any(email.endswith(sfx) for sfx in DEMO_EMAIL_SUFFIXES):
                self.stdout.write(f'  deactivate user: {email} ({user.role})')
                if not dry:
                    user.is_active = False
                    user.save(update_fields=['is_active', 'updated_at'] if hasattr(user, 'updated_at') else ['is_active'])
                deactivated += 1
        self.stdout.write(f'Demo users deactivated: {deactivated}')

    def _clear_demo_cameras(self, dry: bool):
        from infrastructure.models import Camera

        cleared = 0
        for cam in Camera.objects.all().iterator():
            frame = cam.frame_source_url or ''
            rtsp = getattr(cam, 'rtsp_url', '') or ''
            dirty = any(p in frame for p in DEMO_URL_PATTERNS) or any(p in rtsp for p in DEMO_URL_PATTERNS)
            if not dirty:
                continue
            self.stdout.write(f'  clear demo URLs: {cam.code or cam.name}')
            if not dry:
                if any(p in frame for p in DEMO_URL_PATTERNS):
                    cam.frame_source_url = ''
                if any(p in rtsp for p in DEMO_URL_PATTERNS):
                    cam.rtsp_url = ''
                cam.save()
            cleared += 1
        self.stdout.write(f'Demo camera URLs cleared: {cleared}')
