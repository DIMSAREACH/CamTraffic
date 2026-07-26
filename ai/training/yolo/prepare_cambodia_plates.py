#!/usr/bin/env python
"""
Convert Roboflow License Plate.v3 (42 plate-ID classes + polygons)
→ single-class YOLOv8 license_plate detector + province-aware OCR ground truth.

Source class names encode plate text + printed province/city, e.g.:
  -_2U-3108_PHNOMPENH → plate 2U-3108, province Phnom Penh (code 12)
  -_1AF-1714_BATTAMBANG → plate 1AF-1714, province Battambang (code 2)

Important: Cambodia plates print the city/province name on the plate; the leading
digit of the serial is NOT always the official province code. Ground truth keeps
the visible serial text and sets province from the printed name.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import yaml

SRC = Path(
    r'd:\Year4\Project Thesis\Expert System\Reference(PDF Download)'
    r'\Dim Sareach\Image Dataset\License Plate.v3-license-plate_v1.yolov8'
)
DST = Path(__file__).resolve().parents[2] / 'datasets' / 'splits' / 'cambodia_license_plates'

_CLASS_PLATE = re.compile(r'^-_?(.+?)_(.+)$')

# Printed province/city line on plate → official MPPWT code + display names
PROVINCE_NAME_META: dict[str, dict[str, str]] = {
    'PHNOMPENH': {'code': '12', 'en': 'Phnom Penh', 'km': 'ភ្នំពេញ'},
    'BATTAMBANG': {'code': '2', 'en': 'Battambang', 'km': 'បាត់ដំបង'},
    'SIEMREAP': {'code': '17', 'en': 'Siem Reap', 'km': 'សៀមរាប'},
    'KAMPONGCHAM': {'code': '3', 'en': 'Kampong Cham', 'km': 'កំពង់ចាម'},
    'KAMPONGCHHNANG': {'code': '4', 'en': 'Kampong Chhnang', 'km': 'កំពង់ឆ្នាំង'},
    'KAMPONGSPEU': {'code': '5', 'en': 'Kampong Speu', 'km': 'កំពង់ស្ពឺ'},
    'KAMPONGTHOM': {'code': '6', 'en': 'Kampong Thom', 'km': 'កំពង់ធំ'},
    'KAMPOT': {'code': '7', 'en': 'Kampot', 'km': 'កំពត'},
    'KANDAL': {'code': '8', 'en': 'Kandal', 'km': 'កណ្តាល'},
    'KOHKONG': {'code': '9', 'en': 'Koh Kong', 'km': 'កោះកុង'},
    'KRATIE': {'code': '10', 'en': 'Kratie', 'km': 'ក្រចេះ'},
    'MONDULKIRI': {'code': '11', 'en': 'Mondulkiri', 'km': 'មណ្ឌលគិរី'},
    'PREAHVIHEAR': {'code': '13', 'en': 'Preah Vihear', 'km': 'ព្រះវិហារ'},
    'PREYVENG': {'code': '14', 'en': 'Prey Veng', 'km': 'ព្រៃវែង'},
    'PURSAT': {'code': '15', 'en': 'Pursat', 'km': 'ពោធិ៍សាត់'},
    'RATANAKIRI': {'code': '16', 'en': 'Ratanakiri', 'km': 'រតនគិរី'},
    'PREAHSIHANOUK': {'code': '18', 'en': 'Preah Sihanouk', 'km': 'ព្រះសីហនុ'},
    'SIHANOUK': {'code': '18', 'en': 'Preah Sihanouk', 'km': 'ព្រះសីហនុ'},
    'STUNGTRENG': {'code': '19', 'en': 'Stung Treng', 'km': 'ស្ទឹងត្រែង'},
    'SVAYRIENG': {'code': '20', 'en': 'Svay Rieng', 'km': 'ស្វាយរៀង'},
    'TAKEO': {'code': '21', 'en': 'Takeo', 'km': 'តាកែវ'},
    'ODDARMEANCHEY': {'code': '22', 'en': 'Oddar Meanchey', 'km': 'ឧ.មានជ័យ'},
    'KEP': {'code': '23', 'en': 'Kep', 'km': 'កែប'},
    'PAILIN': {'code': '24', 'en': 'Pailin', 'km': 'ប៉ែលិន'},
    'TBONGKHMUM': {'code': '25', 'en': 'Tbong Khmum', 'km': 'ត្បូងឃ្មុំ'},
    'BANTEAYMEANCHEY': {'code': '1', 'en': 'Banteay Meanchey', 'km': 'បន្ទាយមានជ័យ'},
    'CAMBODIA': {'code': '', 'en': 'Cambodia', 'km': 'កម្ពុជា'},
}

# Digit-prefix → province (only for mismatch reporting)
DIGIT_PROVINCE: dict[str, str] = {
    '1': 'Banteay Meanchey',
    '2': 'Battambang',
    '3': 'Kampong Cham',
    '4': 'Kampong Chhnang',
    '5': 'Kampong Speu',
    '6': 'Kampong Thom',
    '7': 'Kampot',
    '8': 'Kandal',
    '9': 'Koh Kong',
    '10': 'Kratie',
    '11': 'Mondulkiri',
    '12': 'Phnom Penh',
    '13': 'Preah Vihear',
    '14': 'Prey Veng',
    '15': 'Pursat',
    '16': 'Ratanakiri',
    '17': 'Siem Reap',
    '18': 'Preah Sihanouk',
    '19': 'Stung Treng',
    '20': 'Svay Rieng',
    '21': 'Takeo',
    '22': 'Oddar Meanchey',
    '23': 'Kep',
    '24': 'Pailin',
    '25': 'Tbong Khmum',
}


def plate_text_from_class_name(name: str) -> str:
    m = _CLASS_PLATE.match(name.strip())
    if not m:
        return name.strip().lstrip('-_')
    raw = m.group(1).upper().replace(' ', '')
    if re.match(r'^\d{1,2}[A-Z]{1,3}-?\d{3,5}$', raw.replace('-', ''), re.I) or '-' in raw:
        if '-' not in raw:
            mm = re.match(r'^(\d{1,2})([A-Z]{1,3})(\d{3,5})$', raw)
            if mm:
                return f'{mm.group(1)}{mm.group(2)}-{mm.group(3)}'
        return raw
    return raw


def province_key_from_class_name(name: str) -> str:
    m = _CLASS_PLATE.match(name.strip())
    if not m:
        return ''
    return re.sub(r'[^A-Z]', '', m.group(2).upper())


def extract_digit_code(plate_text: str) -> str | None:
    m = re.match(r'^(\d{1,2})[A-Z]', plate_text or '')
    if not m:
        return None
    code = m.group(1)
    if len(code) == 2 and code in DIGIT_PROVINCE:
        return code
    if code[:1] in DIGIT_PROVINCE:
        # Prefer 2-digit when valid (12 before 1)
        if len(code) >= 2 and code[:2] in DIGIT_PROVINCE:
            return code[:2]
        return code[0]
    return code


def meta_from_class_name(class_id: int, name: str) -> dict:
    plate = plate_text_from_class_name(name)
    prov_key = province_key_from_class_name(name)
    prov = PROVINCE_NAME_META.get(prov_key, {})
    digit_code = extract_digit_code(plate)
    province_code = prov.get('code') or None
    digit_mismatch = bool(
        province_code
        and digit_code
        and digit_code != province_code
    )
    plate_type = 'private'
    if plate.startswith('D.D') or plate == 'HENGHENG' or prov_key == 'CAMBODIA':
        plate_type = 'special'

    return {
        'class_id': class_id,
        'class_name': name,
        'plate_text': plate,
        'primary_plate': plate,
        'province_key': prov_key or None,
        'province_code': province_code,
        'province_en': prov.get('en') or None,
        'province_km': prov.get('km') or None,
        'digit_code': digit_code,
        'digit_province_en': DIGIT_PROVINCE.get(digit_code or '') if digit_code else None,
        'digit_province_mismatch': digit_mismatch,
        'plate_type': plate_type,
        'province_source': 'printed_name',
    }


def polygon_to_yolo_bbox(coords: list[float]) -> tuple[float, float, float, float]:
    """coords = [x1,y1,x2,y2,...] normalized → cx,cy,w,h"""
    xs = coords[0::2]
    ys = coords[1::2]
    x1, x2 = min(xs), max(xs)
    y1, y2 = min(ys), max(ys)
    w = max(x2 - x1, 1e-6)
    h = max(y2 - y1, 1e-6)
    cx = (x1 + x2) / 2
    cy = (y1 + y2) / 2
    cx = min(max(cx, 0.0), 1.0)
    cy = min(max(cy, 0.0), 1.0)
    w = min(max(w, 1e-6), 1.0)
    h = min(max(h, 1e-6), 1.0)
    return cx, cy, w, h


def convert_label_line(line: str) -> str | None:
    parts = line.strip().split()
    if not parts:
        return None
    if len(parts) == 5:
        _, xc, yc, w, h = parts
        return f'0 {float(xc):.6f} {float(yc):.6f} {float(w):.6f} {float(h):.6f}'
    if len(parts) > 5 and (len(parts) - 1) % 2 == 0:
        coords = [float(x) for x in parts[1:]]
        cx, cy, w, h = polygon_to_yolo_bbox(coords)
        return f'0 {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}'
    return None


def rebuild_gt_only() -> dict:
    """Refresh JSON metadata from source class names without wiping images/labels."""
    src_yaml = yaml.safe_load((SRC / 'data.yaml').read_text(encoding='utf-8'))
    class_names: list[str] = list(src_yaml['names'])
    class_meta = {i: meta_from_class_name(i, n) for i, n in enumerate(class_names)}

    # Rebuild OCR GT from existing label class IDs in DST (or SRC if labels missing)
    ocr_gt: dict[str, dict] = {}
    for split in ('train', 'valid', 'test'):
        img_dir = DST / split / 'images'
        lbl_dir = DST / split / 'labels'
        if not img_dir.is_dir():
            continue
        for img in sorted(img_dir.iterdir()):
            if img.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
                continue
            lbl = lbl_dir / f'{img.stem}.txt'
            # Prefer source labels (still have original class ids)
            src_lbl = SRC / split / 'labels' / f'{img.stem}.txt'
            plates_meta: list[dict] = []
            if src_lbl.is_file():
                for line in src_lbl.read_text(encoding='utf-8').splitlines():
                    raw = line.strip()
                    if not raw:
                        continue
                    cls_id = int(float(raw.split()[0]))
                    meta = class_meta.get(cls_id)
                    if meta:
                        plates_meta.append(meta)
            elif lbl.is_file():
                # Fallback: cannot recover class id from single-class labels
                pass
            rel = f'{split}/images/{img.name}'
            primary = plates_meta[0] if plates_meta else None
            ocr_gt[rel] = {
                'plates': [p['plate_text'] for p in plates_meta],
                'primary_plate': primary['plate_text'] if primary else '',
                'province_code': primary.get('province_code') if primary else None,
                'province_en': primary.get('province_en') if primary else None,
                'province_km': primary.get('province_km') if primary else None,
                'province_key': primary.get('province_key') if primary else None,
                'digit_code': primary.get('digit_code') if primary else None,
                'digit_province_mismatch': primary.get('digit_province_mismatch') if primary else False,
                'plate_type': primary.get('plate_type') if primary else None,
                'province_source': 'printed_name',
                'plates_meta': [
                    {
                        'plate_text': p['plate_text'],
                        'province_code': p.get('province_code'),
                        'province_en': p.get('province_en'),
                        'province_km': p.get('province_km'),
                        'digit_province_mismatch': p.get('digit_province_mismatch'),
                    }
                    for p in plates_meta
                ],
            }

    class_to_plate = {str(i): m['plate_text'] for i, m in class_meta.items()}
    class_to_meta = {str(i): m for i, m in class_meta.items()}

    (DST / 'ocr_ground_truth.json').write_text(
        json.dumps(ocr_gt, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )
    (DST / 'class_to_plate.json').write_text(
        json.dumps(class_to_plate, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )
    (DST / 'class_to_plate_meta.json').write_text(
        json.dumps(class_to_meta, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )

    mismatch = sum(1 for m in class_meta.values() if m.get('digit_province_mismatch'))
    with_prov = sum(1 for m in class_meta.values() if m.get('province_en'))
    return {
        'classes': len(class_meta),
        'images_gt': len(ocr_gt),
        'with_province': with_prov,
        'digit_province_mismatch': mismatch,
        'sample': [class_meta[i] for i in (38, 0, 2, 39)],
    }


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--gt-only',
        action='store_true',
        help='Only rewrite OCR/province JSON from source class names (keep images/labels).',
    )
    parser.add_argument(
        '--full',
        action='store_true',
        help='Full reconvert from source (wipes DST images/labels).',
    )
    args = parser.parse_args()

    if not SRC.is_dir():
        print(f'Source missing: {SRC}')
        return 1

    if args.gt_only or not args.full:
        stats = rebuild_gt_only()
        readme = f"""# Cambodia License Plates (Detection + OCR)

