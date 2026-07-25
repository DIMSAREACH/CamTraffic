#!/usr/bin/env python
"""
Convert Roboflow License Plate.v3 (42 plate-ID classes + polygons)
→ single-class YOLOv8 license_plate detector + OCR ground-truth map.

Source class names encode Cambodia plate text, e.g.:
  -_1AF-1714_BATTAMBANG → 1AF-1714
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


def plate_text_from_class_name(name: str) -> str:
    m = _CLASS_PLATE.match(name.strip())
    if not m:
        return name.strip().lstrip('-_')
    raw = m.group(1).upper().replace(' ', '')
    # D.D.1611 → keep; HENGHENG → keep; 1AF-1714 already dashed
    if re.match(r'^\d{1,2}[A-Z]{1,3}-?\d{3,5}$', raw.replace('-', ''), re.I) or '-' in raw:
        if '-' not in raw:
            mm = re.match(r'^(\d{1,2})([A-Z]{1,3})(\d{3,5})$', raw)
            if mm:
                return f'{mm.group(1)}{mm.group(2)}-{mm.group(3)}'
        return raw
    return raw


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
    # clamp
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
        # already bbox — remap class → 0
        _, xc, yc, w, h = parts
        return f'0 {float(xc):.6f} {float(yc):.6f} {float(w):.6f} {float(h):.6f}'
    if len(parts) > 5 and (len(parts) - 1) % 2 == 0:
        coords = [float(x) for x in parts[1:]]
        cx, cy, w, h = polygon_to_yolo_bbox(coords)
        return f'0 {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}'
    return None


def main() -> int:
    src_yaml = yaml.safe_load((SRC / 'data.yaml').read_text(encoding='utf-8'))
    class_names: list[str] = list(src_yaml['names'])
    class_to_plate = {i: plate_text_from_class_name(n) for i, n in enumerate(class_names)}

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
            plates_in_img: list[str] = []
            if lbl.is_file():
                for line in lbl.read_text(encoding='utf-8').splitlines():
                    raw = line.strip()
                    if not raw:
                        continue
                    parts = raw.split()
                    cls_id = int(float(parts[0]))
                    plate = class_to_plate.get(cls_id, '')
                    if plate:
                        plates_in_img.append(plate)
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
            rel = f'{split}/images/{img.name}'
            ocr_gt[rel] = {
                'plates': plates_in_img,
                'primary_plate': plates_in_img[0] if plates_in_img else '',
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
        json.dumps({str(k): v for k, v in class_to_plate.items()}, indent=2),
        encoding='utf-8',
    )
    readme = f"""# Cambodia License Plates (Detection + OCR)

Converted from Roboflow **License Plate.v3-license-plate_v1.yolov8**

- Original: 42 classes (one per unique plate text) + mostly polygon labels
- Production: **1 class** `license_plate` + YOLO bbox (+ OCR ground truth)

| Split | Images | Boxes |
|-------|--------|-------|
| train | {stats['splits']['train']['images']} | {stats['splits']['train']['boxes']} |
| valid | {stats['splits']['valid']['images']} | {stats['splits']['valid']['boxes']} |
| test | {stats['splits']['test']['images']} | {stats['splits']['test']['boxes']} |

Polygons converted: {stats['poly_converted']} | BBoxes kept: {stats['bbox_kept']}

OCR GT: `ocr_ground_truth.json` (plate text from class names, e.g. `1AF-1714`)
"""
    (DST / 'README.md').write_text(readme, encoding='utf-8')
    print(json.dumps(stats, indent=2))
    print(f'Wrote {DST}')
    print(f'Sample plates: {list(class_to_plate.values())[:8]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
