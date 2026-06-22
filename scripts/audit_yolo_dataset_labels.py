#!/usr/bin/env python
"""
Audit traffic-sign images vs YOLOv8 predictions.

Read-only: does not modify dataset labels or catalog files.
Outputs a CSV review report under docs/reports/.

Usage (from repo root):
  python scripts/audit_yolo_dataset_labels.py
  python scripts/audit_yolo_dataset_labels.py --include-media-signs
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AI_ROOT = ROOT / 'ai'
sys.path.insert(0, str(AI_ROOT))

from build_dataset import collect_sources, class_key_from_path, _load_stem_map  # noqa: E402

DEFAULT_REFERENCE = Path(
    r'D:/Year4/Project Thesis/Expert System/Reference(PDF Download)/Dim Sareach/Road signs in Cambodia',
)
DATA_YAML = AI_ROOT / 'data.yaml'
MODEL_PATH = AI_ROOT / 'weights' / 'best.pt'
CATALOG_PATH = AI_ROOT / 'sign_catalog.json'
DATASET_ROOT = AI_ROOT / 'dataset'
MEDIA_SIGNS = ROOT / 'backend' / 'media' / 'signs'
REPORT_DIR = ROOT / 'docs' / 'reports'
CANVAS = 640


def canonical_key(value: str) -> str:
    return re.sub(r'[^A-Z0-9]+', '_', (value or '').upper()).strip('_')


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


def load_catalog_maps() -> tuple[dict[str, str], dict[str, str]]:
    """sign_code -> class_key, norm_stem -> class_key from catalog English names."""
    import json

    code_to_class: dict[str, str] = {}
    stem_to_class: dict[str, str] = {}
    if not CATALOG_PATH.is_file():
        return code_to_class, stem_to_class
    rows = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    for row in rows:
        code = (row.get('sign_code') or '').upper()
        ck = canonical_key(row.get('class_key') or '')
        if code and ck:
            code_to_class[code] = ck
        en = (row.get('sign_name_en') or '').strip()
        if en:
            stem_to_class[re.sub(r'[^a-z0-9]+', '', en.lower())] = ck
    return code_to_class, stem_to_class


def composite_sign_deterministic(sign: Image.Image, canvas_size: int = CANVAS) -> Image.Image:
    """Center sign on a neutral background (stable YOLO input, no random aug)."""
    sign = sign.convert('RGBA')
    max_side = int(canvas_size * 0.58)
    sign.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    bg = Image.new('RGB', (canvas_size, canvas_size), (210, 210, 215))
    x = (canvas_size - sign.width) // 2
    y = (canvas_size - sign.height) // 2
    bg.paste(sign, (x, y), sign)
    return bg


def ground_truth_from_path(path: Path, stem_map: dict[str, str]) -> str | None:
    ck = class_key_from_path(path, stem_map)
    return canonical_key(ck) if ck else None


def ground_truth_from_media_name(
    path: Path,
    code_to_class: dict[str, str],
    stem_map: dict[str, str],
) -> str | None:
    stem = path.stem.upper()
    stem = re.sub(r'(_HQ\d*|_HQ)$', '', stem, flags=re.I)
    stem = stem.split('_')[0] if '_' in stem and re.search(r'_[A-Za-z0-9]{6,8}$', path.stem) else stem
    stem_dash = stem.replace('_', '-')

    for candidate in (stem_dash, stem):
        if candidate in code_to_class:
            return code_to_class[candidate]
        if candidate.replace('-', '_') in code_to_class:
            return code_to_class[candidate.replace('-', '_')]

    mapped = stem_map.get(re.sub(r'[^a-z0-9]+', '', path.stem.lower()))
    if mapped:
        return canonical_key(mapped)
    return ground_truth_from_path(path, stem_map)


@dataclass
class AuditRow:
    image_name: str
    image_path: str
    source: str
    current_label: str
    suggested_label: str
    confidence: float
    status: str
    yolo_top3: str = ''


def collect_dataset_labelled_images(yolo_names: dict[int, str]) -> list[tuple[Path, str, str]]:
    """Return (image_path, current_label, source) from built YOLO dataset if present."""
    rows: list[tuple[Path, str, str]] = []
    if not DATASET_ROOT.is_dir():
        return rows
    for split in ('train', 'val'):
        img_dir = DATASET_ROOT / 'images' / split
        lbl_dir = DATASET_ROOT / 'labels' / split
        if not img_dir.is_dir() or not lbl_dir.is_dir():
            continue
        for img_path in sorted(img_dir.glob('*.jpg')):
            lbl_path = lbl_dir / f'{img_path.stem}.txt'
            if not lbl_path.is_file():
                continue
            first = lbl_path.read_text(encoding='utf-8').strip().split()
            if not first:
                continue
            try:
                class_id = int(float(first[0]))
            except ValueError:
                continue
            current = yolo_names.get(class_id, f'CLASS_{class_id}')
            rows.append((img_path, canonical_key(current), f'dataset/{split}'))
    return rows


def collect_reference_images(reference_dir: Path) -> list[tuple[Path, str, str]]:
    stem_map = _load_stem_map()
    by_code = collect_sources(reference_dir)
    rows: list[tuple[Path, str, str]] = []
    for code, paths in sorted(by_code.items()):
        label = canonical_key(code.split('__')[0])
        for path in paths:
            rows.append((path, label, 'reference'))
    return rows


def collect_media_canonical(
    code_to_class: dict[str, str],
    stem_map: dict[str, str],
    existing_labels: set[str],
) -> list[tuple[Path, str, str]]:
    """One media/signs file per catalog sign_code not already covered."""
    rows: list[tuple[Path, str, str]] = []
    if not MEDIA_SIGNS.is_dir():
        return rows
    chosen: dict[str, Path] = {}
    for path in sorted(MEDIA_SIGNS.glob('*.png')):
        label = ground_truth_from_media_name(path, code_to_class, stem_map)
        if not label or label in existing_labels:
            continue
        code_key = label
        for code, ck in code_to_class.items():
            if ck == label:
                code_key = code
                break
        if code_key not in chosen:
            chosen[code_key] = path
    for path in chosen.values():
        label = ground_truth_from_media_name(path, code_to_class, stem_map) or ''
        if label:
            rows.append((path, label, 'media/signs'))
    return rows


def run_yolo_audit(
    entries: list[tuple[Path, str, str]],
    model,
    yolo_names: dict[int, str],
) -> list[AuditRow]:
    name_to_id = {canonical_key(v): k for k, v in yolo_names.items()}
    results: list[AuditRow] = []

    with tempfile.TemporaryDirectory(prefix='yolo-audit-') as tmp:
        tmp_path = Path(tmp)
        for idx, (image_path, current_label, source) in enumerate(entries, start=1):
            try:
                img = Image.open(image_path)
                composed = composite_sign_deterministic(img)
                infer_path = tmp_path / f'{idx:05d}.jpg'
                composed.save(infer_path, quality=92)

                pred = model.predict(str(infer_path), verbose=False, conf=0.01)[0]
                if pred.boxes is None or len(pred.boxes) == 0:
                    suggested = 'NO_DETECTION'
                    confidence = 0.0
                    top3 = ''
                else:
                    confs = pred.boxes.conf.cpu().numpy()
                    clss = pred.boxes.cls.cpu().numpy().astype(int)
                    order = np.argsort(-confs)
                    best_i = int(order[0])
                    suggested = canonical_key(yolo_names.get(int(clss[best_i]), f'CLASS_{clss[best_i]}'))
                    confidence = round(float(confs[best_i]) * 100, 2)
                    top_parts = []
                    for j in order[:3]:
                        cid = int(clss[j])
                        cname = canonical_key(yolo_names.get(cid, f'CLASS_{cid}'))
                        top_parts.append(f'{cname}:{float(confs[j])*100:.1f}%')
                    top3 = '; '.join(top_parts)

                if suggested == 'NO_DETECTION':
                    status = 'Suspected Error'
                elif suggested == current_label:
                    status = 'Correct'
                else:
                    status = 'Suspected Error'

                results.append(
                    AuditRow(
                        image_name=image_path.name,
                        image_path=str(image_path),
                        source=source,
                        current_label=current_label,
                        suggested_label=suggested,
                        confidence=confidence,
                        status=status,
                        yolo_top3=top3,
                    ),
                )
            except Exception as exc:
                results.append(
                    AuditRow(
                        image_name=image_path.name,
                        image_path=str(image_path),
                        source=source,
                        current_label=current_label,
                        suggested_label='ERROR',
                        confidence=0.0,
                        status='Suspected Error',
                        yolo_top3=str(exc),
                    ),
                )
            if idx % 25 == 0:
                print(f'  processed {idx}/{len(entries)}...', flush=True)
    return results


def write_csv(rows: list[AuditRow], out_path: Path, meta_lines: list[str]) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('w', encoding='utf-8', newline='') as fh:
        for line in meta_lines:
            fh.write(f'# {line}\n')
        writer = csv.writer(fh)
        writer.writerow([
            'Image Name',
            'Image Path',
            'Source',
            'Current Label',
            'Suggested Label',
            'Confidence',
            'Status',
            'YOLO Top-3',
        ])
        for row in rows:
            writer.writerow([
                row.image_name,
                row.image_path,
                row.source,
                row.current_label,
                row.suggested_label,
                f'{row.confidence:.2f}',
                row.status,
                row.yolo_top3,
            ])


def main() -> int:
    parser = argparse.ArgumentParser(description='Audit sign images vs YOLO labels (read-only).')
    parser.add_argument('--reference', type=Path, default=DEFAULT_REFERENCE)
    parser.add_argument('--include-media-signs', action='store_true')
    parser.add_argument('--output', type=Path, default=None)
    args = parser.parse_args()

    if not MODEL_PATH.is_file():
        print(f'Model not found: {MODEL_PATH}', file=sys.stderr)
        return 1

    yolo_names = load_yaml_names()
    if not yolo_names:
        print('Could not load class names from ai/data.yaml', file=sys.stderr)
        return 1

    code_to_class, _ = load_catalog_maps()
    stem_map = _load_stem_map()

    entries: list[tuple[Path, str, str]] = []
    dataset_entries = collect_dataset_labelled_images(yolo_names)
    if dataset_entries:
        entries.extend(dataset_entries)
        print(f'YOLO dataset: {len(dataset_entries)} labelled images')
    else:
        print(f'Note: {DATASET_ROOT} not found — using reference source images as ground truth.')

    if args.reference.is_dir():
        ref_entries = collect_reference_images(args.reference)
        entries.extend(ref_entries)
        print(f'Reference corpus: {len(ref_entries)} images')
    else:
        print(f'Warning: reference folder missing: {args.reference}')

    if args.include_media_signs:
        covered = {label for _, label, _ in entries}
        media_entries = collect_media_canonical(code_to_class, stem_map, covered)
        entries.extend(media_entries)
        print(f'Media signs (extra codes): {len(media_entries)} images')

    # dedupe by absolute path
    seen: set[str] = set()
    unique_entries: list[tuple[Path, str, str]] = []
    for path, label, source in entries:
        key = str(path.resolve())
        if key in seen:
            continue
        seen.add(key)
        unique_entries.append((path, label, source))

    if not unique_entries:
        print('No images to audit.', file=sys.stderr)
        return 1

    print(f'Loading YOLO model: {MODEL_PATH}')
    from ultralytics import YOLO

    model = YOLO(str(MODEL_PATH))
    print(f'Running inference on {len(unique_entries)} images...')
    rows = run_yolo_audit(unique_entries, model, yolo_names)

    correct = sum(1 for r in rows if r.status == 'Correct')
    suspected = sum(1 for r in rows if r.status == 'Suspected Error')
    no_det = sum(1 for r in rows if r.suggested_label == 'NO_DETECTION')

    ts = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    out_path = args.output or (REPORT_DIR / f'yolo_label_audit_{ts}.csv')
    meta = [
        f'Generated UTC: {datetime.now(timezone.utc).isoformat()}',
        f'Model: {MODEL_PATH}',
        f'Total images: {len(rows)}',
        f'Correct: {correct}',
        f'Suspected Error: {suspected}',
        f'No YOLO detection: {no_det}',
        'Current Label = dataset .txt class or reference filename mapping (training ground truth).',
        'Suggested Label = YOLOv8 best.pt top-1 prediction on composited frame.',
    ]
    write_csv(rows, out_path, meta)

    summary_path = out_path.with_name(out_path.stem + '_summary.txt')
    summary_path.write_text(
        '\n'.join([
            *meta,
            '',
            'Suspected errors (first 40):',
            *[f'  {r.image_name}: {r.current_label} -> {r.suggested_label} ({r.confidence}%)'
              for r in rows if r.status == 'Suspected Error'][:40],
        ]),
        encoding='utf-8',
    )

    print(f'\nReport: {out_path}')
    print(f'Summary: {summary_path}')
    print(f'Correct: {correct} | Suspected Error: {suspected} | No detection: {no_det}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
