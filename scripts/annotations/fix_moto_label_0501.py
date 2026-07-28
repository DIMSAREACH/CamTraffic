"""Fix scooter mislabeled as Tuk Tuk → Motorcycle on GX010106 05.01 snapshot."""
from __future__ import annotations

import json
from pathlib import Path

import cv2

OUT = Path(__file__).resolve().parents[2] / 'ai' / 'datasets' / 'samples' / 'manual_labels'
SRC = OUT / 'GX010106_snapshot_05.01.361.png'
META = OUT / 'GX010106_snapshot_05.01.361_signs_vehicles.json'


def main() -> None:
    img = cv2.imread(str(SRC))
    if img is None:
        raise SystemExit(f'Cannot read {SRC}')
    h, w = img.shape[:2]
    meta = json.loads(META.read_text(encoding='utf-8'))

    fixed = 0
    for a in meta['annotations']:
        if a.get('kind') != 'vehicle':
            continue
        xy = a.get('bbox_xyxy') or []
        is_target = xy == [2872, 1014, 2971, 1189] or (
            a.get('label_en') == 'Tuk Tuk'
            and abs(float(a.get('confidence') or 0) - 82.3) < 0.05
        )
        if not is_target:
            continue
        a['class_id'] = 101
        a['class_key'] = 'MOTORCYCLE'
        a['label_en'] = 'Motorcycle'
        fixed += 1
        print('Fixed to Motorcycle', a['bbox_xyxy'])

    if not fixed:
        raise SystemExit('Target Tuk Tuk→Motorcycle box not found')

    meta['notes'] = (
        'Height Limit 5.5m on overpass beam. Mid-right scooter corrected from '
        'Tuk Tuk to Motorcycle. Far-right remains Tuk Tuk.'
    )

    canvas = img.copy()
    lines: list[str] = []
    for a in meta['annotations']:
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