Converted from Roboflow **License Plate.v3-license-plate_v1.yolov8**

- Detection: **1 class** `license_plate` (YOLO bbox)
- OCR GT: visible plate serial text + **printed province/city** (authoritative)

Province is taken from the Roboflow class suffix (`_PHNOMPENH`, `_BATTAMBANG`, …),
not from the leading digit of the serial (those often disagree on real Cambodia plates).

| File | Purpose |
|------|---------|
| `ocr_ground_truth.json` | Per-image plate + province GT |
| `class_to_plate.json` | Class id → plate serial |
| `class_to_plate_meta.json` | Full plate + province metadata |

Classes: {stats['classes']} | Images with GT: {stats['images_gt']} |
Province annotated: {stats['with_province']} | Digit≠printed province: {stats['digit_province_mismatch']}
"""
        (DST / 'README.md').write_text(readme, encoding='utf-8')
        print(json.dumps(stats, indent=2, ensure_ascii=False))
        print(f'Updated GT under {DST}')
        return 0

    # Full reconvert
    src_yaml = yaml.safe_load((SRC / 'data.yaml').read_text(encoding='utf-8'))
    class_names: list[str] = list(src_yaml['names'])
    class_meta = {i: meta_from_class_name(i, n) for i, n in enumerate(class_names)}

    if DST.exists():
        shutil.rmtree(DST)
    ocr_gt: dict[str, dict] = {}
    stats = {'images': 0, 'boxes': 0, 'poly_converted': 0, 'bbox_kept': 0, 'splits': {}}

    for split in ('train', 'valid', 'test'):
        img_src = SRC / split / 'images'
        lbl_src = SRC / split / 'labels'
        img_dst = DST / split / 'images'
        lbl_dst = DST / split / 'labels'
        img_dst.mkdir(parents=True, exist_ok=True)
        lbl_dst.mkdir(parents=True, exist_ok=True)

        images = sorted(
            p for p in img_src.iterdir()
            if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}
        )
        split_boxes = 0
        for img in images:
            shutil.copy2(img, img_dst / img.name)
            lbl = lbl_src / f'{img.stem}.txt'
            out_lines: list[str] = []
            plates_meta: list[dict] = []
            if lbl.is_file():
                for line in lbl.read_text(encoding='utf-8').splitlines():
                    raw = line.strip()
                    if not raw:
                        continue
                    parts = raw.split()
                    cls_id = int(float(parts[0]))
                    meta = class_meta.get(cls_id)
                    if meta:
                        plates_meta.append(meta)
                    converted = convert_label_line(raw)
                    if converted:
                        out_lines.append(converted)
                        split_boxes += 1
                        if len(parts) == 5:
                            stats['bbox_kept'] += 1
                        else:
                            stats['poly_converted'] += 1
            (lbl_dst / f'{img.stem}.txt').write_text(
                '\n'.join(out_lines) + ('\n' if out_lines else ''),
                encoding='utf-8',
            )
            primary = plates_meta[0] if plates_meta else None
            rel = f'{split}/images/{img.name}'
            ocr_gt[rel] = {
                'plates': [p['plate_text'] for p in plates_meta],
                'primary_plate': primary['plate_text'] if primary else '',
                'province_code': primary.get('province_code') if primary else None,
                'province_en': primary.get('province_en') if primary else None,
                'province_km': primary.get('province_km') if primary else None,
                'province_key': primary.get('province_key') if primary else None,
                'digit_code': primary.get('digit_code') if primary else None,
                'digit_province_mismatch': primary.get('digit_province_mismatch') if primary else False,
                'plate_type': primary.get('plate_type') if primary else None,
                'province_source': 'printed_name',
            }
            stats['images'] += 1
        stats['splits'][split] = {'images': len(images), 'boxes': split_boxes}
        stats['boxes'] += split_boxes

    data = {
        'path': DST.resolve().as_posix(),
        'train': 'train/images',
        'val': 'valid/images',
        'test': 'test/images',
        'nc': 1,
        'names': {0: 'license_plate'},
    }
    (DST / 'data.yaml').write_text(
        yaml.dump(data, sort_keys=False, allow_unicode=True),
        encoding='utf-8',
    )
    (DST / 'ocr_ground_truth.json').write_text(
        json.dumps(ocr_gt, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )
    (DST / 'class_to_plate.json').write_text(
        json.dumps({str(i): m['plate_text'] for i, m in class_meta.items()}, indent=2),
        encoding='utf-8',
    )
    (DST / 'class_to_plate_meta.json').write_text(
        json.dumps({str(i): m for i, m in class_meta.items()}, indent=2, ensure_ascii=False),
        encoding='utf-8',
    )
    print(json.dumps(stats, indent=2))
    print(f'Wrote {DST}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
