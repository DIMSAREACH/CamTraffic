"""Label white tuk-tuk + motorcycle on GX010106 05.01 right cluster (clean)."""
from __future__ import annotations

import json
from pathlib import Path

import cv2

OUT = Path(__file__).resolve().parents[2] / 'ai' / 'datasets' / 'samples' / 'manual_labels'
SRC = OUT / 'GX010106_snapshot_05.01.361.png'
META = OUT / 'GX010106_snapshot_05.01.361_signs_vehicles.json'

TUK_TUK = {
    'kind': 'vehicle',
    'class_id': 104,
    'class_key': 'TUK_TUK',
    'label_en': 'Tuk Tuk',
    'confidence': 92.0,
    'bbox_xyxy': [2840, 930, 3460, 1340],
}
MOTORCYCLE = {
    'kind': 'vehicle',
    'class_id': 101,
    'class_key': 'MOTORCYCLE',
    'label_en': 'Motorcycle',
    'confidence': 88.0,
    'bbox_xyxy': [3485, 1005, 3655, 1245],
}
# Far-right second tuk (partial at edge)
FAR_TUK = {
    'kind': 'vehicle',
    'class_id': 104,
    'class_key': 'TUK_TUK',
    'label_en': 'Tuk Tuk',
    'confidence': 75.0,
    'bbox_xyxy': [3660, 1020, 3839, 1220],
}


def to_norm_yolo(xyxy: list[int], w: int, h: int) -> tuple[dict, dict]:
    x1, y1, x2, y2 = xyxy
    bbox_norm = {
        'x1': round(x1 / w, 6),
        'y1': round(y1 / h, 6),
        'x2': round(x2 / w, 6),
        'y2': round(y2 / h, 6),
    }
    xc = (bbox_norm['x1'] + bbox_norm['x2']) / 2
    yc = (bbox_norm['y1'] + bbox_norm['y2']) / 2
    bw = bbox_norm['x2'] - bbox_norm['x1']
    bh = bbox_norm['y2'] - bbox_norm['y1']
    bbox_yolo = {
        'x_center': round(xc, 6),
        'y_center': round(yc, 6),
        'width': round(bw, 6),
        'height': round(bh, 6),
    }
    return bbox_norm, bbox_yolo


def main() -> None:
    img = cv2.imread(str(SRC))
    if img is None:
        raise SystemExit(f'Cannot read {SRC}')
    h, w = img.shape[:2]
    meta = json.loads(META.read_text(encoding='utf-8'))

    keep: list[dict] = []
    for a in meta['annotations']:
        if a.get('kind') != 'vehicle':
            keep.append(a)
            continue
        xy = a.get('bbox_xyxy') or [0, 0, 0, 0]
        x1, y1, x2, y2 = [int(v) for v in xy]
        # Drop any prior tuk/moto boxes in the right cluster (x > 2800)
        label = (a.get('label_en') or '').lower()
        key = (a.get('class_key') or '').lower()
        is_tuk_or_moto = (
            'tuk' in label or 'tuk' in key
            or 'moto' in label or 'moto' in key
        )
        if is_tuk_or_moto and x1 >= 2750:
            print('Removed old', a.get('label_en'), xy)
            continue
        keep.append(a)

    for raw in (TUK_TUK, MOTORCYCLE, FAR_TUK):
        bbox_norm, bbox_yolo = to_norm_yolo(raw['bbox_xyxy'], w, h)
        keep.append({**raw, 'bbox_norm': bbox_norm, 'bbox_yolo': bbox_yolo})
        print('Added', raw['label_en'], raw['bbox_xyxy'])

    for name, box in (
        ('tuk', TUK_TUK['bbox_xyxy']),
        ('moto', MOTORCYCLE['bbox_xyxy']),
        ('far', FAR_TUK['bbox_xyxy']),
    ):
        x1, y1, x2, y2 = box
        cv2.imwrite(str(OUT / f'_qa_{name}.jpg'), img[y1:y2, x1:x2])

    meta['annotations'] = keep
    meta['vehicle_count'] = sum(1 for a in keep if a['kind'] == 'vehicle')
    meta['sign_count'] = sum(1 for a in keep if a['kind'] == 'sign')
    meta['notes'] = (
        'Height Limit 5.5m on overpass. Right cluster labeled: white Tuk Tuk '
        '(1HU-3055) + Motorcycle rider + far-right Tuk Tuk.'
    )

    canvas = img.copy()
    lines: list[str] = []
    for a in keep:
        bb = a['bbox_norm']
        x1, y1 = int(bb['x1'] * w), int(bb['y1'] * h)
        x2, y2 = int(bb['x2'] * w), int(bb['y2'] * h)
        color = (0, 0, 255) if a['kind'] == 'sign' else (0, 255, 0)
        thickness = max(2, min(4, w // 700))
        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, thickness)
        conf = float(a['confidence'])
        txt = f"{a['label_en']} {conf / 100:.2f}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = max(0.45, min(0.9, w / 2200))
        (tw, thh), _ = cv2.getTextSize(txt, font, scale, 1)
        ty = max(0, y1 - thh - 6)
        cv2.rectangle(canvas, (x1, ty), (x1 + tw + 6, ty + thh + 6), color, -1)
        cv2.putText(canvas, txt, (x1 + 3, ty + thh + 2), font, scale, (0, 0, 0), 1, cv2.LINE_AA)
        yolo = a['bbox_yolo']
        lines.append(
            f"{a['class_id']} {yolo['x_center']:.6f} {yolo['y_center']:.6f} "
            f"{yolo['width']:.6f} {yolo['height']:.6f}"
        )
        print(a['kind'], a['label_en'], a['bbox_xyxy'])

    ann_path = OUT / 'GX010106_snapshot_05.01.361_annotated.jpg'
    cv2.imwrite(str(ann_path), canvas, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    META.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8')
    (OUT / 'GX010106_snapshot_05.01.361_signs_vehicles.txt').write_text(
        '\n'.join(lines) + '\n', encoding='utf-8',
    )
    print('Saved', ann_path)


if __name__ == '__main__':
    main()
