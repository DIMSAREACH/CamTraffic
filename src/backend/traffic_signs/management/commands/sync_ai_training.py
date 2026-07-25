"""Sync DB + .env after YOLO training (sign_catalog.json + custom sign images)."""
import json
import re
import time
from io import BytesIO
from pathlib import Path

import numpy as np
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image

from traffic_signs.models import TrafficSign
from traffic_signs.sign_image_processing import sign_display_png_bytes, sign_png_bytes
from traffic_signs.management.commands.import_cambodia_signs import find_image_for_code

CATALOG_PATH = Path(settings.BASE_DIR).parent / 'ai' / 'sign_catalog.json'
REFERENCE_META_PATH = Path(settings.BASE_DIR).parent / 'ai' / 'reference_sign_meta.json'
CUSTOM_SIGNS_DIR = Path(settings.BASE_DIR).parent / 'ai' / 'custom_signs'
OVERRIDES_PATH = Path(settings.BASE_DIR).parent / 'ai' / 'sign_metadata_overrides.json'
ENV_PATH = Path(settings.BASE_DIR) / '.env'
DEFAULT_MODEL = Path(settings.BASE_DIR).parent / 'ai' / 'weights' / 'best.pt'
TRAINING_STATUS_PATH = Path(settings.BASE_DIR).parent / 'ai' / 'weights' / 'training_status.json'


