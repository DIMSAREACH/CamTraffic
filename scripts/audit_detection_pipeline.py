#!/usr/bin/env python
"""
Audit traffic sign detection pipeline: YOLO class mapping, catalog lookup, upload vs webcam parity.

Read-only — does not modify labels, catalog, or weights.

Usage (from repo root):
  python scripts/audit_detection_pipeline.py
  python scripts/audit_detection_pipeline.py --max-images 120
  python scripts/audit_detection_pipeline.py --prohibitory-only
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import tempfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI_ROOT = ROOT / 'ai'
BACKEND = ROOT / 'backend'
REPORT_DIR = ROOT / 'docs' / 'reports'
MODEL_PATH = AI_ROOT / 'weights' / 'best.pt'
DATA_YAML = AI_ROOT / 'data.yaml'
CATALOG_PATH = AI_ROOT / 'sign_catalog.json'
MEDIA_SIGNS = BACKEND / 'media' / 'signs'
META_PATH = AI_ROOT / 'reference_sign_meta.json'

PROHIBITORY_CODES = {
    'PW03-R1-01', 'PW03-R1-02', 'PW03-R1-03', 'PW03-R1-04',
    'PW03-R2-09', 'PW03-R2-10', 'M-032',
}
CONFUSION_PAIRS = {
    ('NO_ENTRY', 'NO_U_TURN'),
    ('NO_U_TURN', 'NO_ENTRY'),
    ('NO_LEFT_TURN', 'NO_RIGHT_TURN'),
    ('NO_RIGHT_TURN', 'NO_LEFT_TURN'),
    ('PW03-R1-01', 'PW03-R1-02'),
    ('PW03-R1-02', 'PW03-R1-01'),
    ('PW03-R1-03', 'PW03-R1-04'),
    ('PW03-R1-04', 'PW03-R1-03'),
}

PROHIBITORY_SAMPLE_STEMS = (
    'NO-LEFT-TURN.png',
    'NO-RIGHT-TURN.png',
    'NO-U-TURN.png',
    'NO_ENTRY_No entry.png',
    'KH_NO_ENTRY_No entry.png',
    'KH_NOUT_No U-turn.png',
    'KH_STOP_Stop.png',
    'NO-ENTRY-FOR-MOTORCYCLE.png',
    'R1_01_No left turn.png',
    'M-032.png',
    'PW03-R1-01.png',
)

_FILENAME_HINTS: dict[str, str] = {
    'NOLEFTTURN': 'PW03-R1-01',
    'NORIGHTTURN': 'PW03-R1-02',
    'NOUTURN': 'PW03-R1-03',
    'NOENTRY': 'PW03-R1-04',
    'KHNOENTRY': 'PW03-R1-04',
    'KHSTOP': 'M-032',
    'STOP': 'M-032',
    'R101': 'PW03-R1-01',
    'NOENTRYNOENTRY': 'PW03-R1-04',
    'NOENTRYFOREMOTORCYCLE': 'P-016',
    'KHNOUTNOUTURN': 'PW03-R1-03',
    'R101NOLEFTTURN': 'PW03-R1-01',
}


@dataclass
class DetectionTrace:
    image_filename: str
    path: str
    expected_sign_code: str
    mode: str
    yolo_class_id: int | None = None
    yolo_class_name: str = ''
    yolo_class_key: str = ''
    yolo_confidence: float = 0.0
    final_class_key: str = ''
    final_sign_code: str = ''
    final_sign_name: str = ''
    detection_engine: str = ''
    model_path: str = ''
    upload_webcam_match: str = ''
    suspicious: str = ''
    notes: str = ''


@dataclass
class MappingAgg:
    yolo_class_name: str
    yolo_class_id: int
    class_key: str
    sign_code: str
    sign_name: str
    image_count: int = 0
    suspicious: str = ''


def setup_django() -> None:
    sys.path.insert(0, str(BACKEND))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    import django
    django.setup()


def load_yaml_names() -> dict[int, str]:
    names: dict[int, str] = {}
    if not DATA_YAML.is_file():
        return names
    in_names = False
    for line in DATA_YAML.read_text(encoding='utf-8').splitlines():
        if line.strip().startswith('names:'):
            in_names = True
            continue
        if not in_names:
            continue
        if not line.startswith('  '):
            break
        m = re.match(r'\s+(\d+):\s*(.+)\s*$', line)
        if m:
            names[int(m.group(1))] = m.group(2).strip()
    return names


def load_catalog() -> list[dict]:
    return json.loads(CATALOG_PATH.read_text(encoding='utf-8'))


def load_meta_filename_map() -> dict[str, str]:
    """Map normalized filename stem -> sign_code from reference_sign_meta.json."""
    out: dict[str, str] = {}
    if not META_PATH.is_file():
        return out
    meta = json.loads(META_PATH.read_text(encoding='utf-8'))
    for row in meta.values():
        if not isinstance(row, dict):
            continue
        code = (row.get('sign_code') or '').upper()
        src = (row.get('source_file') or '').strip()
        if not code or not src:
            continue
        stem = re.sub(r'[^a-z0-9]+', '', Path(src).stem.lower())
        if stem:
            out[stem] = code
    return out


_META_FILENAME_MAP: dict[str, str] | None = None


def expected_sign_code_from_filename(name: str) -> str:
    global _META_FILENAME_MAP
    if _META_FILENAME_MAP is None:
        _META_FILENAME_MAP = load_meta_filename_map()

    stem_norm = re.sub(r'[^a-z0-9]+', '', Path(name).stem.lower())
    if stem_norm in _FILENAME_HINTS:
        return _FILENAME_HINTS[stem_norm]
    if stem_norm in _META_FILENAME_MAP:
        return _META_FILENAME_MAP[stem_norm]

    from ai_detection.services import _sign_code_from_basename, _sign_code_from_filename
    code = _sign_code_from_filename(name.lower()) or _sign_code_from_basename(name)
    return (code or '').upper()


def resolve_catalog_row(class_key: str, catalog: list[dict]) -> dict | None:
    from ai_detection.services import _canonical_class_key, _catalog_row_for_token
    return _catalog_row_for_token(class_key)


def audit_class_mappings(model_names: dict[int, str], catalog: list[dict]) -> tuple[list[dict], list[dict]]:
    """Build YOLO id -> catalog rows; find duplicates and gaps."""
    from ai_detection.services import YOLO_CLASS_ALIASES, _canonical_class_key, _result_from_class_key

    by_id: list[dict] = []
    id_to_sign: dict[int, str] = {}
    sign_to_ids: dict[str, list[int]] = defaultdict(list)
    key_to_ids: dict[str, list[int]] = defaultdict(list)
    suspicious_rows: list[dict] = []

    for class_id in sorted(model_names):
        raw_name = model_names[class_id]
        canon = _canonical_class_key(raw_name)
        row = resolve_catalog_row(canon, catalog)
        if row:
            sign_code = (row.get('sign_code') or '').upper()
            sign_name = row.get('sign_name_en') or row.get('sign_name') or ''
            class_key = _canonical_class_key(row.get('class_key') or canon)
        else:
            preview = _result_from_class_key(canon, confidence=0)
            sign_code = (preview.get('sign_code') or '').upper()
            sign_name = preview.get('sign_name_en') or preview.get('sign_name') or ''
            class_key = canon
            suspicious_rows.append({
                'issue': 'no_catalog_row',
                'yolo_class_id': class_id,
                'yolo_class_name': raw_name,
                'class_key': class_key,
                'sign_code': sign_code,
            })

        yaml_name = load_yaml_names().get(class_id, '')
        flags = []
        if yaml_name and yaml_name.upper() != raw_name.upper():
            flags.append('yaml_name_mismatch')
        if raw_name.upper() != canon.upper() and canon not in YOLO_CLASS_ALIASES.values():
            alias_hit = YOLO_CLASS_ALIASES.get(_canonical_class_key(raw_name))
            if alias_hit and alias_hit != canon:
                flags.append(f'alias->{alias_hit}')

        entry = {
            'yolo_class_id': class_id,
            'yolo_class_name': raw_name,
            'yaml_class_name': yaml_name,
            'canonical_class_key': class_key,
            'sign_code': sign_code,
            'sign_name_en': sign_name,
            'catalog_found': bool(row),
            'suspicious': ';'.join(flags),
        }
        by_id.append(entry)
        if sign_code:
            sign_to_ids[sign_code].append(class_id)
            id_to_sign[class_id] = sign_code
        key_to_ids[class_key].append(class_id)

    dup_sign: list[dict] = []
    for sign_code, ids in sign_to_ids.items():
        if len(ids) > 1:
            names = [model_names[i] for i in ids]
            dup_sign.append({
                'issue': 'multiple_yolo_ids_same_sign_code',
                'sign_code': sign_code,
                'yolo_class_ids': ','.join(map(str, ids)),
                'yolo_class_names': ' | '.join(names),
            })
            suspicious_rows.append(dup_sign[-1])

    dup_key: list[dict] = []
    for class_key, ids in key_to_ids.items():
        if len(ids) > 1:
            dup_key.append({
                'issue': 'multiple_yolo_ids_same_class_key',
                'class_key': class_key,
                'yolo_class_ids': ','.join(map(str, ids)),
                'yolo_class_names': ' | '.join(model_names[i] for i in ids),
            })
            suspicious_rows.append(dup_key[-1])

    # Catalog class_key uniqueness
    ck_counts: Counter[str] = Counter()
    sc_counts: Counter[str] = Counter()
    for row in catalog:
        ck_counts[(row.get('class_key') or '').upper()] += 1
        sc_counts[(row.get('sign_code') or '').upper()] += 1
    for ck, n in ck_counts.items():
        if ck and n > 1:
            suspicious_rows.append({'issue': 'duplicate_catalog_class_key', 'class_key': ck, 'count': n})
    for sc, n in sc_counts.items():
        if sc and n > 1:
            suspicious_rows.append({'issue': 'duplicate_catalog_sign_code', 'sign_code': sc, 'count': n})

    return by_id, suspicious_rows


def run_yolo_raw(image_path: str, hint: str) -> dict | None:
    from ai_detection.services import _yolo_raw_detect
    return _yolo_raw_detect(image_path, hint_source=hint, unified_prep=True)


def run_full_pipeline(
    image_path: str,
    hint: str,
    *,
    unified_prep: bool = True,
    cleanup_sink: list[str] | None = None,
) -> dict:
    from ai_detection.sign_pipeline import prepare_unified_sign_input
    from ai_detection.pipeline import run_detection_pipeline

    prep = prepare_unified_sign_input(image_path, localize=True)
    if cleanup_sink is not None:
        cleanup_sink.extend(prep.cleanup_paths)
    out = run_detection_pipeline(
        prep.yolo_path,
        original_filename=hint,
        sign_only=True,
        live_fast=False,
        unified_prep=unified_prep,
    )
    result = out['sign_result']
    yolo_raw = result.get('yolo_debug') or {}
    return {
        'result': result,
        'yolo_raw': yolo_raw,
        'engine': result.get('detection_engine', ''),
    }


def trace_image(path: Path, model_path: str) -> tuple[DetectionTrace, DetectionTrace]:
    expected = expected_sign_code_from_filename(path.name)
    upload_hint = f'upload-{path.stem}.jpg'
    webcam_hint = f'webcam-{path.stem}.jpg'
    cleanup: list[str] = []

    try:
        upload = run_full_pipeline(str(path), upload_hint, unified_prep=True, cleanup_sink=cleanup)
        webcam = run_full_pipeline(str(path), webcam_hint, unified_prep=True, cleanup_sink=cleanup)
    finally:
        for p in cleanup:
            Path(p).unlink(missing_ok=True)

    def _build(hint: str, mode: str, payload: dict) -> DetectionTrace:
        res = payload['result']
        raw = payload.get('yolo_raw') or run_yolo_raw(str(path), hint) or {}
        final_code = (res.get('sign_code') or '').upper()
        final_key = (res.get('class_key') or '').upper()
        flags = []
        if expected and final_code and expected != final_code:
            flags.append('expected_mismatch')
        if (expected, final_code) in CONFUSION_PAIRS or (final_code, expected) in CONFUSION_PAIRS:
            flags.append('prohibitory_confusion')
        if not raw:
            flags.append('no_yolo_detection')
        return DetectionTrace(
            image_filename=path.name,
            path=str(path),
            expected_sign_code=expected,
            mode=mode,
            yolo_class_id=raw.get('class_id'),
            yolo_class_name=str(raw.get('class_key') or ''),
            yolo_class_key=(raw.get('class_key') or '').upper(),
            yolo_confidence=float(raw.get('confidence') or 0),
            final_class_key=final_key,
            final_sign_code=final_code,
            final_sign_name=res.get('sign_name_en') or res.get('sign_name') or '',
            detection_engine=str(payload.get('engine') or res.get('detection_engine') or ''),
            model_path=model_path,
            suspicious=';'.join(flags),
        )

    up = _build(upload_hint, 'upload', upload)
    wc = _build(webcam_hint, 'webcam', webcam)
    if up.final_sign_code == wc.final_sign_code and up.final_class_key == wc.final_class_key:
        up.upload_webcam_match = wc.upload_webcam_match = 'match'
    else:
        up.upload_webcam_match = wc.upload_webcam_match = 'mismatch'
        up.suspicious = (up.suspicious + ';upload_webcam_mismatch').strip(';')
        wc.suspicious = (wc.suspicious + ';upload_webcam_mismatch').strip(';')
    return up, wc


def collect_images(max_images: int, prohibitory_only: bool, prohibitory_samples: bool) -> list[Path]:
    if not MEDIA_SIGNS.is_dir():
        return []
    if prohibitory_samples:
        paths = [MEDIA_SIGNS / stem for stem in PROHIBITORY_SAMPLE_STEMS if (MEDIA_SIGNS / stem).is_file()]
        return paths

    paths = sorted(MEDIA_SIGNS.glob('*.*'))
    paths = [p for p in paths if p.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp')]
    if prohibitory_only:
        paths = [p for p in paths if expected_sign_code_from_filename(p.name) in PROHIBITORY_CODES]
    if not paths:
        return []
    # Prefer one file per expected sign code, then fill up to max_images
    by_code: dict[str, Path] = {}
    extras: list[Path] = []
    for p in paths:
        code = expected_sign_code_from_filename(p.name) or p.stem.upper()
        if code not in by_code:
            by_code[code] = p
        else:
            extras.append(p)
    ordered = list(by_code.values()) + extras
    return ordered[:max_images]


def aggregate_mapping_usage(traces: list[DetectionTrace]) -> list[MappingAgg]:
    buckets: dict[tuple[str, str, str, str], list[DetectionTrace]] = defaultdict(list)
    for t in traces:
        if t.mode != 'upload':
            continue
        key = (t.yolo_class_name, t.final_sign_code, t.final_sign_name, t.final_class_key)
        buckets[key].append(t)

    out: list[MappingAgg] = []
    for (yolo_name, sign_code, sign_name, class_key), items in sorted(
        buckets.items(), key=lambda kv: -len(kv[1]),
    ):
        expected_codes = {i.expected_sign_code for i in items if i.expected_sign_code}
        susp = ''
        if len(items) > 1 and len(expected_codes) > 1:
            susp = 'multiple_expected_codes_same_output'
        elif len(items) > 1 and len({i.image_filename for i in items}) > 1:
            susp = 'repeated_output'
        yolo_id = next((i.yolo_class_id for i in items if i.yolo_class_id is not None), -1)
        out.append(MappingAgg(
            yolo_class_name=yolo_name,
            yolo_class_id=yolo_id if yolo_id is not None else -1,
            class_key=class_key,
            sign_code=sign_code,
            sign_name=sign_name,
            image_count=len(items),
            suspicious=susp,
        ))
    return out


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)


def write_summary_md(
    path: Path,
    *,
    model_path: str,
    model_sha: str,
    settings_path: str,
    class_rows: list[dict],
    suspicious: list[dict],
    traces: list[DetectionTrace],
    mapping_agg: list[MappingAgg],
) -> None:
    upload_traces = [t for t in traces if t.mode == 'upload']
    mismatches = [t for t in upload_traces if t.suspicious]
    parity_fail = [t for t in upload_traces if t.upload_webcam_match == 'mismatch']
    prohibitory_conf = [t for t in upload_traces if 'prohibitory_confusion' in t.suspicious]

    lines = [
        '# Detection Pipeline Audit',
        '',
        f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',
        '',
        '## Model',
        f'- **best.pt path:** `{model_path}`',
        f'- **SHA256:** `{model_sha}`',
        f'- **Django AI_MODEL_PATH:** `{settings_path}`',
        f'- **YOLO classes:** {len(class_rows)}',
        '',
        '## Summary',
        f'- Images audited (upload+webcam pairs): {len(upload_traces)}',
        f'- Upload/webcam mismatches: {len(parity_fail)}',
        f'- Suspicious upload results: {len(mismatches)}',
        f'- Prohibitory confusion flags: {len(prohibitory_conf)}',
        f'- Mapping table suspicious rows: {len(suspicious)}',
        '',
        '## Required checks',
        '| Check | Status |',
        '|-------|--------|',
        f'| Same best.pt for upload & webcam | {"OK" if model_path else "FAIL"} |',
        f'| class_id → class_name (model.names) | {len(class_rows)} entries |',
        f'| class_name → catalog sign_code | {sum(1 for r in class_rows if r.get("catalog_found"))}/{len(class_rows)} resolved |',
        f'| Upload vs webcam parity | {len(upload_traces) - len(parity_fail)}/{len(upload_traces)} match |',
        '',
    ]

    if prohibitory_conf:
        lines += ['## Prohibitory confusion (CRITICAL)', '']
        for t in prohibitory_conf[:20]:
            lines.append(
                f'- `{t.image_filename}`: expected **{t.expected_sign_code}** → got **{t.final_sign_code}** '
                f'(YOLO: {t.yolo_class_name} @ {t.yolo_confidence:.1f}%, engine={t.detection_engine})',
            )
        lines.append('')

    if parity_fail:
        lines += ['## Upload vs webcam mismatches', '']
        for t in parity_fail[:15]:
            wc = next((x for x in traces if x.image_filename == t.image_filename and x.mode == 'webcam'), None)
            wc_code = wc.final_sign_code if wc else '?'
            lines.append(f'- `{t.image_filename}`: upload={t.final_sign_code}, webcam={wc_code}')
        lines.append('')

    if suspicious:
        lines += ['## Suspicious class mappings', '']
        for row in suspicious[:25]:
            lines.append(f'- **{row.get("issue")}**: {row}')
        lines.append('')

    dup_output = [m for m in mapping_agg if m.suspicious]
    if dup_output:
        lines += ['## Multiple different signs → same output (ROOT CAUSE)', '']
        lines += ['| YOLO Class | Sign Code | Sign Name | Images | Flag |', '|---|---|---|---:|---|']
        for m in dup_output[:30]:
            lines.append(f'| {m.yolo_class_name} | {m.sign_code} | {m.sign_name} | {m.image_count} | {m.suspicious} |')
        lines.append('')

    lines += [
        '## Output files',
        '- `detection_class_mapping.csv` — YOLO class_id → sign_code',
        '- `detection_suspicious_mappings.csv` — duplicate / missing mappings',
        '- `detection_per_image_log.csv` — per-image YOLO + final result (upload & webcam)',
        '- `detection_output_mapping_usage.csv` — Class Name, Sign Code, Sign Name, image count',
        '',
    ]
    path.write_text('\n'.join(lines), encoding='utf-8')


def main() -> None:
    parser = argparse.ArgumentParser(description='Audit detection pipeline mappings and parity')
    parser.add_argument('--max-images', type=int, default=80, help='Max images to run through pipeline')
    parser.add_argument('--prohibitory-only', action='store_true', help='Only audit prohibitory sign images')
    parser.add_argument('--prohibitory-samples', action='store_true', help='Run named prohibitory sample files')
    args = parser.parse_args()

    if not MODEL_PATH.is_file():
        raise SystemExit(f'Missing model: {MODEL_PATH}')
    if not CATALOG_PATH.is_file():
        raise SystemExit(f'Missing catalog: {CATALOG_PATH}')

    setup_django()
    from django.conf import settings
    from ai_detection.services import _get_sign_model

    model = _get_sign_model()
    if model is None:
        raise SystemExit('Could not load YOLO model')
    model_names: dict[int, str] = {int(k): str(v) for k, v in (model.names or {}).items()}
    resolved_model = str(Path(settings.AI_MODEL_PATH).resolve())
    model_sha = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()[:16]

    catalog = load_catalog()
    class_rows, suspicious = audit_class_mappings(model_names, catalog)

    images = collect_images(args.max_images, args.prohibitory_only, args.prohibitory_samples)
    traces: list[DetectionTrace] = []
    for img in images:
        try:
            up, wc = trace_image(img, resolved_model)
            traces.extend([up, wc])
        except Exception as exc:
            traces.append(DetectionTrace(
                image_filename=img.name,
                path=str(img),
                expected_sign_code=expected_sign_code_from_filename(img.name),
                mode='error',
                suspicious='pipeline_error',
                notes=str(exc),
                model_path=resolved_model,
            ))
            traces.append(DetectionTrace(
                image_filename=img.name,
                path=str(img),
                expected_sign_code=expected_sign_code_from_filename(img.name),
                mode='error',
                suspicious='pipeline_error',
                notes=str(exc),
                model_path=resolved_model,
            ))

    mapping_agg = aggregate_mapping_usage(traces)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    write_csv(
        REPORT_DIR / f'detection_class_mapping_{stamp}.csv',
        class_rows,
        ['yolo_class_id', 'yolo_class_name', 'yaml_class_name', 'canonical_class_key',
         'sign_code', 'sign_name_en', 'catalog_found', 'suspicious'],
    )
    write_csv(
        REPORT_DIR / f'detection_suspicious_mappings_{stamp}.csv',
        suspicious,
        ['issue', 'yolo_class_id', 'yolo_class_name', 'class_key', 'sign_code',
         'yolo_class_ids', 'yolo_class_names', 'count'],
    )
    per_image = [
        {
            'image_filename': t.image_filename,
            'expected_sign_code': t.expected_sign_code,
            'mode': t.mode,
            'yolo_class_id': t.yolo_class_id,
            'yolo_class_name': t.yolo_class_name,
            'yolo_confidence': t.yolo_confidence,
            'final_class_key': t.final_class_key,
            'final_sign_code': t.final_sign_code,
            'final_sign_name': t.final_sign_name,
            'detection_engine': t.detection_engine,
            'model_path': t.model_path,
            'upload_webcam_match': t.upload_webcam_match,
            'suspicious': t.suspicious,
            'notes': t.notes,
        }
        for t in traces
    ]
    write_csv(
        REPORT_DIR / f'detection_per_image_log_{stamp}.csv',
        per_image,
        ['image_filename', 'expected_sign_code', 'mode', 'yolo_class_id', 'yolo_class_name',
         'yolo_confidence', 'final_class_key', 'final_sign_code', 'final_sign_name',
         'detection_engine', 'model_path', 'upload_webcam_match', 'suspicious', 'notes'],
    )
    usage_rows = [
        {
            'yolo_class_name': m.yolo_class_name,
            'yolo_class_id': m.yolo_class_id,
            'class_key': m.class_key,
            'sign_code': m.sign_code,
            'sign_name': m.sign_name,
            'image_count': m.image_count,
            'suspicious': m.suspicious,
        }
        for m in mapping_agg
    ]
    write_csv(
        REPORT_DIR / f'detection_output_mapping_usage_{stamp}.csv',
        usage_rows,
        ['yolo_class_name', 'yolo_class_id', 'class_key', 'sign_code', 'sign_name', 'image_count', 'suspicious'],
    )

    summary_path = REPORT_DIR / 'DETECTION_PIPELINE_AUDIT.md'
    write_summary_md(
        summary_path,
        model_path=resolved_model,
        model_sha=model_sha,
        settings_path=resolved_model,
        class_rows=class_rows,
        suspicious=suspicious,
        traces=traces,
        mapping_agg=mapping_agg,
    )

    print(f'Model: {resolved_model}')
    print(f'Classes: {len(class_rows)} | Suspicious mappings: {len(suspicious)}')
    print(f'Images: {len(images)} | Traces: {len(traces)}')
    upload_n = sum(1 for t in traces if t.mode == 'upload')
    match_n = sum(1 for t in traces if t.mode == 'upload' and t.upload_webcam_match == 'match')
    print(f'Upload/webcam parity: {match_n}/{upload_n}')
    crit = sum(1 for t in traces if 'prohibitory_confusion' in t.suspicious)
    print(f'Prohibitory confusion flags: {crit}')
    print(f'Summary: {summary_path.relative_to(ROOT)}')
    print(f'CSV stamp: {stamp}')


if __name__ == '__main__':
    main()
