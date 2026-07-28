"""Restore traffic-sign catalog images from local Cambodia reference art.

R2 public URLs for sign images are currently 403 / missing. This command copies
reference PNGs into MEDIA_ROOT/signs/ and rebinds TrafficSign.image so the SPA
can load them via the Vite /media proxy.

Also rematches blank/transparent code-named files (I-001.png, …) onto good
slug-named copies already under MEDIA_ROOT/signs (CLOSE-FOR-ALL-ROAD-USERS.png).
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from traffic_signs.models import TrafficSign

REPO_ROOT = getattr(settings, 'REPO_ROOT', None) or Path(settings.BASE_DIR).resolve().parents[1]
REPO_AI = Path(REPO_ROOT) / 'ai'
META_PATH = REPO_AI / 'reference_sign_meta.json'
# Dim Sareach pack lives next to Project/: .../Expert System/Reference(PDF Download)/...
# CamTraffic repo is .../Expert System/Project/CamTraffic
_EXPERT_SYSTEM = Path(REPO_ROOT).resolve().parent.parent
YOLO_DATASET = (
    _EXPERT_SYSTEM
    / 'Reference(PDF Download)'
    / 'Dim Sareach'
    / 'Image Dataset'
    / 'Traffic Sign Detection Model (YOLOv8)'
)
REFERENCE_DIRS = [
    YOLO_DATASET,
    REPO_AI / 'datasets' / 'external' / 'cambodia_sign_reference',
    REPO_AI / 'datasets' / 'external' / 'Road signs in Cambodia',
    Path(settings.MEDIA_ROOT) / 'signs',
]


def _norm(text: str) -> str:
    s = re.sub(r'[^a-z0-9]+', '', (text or '').lower())
    # Reference exports often use Close vs Closed
    return s.replace('closedfor', 'closefor').replace('closedto', 'closeto')


def _is_random_suffix(stem: str) -> bool:
    return bool(re.search(r'_[A-Za-z0-9]{7}$', stem or ''))


def _visible_pixels(path: Path) -> int:
    try:
        from PIL import Image

        im = Image.open(path).convert('RGBA')
        return sum(1 for a in im.split()[3].getdata() if a > 24)
    except Exception:
        return -1


def _index_reference_files() -> dict[str, Path]:
    index: dict[str, tuple[int, Path]] = {}
    for root in REFERENCE_DIRS:
        if not root.is_dir():
            continue
        for path in (root.iterdir() if root.name == 'signs' else root.rglob('*')):
            if not getattr(path, 'is_file', lambda: False)():
                continue
            if path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp', '.avif'}:
                continue
            # Prefer non-blank artwork; skip already-broken code files as sources.
            vis = _visible_pixels(path)
            if vis < 200:
                continue
            stem = path.stem
            base = re.sub(r'_[A-Za-z0-9]{7}$', '', stem)
            score = (0 if _is_random_suffix(stem) else 2) + (1 if path.suffix.lower() == '.png' else 0)
            path_l = str(path).lower()
            # Prefer the Dim Sareach YOLOv8 reference pack over local blank/slug copies
            if 'traffic sign detection model' in path_l or 'yolov8' in path_l:
                score += 12
            elif 'cambodia_sign_reference' in path_l or 'road signs' in path_l:
                score += 5
            # Deprioritize MEDIA_ROOT/signs so we don't re-copy blank or wrong rematches
            media_marker = str(Path(settings.MEDIA_ROOT) / 'signs').lower().replace('\\', '/')
            if media_marker in path_l.replace('\\', '/'):
                score -= 3
            for key in {_norm(stem), _norm(base), _norm(path.name)}:
                prev = index.get(key)
                if prev is None or score > prev[0]:
                    index[key] = (score, path)
    return {k: v[1] for k, v in index.items()}


class Command(BaseCommand):
    help = 'Copy Cambodia reference sign images into MEDIA_ROOT and rebind TrafficSign.image'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Overwrite existing local files even if already present',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Optional max signs to restore (0 = all)',
        )
        parser.add_argument(
            '--clear-blank',
            action='store_true',
            help='Clear TrafficSign.image when no usable artwork is found',
        )

    def handle(self, *args, **options):
        by_code: dict[str, dict] = {}
        if META_PATH.is_file():
            meta = json.loads(META_PATH.read_text(encoding='utf-8'))
            for row in meta.values():
                code = (row.get('sign_code') or '').strip().upper().replace('_', '-')
                if code:
                    by_code[code] = row
        else:
            self.stderr.write(f'Missing meta: {META_PATH} (name matching only)')

        ref_index = _index_reference_files()
        if not ref_index:
            self.stderr.write('No reference images found under cambodia_sign_reference or MEDIA_ROOT/signs')
            return

        dest_dir = Path(settings.MEDIA_ROOT) / 'signs'
        dest_dir.mkdir(parents=True, exist_ok=True)

        restored = skipped = missing = cleared = 0
        qs = TrafficSign.objects.all().order_by('sign_code')
        if options['limit']:
            qs = qs[: options['limit']]

        for sign in qs:
            code = (sign.sign_code or '').strip().upper().replace('_', '-')
            row = by_code.get(code) or {}
            current = Path(settings.MEDIA_ROOT) / (sign.image.name or '') if sign.image else None
            current_ok = (
                current is not None
                and current.is_file()
                and _visible_pixels(current) >= 200
                and not options['force']
            )
            if current_ok:
                skipped += 1
                continue

            source_file = (row.get('source_file') or '').strip()
            src: Path | None = None
            for key in (
                source_file,
                Path(source_file).stem if source_file else '',
                row.get('sign_name_en'),
                sign.sign_name_en,
                sign.sign_name,
                code,
            ):
                if not key:
                    continue
                hit = ref_index.get(_norm(str(key))) or ref_index.get(_norm(Path(str(key)).stem))
                if hit:
                    src = hit
                    break

            # Fuzzy contain match for Close/Closed and shortened titles
            if src is None:
                needles = [
                    _norm(str(k))
                    for k in (source_file, row.get('sign_name_en'), sign.sign_name_en, sign.sign_name)
                    if k
                ]
                best: tuple[int, Path] | None = None
                for needle in needles:
                    if len(needle) < 6:
                        continue
                    for key, path in ref_index.items():
                        if needle in key or key in needle:
                            score = 100 - abs(len(key) - len(needle))
                            if best is None or score > best[0]:
                                best = (score, path)
                if best:
                    src = best[1]

            if src is None or not src.is_file():
                missing += 1
                if options['clear_blank'] and sign.image:
                    sign.image = None
                    sign.save(update_fields=['image'])
                    cleared += 1
                continue

            dest_name = f'signs/{code}.png'
            dest = Path(settings.MEDIA_ROOT) / dest_name
            dest.parent.mkdir(parents=True, exist_ok=True)

            if src.resolve() != dest.resolve():
                if src.suffix.lower() == '.png':
                    shutil.copy2(src, dest)
                else:
                    try:
                        from PIL import Image

                        Image.open(src).convert('RGBA').save(dest, format='PNG')
                    except Exception:
                        shutil.copy2(src, dest.with_suffix(src.suffix))
                        dest_name = f'signs/{code}{src.suffix.lower()}'
                        dest = Path(settings.MEDIA_ROOT) / dest_name

            if (sign.image.name or '') != dest_name:
                sign.image.name = dest_name
                sign.save(update_fields=['image'])
            restored += 1
            self.stdout.write(f'  ✓ {code} ← {src.name}')

        self.stdout.write(self.style.SUCCESS(
            f'Restored {restored} sign image(s); skipped {skipped}; missing {missing}; cleared {cleared}'
        ))
        self.stdout.write(f'Local media: {dest_dir}')
