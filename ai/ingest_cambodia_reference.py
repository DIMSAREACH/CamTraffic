#!/usr/bin/env python
"""
Build reference_sign_meta.json + filename stem map from:
  Reference(...)/Dim Sareach/Road signs in Cambodia/

Run before build_dataset.py:
  python ingest_cambodia_reference.py
  python ingest_cambodia_reference.py --khmer-via-gemini   # optional Khmer text for new signs
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CAMBODIA_ROOT = (
    ROOT.parent.parent.parent
    / 'Reference(PDF Download)'
    / 'Dim Sareach'
    / 'Road signs in Cambodia'
)
META_PATH = ROOT / 'reference_sign_meta.json'
STEM_MAP_PATH = ROOT / 'cambodia_stem_to_class.json'
DOCS_PATH = ROOT.parent / 'data' / 'traffic_signs' / 'SIGNS_BY_CATEGORY.md'

IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp'}

FOLDER_TO_CATEGORY: dict[str, str] = {
    'Prohibitory signs': 'prohibitory',
    'Warning signs': 'warning',
    'Mandatory signs': 'mandatory',
    'Priority signs': 'mandatory',
    'Information signs': 'informative',
    'Direction signs': 'informative',
    'Temporary signs': 'warning',
    'Built-up area and boundary signs': 'informative',
    'Additional signs': 'informative',
    'Signposts': 'informative',
    'Street name signs': 'informative',
    'Road markings': 'informative',
}

CATEGORY_CODE_PREFIX = {
    'prohibitory': 'P',
    'warning': 'W',
    'mandatory': 'M',
    'informative': 'I',
}

YOLO_SKIP_FOLDERS = {'Road markings'}  # flat markings — keep in catalog, skip YOLO by default


def _norm_name(text: str) -> str:
    return re.sub(r'\s+', ' ', (text or '').strip().lower())


def _norm_stem(stem: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', stem.lower())


def _class_key_from_stem(category: str, stem: str) -> str:
    prefix = CATEGORY_CODE_PREFIX.get(category, 'I')
    body = re.sub(r'[^A-Za-z0-9]+', '_', stem).strip('_').upper()
    if len(body) > 40:
        body = body[:40].rstrip('_')
    return f'{prefix}_{body}' if body else f'{prefix}_SIGN'


def _short_sign_code(category: str, index: int, legacy_code: str | None = None) -> str:
    if legacy_code and len(legacy_code) <= 20:
        return legacy_code
    prefix = CATEGORY_CODE_PREFIX.get(category, 'I')
    return f'{prefix}-{index:03d}'


def _meaning_en(name_en: str, category: str) -> tuple[str, str, str]:
    """Short description + driver guidance in English."""
    cat = category.replace('_', ' ')
    desc = f'{name_en} — {cat} sign used on Cambodian roads.'
    guidance = {
        'prohibitory': f'Follow the prohibition shown by this sign: {name_en}.',
        'warning': f'Slow down and be prepared for the hazard: {name_en}.',
        'mandatory': f'You must obey this mandatory instruction: {name_en}.',
        'informative': f'Use this information for navigation or road context: {name_en}.',
    }.get(category, f'Observe this traffic sign: {name_en}.')
    return desc, guidance, desc


def load_legacy_meta() -> dict[str, dict]:
    if not META_PATH.is_file():
        return {}
    try:
        return json.loads(META_PATH.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return {}


def build_legacy_name_index(meta: dict[str, dict]) -> dict[str, dict]:
    index: dict[str, dict] = {}
    for class_key, row in meta.items():
        for field in ('sign_name_en', 'sign_name', 'sign_name_km'):
            val = _norm_name(row.get(field, ''))
            if val:
                index[val] = {**row, 'class_key': class_key}
    return index


def collect_images(root: Path) -> list[tuple[str, str, Path]]:
    """Return list of (category_slug, english_name, path)."""
    items: list[tuple[str, str, Path]] = []
    if not root.is_dir():
        return items
    for folder in sorted(root.iterdir()):
        if not folder.is_dir():
            continue
        category = FOLDER_TO_CATEGORY.get(folder.name, 'informative')
        for path in sorted(folder.rglob('*')):
            if path.suffix.lower() not in IMAGE_EXTS:
                continue
            name_en = path.stem.strip()
            items.append((category, name_en, path))
    return items


def khmer_via_gemini_batch(rows: list[dict]) -> None:
    """Fill missing Khmer fields using Gemini text API (optional)."""
    import requests

    backend = ROOT.parent / 'backend'
    if str(backend) not in sys.path:
        sys.path.insert(0, str(backend))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    try:
        import django
        django.setup()
        from django.conf import settings
        from ai_detection.gemini_service import _requests_verify, gemini_available
    except Exception as exc:
        print(f'Skip Khmer via Gemini: {exc}')
        return
    if not gemini_available():
        print('Gemini not available — Khmer text only from legacy matches.')
        return

    pending = [r for r in rows if r.get('sign_name_km') == r.get('sign_name_en')]
    if not pending:
        return

    model = getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash')
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    headers = {'Content-Type': 'application/json', 'x-goog-api-key': settings.GEMINI_API_KEY}

    import time

    # Determine SSL verify once; fall back to False on first SSLError (Windows cert issue)
    ssl_verify = _requests_verify()

    chunk_size = 4
    for i in range(0, len(pending), chunk_size):
        chunk = pending[i:i + chunk_size]
        lines = '\n'.join(
            f'- {r["class_key"]}: {r["sign_name_en"]} ({r["category"]})'
            for r in chunk
        )
        prompt = (
            'For each Cambodia traffic sign below, write SHORT Khmer text.\n'
            'Return JSON array only:\n'
            '[{"class_key":"...","sign_name_km":"...","description":"...","guidance":"..."}]\n'
            f'Signs:\n{lines}'
        )
        for attempt in range(5):
            try:
                response = requests.post(
                    url,
                    headers=headers,
                    json={
                        'contents': [{'parts': [{'text': prompt}]}],
                        'generationConfig': {'temperature': 0.2, 'responseMimeType': 'application/json'},
                    },
                    timeout=45,
                    verify=ssl_verify,
                )
                if response.status_code in (429, 503) and attempt < 4:
                    time.sleep(8 * (attempt + 1))
                    continue
                response.raise_for_status()
                break
            except requests.exceptions.SSLError:
                # Windows SSL cert chain issue — disable verification and retry immediately
                ssl_verify = False
                continue
            except requests.RequestException as exc:
                if attempt < 4:
                    time.sleep(8 * (attempt + 1))
                    continue
                print(f'Khmer batch skip: {exc}')
                break
        try:
            if not response.ok:
                continue
            text = response.json()['candidates'][0]['content']['parts'][0]['text']
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                parsed = [parsed]
            by_key = {p.get('class_key'): p for p in parsed if isinstance(p, dict)}
            for row in chunk:
                hit = by_key.get(row['class_key'])
                if not hit:
                    continue
                row['sign_name_km'] = hit.get('sign_name_km') or row['sign_name_km']
                row['sign_name'] = row['sign_name_km']
                if hit.get('description'):
                    row['description'] = hit['description']
                if hit.get('guidance'):
                    row['guidance'] = hit['guidance']
        except Exception as exc:
            print(f'Khmer batch skip: {exc}')
    print('Khmer enrichment pass complete.')


def write_category_doc(meta: dict[str, dict], by_category: dict[str, list[str]]) -> None:
    lines = [
        '# Cambodia Road Signs — By Category',
        '',
        'Source: `Road signs in Cambodia` reference folder.',
        '',
        '| Category | Signs |',
        '|----------|------:|',
    ]
    for cat in sorted(by_category.keys()):
        lines.append(f'| {cat} | {len(by_category[cat])} |')
    lines.append('')
    for cat in sorted(by_category.keys()):
        lines.append(f'## {cat.title()} ({len(by_category[cat])})')
        lines.append('')
        for class_key in sorted(by_category[cat]):
            row = meta[class_key]
            lines.append(f'### {row.get("sign_name_en", class_key)}')
            lines.append(f'- **Code:** `{row.get("sign_code", "")}` · **class_key:** `{class_key}`')
            if row.get('sign_name_km'):
                lines.append(f'- **Khmer:** {row["sign_name_km"]}')
            lines.append(f'- **Meaning:** {row.get("description_en", "")}')
            lines.append(f'- **Guidance:** {row.get("guidance_en", "")}')
            lines.append('')
    DOCS_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOCS_PATH.write_text('\n'.join(lines), encoding='utf-8')
    print(f'Wrote {DOCS_PATH}')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=CAMBODIA_ROOT)
    parser.add_argument('--khmer-via-gemini', action='store_true')
    parser.add_argument('--include-road-markings-yolo', action='store_true')
    args = parser.parse_args()

    legacy = load_legacy_meta()
    name_index = build_legacy_name_index(legacy)

    images = collect_images(args.root)
    if not images:
        raise SystemExit(f'No images under {args.root}')

    meta: dict[str, dict] = {}
    stem_map: dict[str, str] = {}
    by_category: dict[str, list[str]] = {}
    counters: dict[str, int] = {k: 0 for k in CATEGORY_CODE_PREFIX}

    for category, name_en, path in images:
        folder_name = path.parent.name if path.parent != args.root else ''
        if folder_name in YOLO_SKIP_FOLDERS and not args.include_road_markings_yolo:
            pass  # still in catalog

        norm = _norm_name(name_en)
        legacy_hit = name_index.get(norm)
        if legacy_hit:
            class_key = legacy_hit.get('class_key') or _class_key_from_stem(category, path.stem)
            sign_code = legacy_hit.get('sign_code', '')
            row = {
                'sign_code': sign_code or _short_sign_code(category, counters[category] + 1),
                'sign_name_km': legacy_hit.get('sign_name_km') or legacy_hit.get('sign_name', name_en),
                'sign_name_en': legacy_hit.get('sign_name_en') or name_en,
                'category': legacy_hit.get('category') or category,
                'description': legacy_hit.get('description', ''),
                'description_en': legacy_hit.get('description_en', ''),
                'guidance': legacy_hit.get('guidance', ''),
                'guidance_en': legacy_hit.get('guidance_en', ''),
                'source_folder': folder_name,
                'source_file': path.name,
            }
        else:
            counters[category] = counters.get(category, 0) + 1
            class_key = _class_key_from_stem(category, path.stem)
            # avoid duplicate class keys
            base_key = class_key
            n = 2
            while class_key in meta:
                class_key = f'{base_key}_{n}'
                n += 1
            desc_en, guide_en, _ = _meaning_en(name_en, category)
            row = {
                'sign_code': _short_sign_code(category, counters[category]),
                'sign_name_km': name_en,
                'sign_name_en': name_en,
                'category': category,
                'description': desc_en,
                'description_en': desc_en,
                'guidance': guide_en,
                'guidance_en': guide_en,
                'source_folder': folder_name,
                'source_file': path.name,
            }

        row['sign_name'] = row['sign_name_km']
        row['class_key'] = class_key
        if not row.get('description_en'):
            row['description_en'] = row['description']
        if not row.get('guidance_en'):
            row['guidance_en'] = row['guidance']

        meta[class_key] = row
        stem_map[_norm_stem(path.stem)] = class_key
        by_category.setdefault(category, []).append(class_key)

    if args.khmer_via_gemini:
        khmer_via_gemini_batch(list(meta.values()))

    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    stem_map['_folder_category'] = FOLDER_TO_CATEGORY  # type: ignore[assignment]
    stem_map['_yolo_skip_folders'] = list(YOLO_SKIP_FOLDERS)  # type: ignore[assignment]
    STEM_MAP_PATH.write_text(json.dumps(stem_map, ensure_ascii=False, indent=2), encoding='utf-8')
    write_category_doc(meta, by_category)

    yolo_count = sum(
        1 for _, _, p in images
        if p.parent.name not in YOLO_SKIP_FOLDERS or args.include_road_markings_yolo
    )
    print(f'Catalog: {len(meta)} signs from {len(images)} images')
    print(f'YOLO-eligible images: {yolo_count}')
    print(f'Wrote {META_PATH}')
    print(f'Wrote {STEM_MAP_PATH}')
    print('Next: python build_dataset.py --augments 6')


if __name__ == '__main__':
    main()