def _normalize_sign_key(value: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', value.upper())


def _png_visible_pixels(data: bytes) -> int:
    try:
        rgba = np.array(Image.open(BytesIO(data)).convert('RGBA'))
        return int((rgba[:, :, 3] > 24).sum())
    except OSError:
        return 0


def _encode_sign_image(raw: Image.Image, *, for_display: bool = True) -> bytes:
    """Prefer bg-removed PNG; fall back to raw RGBA if processing yields a blank image."""
    encode = sign_display_png_bytes if for_display else sign_png_bytes
    processed = encode(raw)
    if _png_visible_pixels(processed) >= 50:
        return processed
    buf = BytesIO()
    raw.convert('RGBA').save(buf, format='PNG', optimize=True)
    return buf.getvalue()


def _existing_image_visible(sign: TrafficSign) -> bool:
    if not sign.image:
        return False
    try:
        with sign.image.open('rb') as fh:
            return _png_visible_pixels(fh.read()) >= 50
    except OSError:
        return False


def find_custom_image(sign_code: str) -> Path | None:
    code = sign_code.replace('_', '-')
    direct = CUSTOM_SIGNS_DIR / f'Cambodia_road_sign_{code}.svg.png'
    if direct.is_file():
        return direct
    matches = sorted(CUSTOM_SIGNS_DIR.glob(f'Cambodia_road_sign_{code}*.png'))
    if matches:
        return matches[0]
    for ext in ('*.png', '*.jpg', '*.jpeg', '*.webp', '*.avif'):
        for path in sorted(CUSTOM_SIGNS_DIR.glob(ext)):
            if _normalize_sign_key(path.stem) == _normalize_sign_key(code):
                return path
    return None


def _class_key_from_reference_path(path: Path) -> str | None:
    """Reuse ai/build_dataset.py stem → class_key mapping for reference folders."""
    import sys

    ai_root = Path(settings.BASE_DIR).parent / 'ai'
    if str(ai_root) not in sys.path:
        sys.path.insert(0, str(ai_root))
    try:
        from build_dataset import class_key_from_path

        return class_key_from_path(path)
    except ImportError:
        return None


def find_meta_source_image(class_key: str, root: Path) -> Path | None:
    """Match image by source_file recorded in reference_sign_meta.json."""
    if not REFERENCE_META_PATH.is_file() or not root.is_dir():
        return None
    try:
        meta = json.loads(REFERENCE_META_PATH.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return None
    row = meta.get(class_key) or {}
    filename = row.get('source_file')
    if not filename:
        return None
    for path in root.rglob(filename):
        if path.is_file():
            return path
    return None


def find_source_folder_image(sign_code: str, class_key: str, folder: Path | None) -> Path | None:
    """Match reference art in Road signs in Cambodia (recursive)."""
    if not folder or not folder.is_dir():
        return None
    hit = find_meta_source_image(class_key, folder)
    if hit:
        return hit
    targets = {_normalize_sign_key(sign_code), _normalize_sign_key(class_key)}
    for path in sorted(folder.rglob('*')):
        if path.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp'):
            continue
        if _normalize_sign_key(path.stem) in targets:
            return path
        resolved = _class_key_from_reference_path(path)
        if resolved and resolved.upper() == (class_key or '').upper():
            return path
    return None


def update_env_file(env_path: Path, updates: dict[str, str]) -> None:
    lines: list[str] = []
    if env_path.is_file():
        lines = env_path.read_text(encoding='utf-8').splitlines()

    seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in line:
            out.append(line)
            continue
        key = line.split('=', 1)[0].strip()
        if key in updates:
            out.append(f'{key}={updates[key]}')
            seen.add(key)
        else:
            out.append(line)

    for key, value in updates.items():
        if key not in seen:
            out.append(f'{key}={value}')

    env_path.write_text('\n'.join(out) + '\n', encoding='utf-8')


class Command(BaseCommand):
    help = 'After training: import signs from ai/sign_catalog.json and enable live AI model in .env'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model-path',
            type=str,
            default='',
            help='Path to best.pt (default: ai/weights/best.pt)',
        )
        parser.add_argument(
            '--skip-env',
            action='store_true',
            help='Do not modify backend/.env',
        )
        parser.add_argument(
            '--source-dir',
            action='append',
            dest='source_dirs',
            default=[],
            help='Folder with sign images (repeat for 01-Sign, 02-Sign, etc.)',
        )

    def handle(self, *args, **options):
        if not CATALOG_PATH.is_file():
            self.stderr.write(
                self.style.ERROR('Missing ai/sign_catalog.json — run: cd ai && python build_dataset.py')
            )
            return

        catalog = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
        if not catalog:
            self.stderr.write(self.style.ERROR('sign_catalog.json is empty.'))
            return

        overrides: dict = {}
        if OVERRIDES_PATH.is_file():
            overrides = {
                k.upper().replace('_', '-'): v
                for k, v in json.loads(OVERRIDES_PATH.read_text(encoding='utf-8')).items()
            }

        source_dirs = [Path(s).resolve() for s in options.get('source_dirs') or []]

        created = updated = images = 0
        for row in catalog:
            code = row['sign_code']
            merged = {**row, **overrides.get(code.upper().replace('_', '-'), {})}
            defaults = {
                'sign_name': merged.get('sign_name_km') or merged.get('sign_name', code),
                'sign_name_km': merged.get('sign_name_km') or merged.get('sign_name', ''),
                'sign_name_en': merged.get('sign_name_en', ''),
                'category': merged.get('category', 'prohibitory'),
                'description': merged.get('description', ''),
                'description_en': merged.get('description_en', ''),
                'guidance': merged.get('guidance', ''),
                'guidance_en': merged.get('guidance_en', ''),
            }
            sign, was_created = TrafficSign.objects.update_or_create(
                sign_code=code,
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                updated += 1

            class_key = row.get('class_key', code.replace('-', '_'))
            img_path = find_custom_image(code) or find_image_for_code(code)
            if not img_path:
                for folder in source_dirs:
                    img_path = find_source_folder_image(code, class_key, folder)
                    if img_path:
                        break
            if img_path and img_path.is_file():
                with Image.open(img_path) as raw:
                    png_data = _encode_sign_image(raw)
                if _png_visible_pixels(png_data) < 50 and _existing_image_visible(sign):
                    continue
                if _png_visible_pixels(png_data) >= 50:
                    sign.image.save(
                        f'{code}.png',
                        ContentFile(png_data),
                        save=True,
                    )
                    images += 1

        model_path = Path(options['model_path'] or DEFAULT_MODEL).resolve()
        if not options['skip_env'] and ENV_PATH.is_file():
            model_for_env = model_path.as_posix()
            if re.match(r'^[A-Za-z]:/', model_for_env):
                model_for_env = model_for_env.replace('/', '\\')
            update_env_file(
                ENV_PATH,
                {
                    'AI_USE_MOCK': 'False',
                    'AI_MODEL_PATH': model_for_env,
                },
            )
            self.stdout.write(self.style.SUCCESS(f'Updated {ENV_PATH.name}: AI_USE_MOCK=False, AI_MODEL_PATH set'))

        sign_codes = [row['sign_code'] for row in catalog]
        TRAINING_STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
        yolo_class_count = 0
        if model_path.is_file():
            try:
                from ultralytics import YOLO

                yolo_class_count = len(YOLO(str(model_path)).names or {})
            except Exception:
                yolo_class_count = len(catalog)
        TRAINING_STATUS_PATH.write_text(
            json.dumps(
                {
                    'trained_at': time.time(),
                    'sign_codes': sign_codes,
                    'model_path': str(model_path),
                    'training_images': _count_training_images(),
                    'yolo_class_count': yolo_class_count or len(catalog),
                },
                indent=2,
            ),
            encoding='utf-8',
        )

        from ai_detection.services import _refresh_custom_sign_hashes

        _refresh_custom_sign_hashes()

        self.stdout.write(
            self.style.SUCCESS(
                f'Synced {len(catalog)} trained sign(s): {created} created, {updated} updated, {images} image(s). '
                f'Model: {model_path}'
            )
        )
        self.stdout.write(self.style.SUCCESS(f'Wrote {TRAINING_STATUS_PATH.name} for live UI refresh.'))


def _count_training_images() -> int:
    dataset_root = Path(settings.BASE_DIR).parent / 'ai' / 'dataset' / 'images'
    if not dataset_root.is_dir():
        return 0
    total = 0
    for ext in ('*.jpg', '*.jpeg', '*.png', '*.webp', '*.bmp'):
        total += len(list(dataset_root.rglob(ext)))
    return total
