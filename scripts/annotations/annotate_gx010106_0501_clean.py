"""Clean re-annotation for GX010106 snapshot 05.01.361."""
from __future__ import annotations

import json
from pathlib import Path

import cv2
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'ai' / 'datasets' / 'samples' / 'manual_labels' / 'GX010106_snapshot_05.01.361.png'
OUT = ROOT / 'ai' / 'datasets' / 'samples' / 'manual_labels'


def iou(a: dict, b: dict) -> float:
    ax1, ay1, ax2, ay2 = a['x1'], a['y1'], a['x2'], a['y2']
    bx1, by1, bx2, by2 = b['x1'], b['y1'], b['x2'], b['y2']
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    if inter <= 0:
        return 0.0
    return inter / ((ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter)


def collect(model, img_path: str, w: int, h: int, conf: float = 0.20, classes=None):
    kw = dict(source=img_path, conf=conf, imgsz=1280, verbose=False)
    if classes is not None:
        kw['classes'] = classes
    r = model.predict(**kw)[0]
    out = []
    names = r.names
    for b in r.boxes:
        cls = int(b.cls[0])
        conf_pct = float(b.conf[0]) * 100
        x1, y1, x2, y2 = [float(v) for v in b.xyxy[0].tolist()]
        bbox = dict(x1=x1 / w, y1=y1 / h, x2=x2 / w, y2=y2 / h)
        area = (bbox['x2'] - bbox['x1']) * (bbox['y2'] - bbox['y1'])
        if area > 0.40 or area < 0.0007 or bbox['y1'] > 0.88:
            continue
        out.append((str(names.get(cls, cls)), conf_pct, bbox, area))
    return out


def main() -> None:
    img = cv2.imread(str(SRC))
    if img is None:
        raise SystemExit(f'Cannot read {SRC}')
    h, w = img.shape[:2]

    coco = YOLO(str(ROOT / 'ai' / 'weights' / 'pretrained' / 'yolov8n.pt'))
    cam = YOLO(str(ROOT / 'ai' / 'weights' / 'best_cambodia_vehicles.pt'))
    coco_d = collect(coco, str(SRC), w, h, 0.22, [2, 3, 5, 7])
    cam_d = collect(cam, str(SRC), w, h, 0.25)

    items: list[dict] = []
    for name, conf, bbox, area in sorted(cam_d + coco_d, key=lambda t: -t[1]):
        n = name.lower()
        if n in ('moto', 'motorcycle'):
            label, vtype = 'Motorcycle', 'motorcycle'
        elif n in ('tuk tuk', 'tuk_tuk'):
            label, vtype = 'Tuk Tuk', 'tuk_tuk'
        elif n == 'truck':
            label, vtype = 'Truck', 'truck'
        elif n == 'bus':
            label, vtype = 'Bus', 'bus'
        elif n == 'car':
            label, vtype = 'Car', 'car'
        else:
            label, vtype = name.title(), n

        # Right-side compact “trucks” in this scene are tuk-tuks (not giant boxes).
        bw = bbox['x2'] - bbox['x1']
        bh = bbox['y2'] - bbox['y1']
        if vtype == 'truck' and bbox['x1'] > 0.72 and area < 0.035 and bw < 0.10:
            label, vtype = 'Tuk Tuk', 'tuk_tuk'
        if (
            vtype == 'truck'
            and 0.55 < bbox['x1'] < 0.78
            and 0.45 < bbox['y1'] < 0.70
            and area < 0.035
            and bw < 0.10
        ):
            label, vtype = 'Tuk Tuk', 'tuk_tuk'
        # Giant right-side truck boxes that ate the tuk-tuk / moto cluster.
        if vtype == 'truck' and bbox['x1'] > 0.74 and (area >= 0.03 or bw >= 0.10):
            continue

        # Drop boxes nested inside / heavily overlapping a stronger detection.
        skip = False
        for prev in items:
            ov = iou(bbox, prev['bbox'])
            if ov >= 0.35:
                skip = True
                break
            # Contained inside a larger box
            if (
                bbox['x1'] >= prev['bbox']['x1'] - 0.01
                and bbox['y1'] >= prev['bbox']['y1'] - 0.01
                and bbox['x2'] <= prev['bbox']['x2'] + 0.01
                and bbox['y2'] <= prev['bbox']['y2'] + 0.01
            ):
                skip = True
                break
        if skip:
            continue
        items.append({
            'kind': 'vehicle',
            'label': label,
            'vehicle_type': vtype,
            'confidence': round(conf, 1),
            'bbox': bbox,
        })

    # Prefer one tuk-tuk on the right — drop huge boxes that swallowed multiple objects.
    right_tuks = [v for v in items if v['vehicle_type'] == 'tuk_tuk' and v['bbox']['x1'] > 0.70]
    if right_tuks:
        def _tuk_score(v: dict) -> tuple:
            bb = v['bbox']
            area = (bb['x2'] - bb['x1']) * (bb['y2'] - bb['y1'])
            # Prefer moderate size + high confidence (not giant multi-object boxes).
            size_pen = 0 if 0.005 <= area <= 0.06 else -2
            return (size_pen, v['confidence'], -abs(area - 0.02))

        keep = max(right_tuks, key=_tuk_score)
        items = [v for v in items if v not in right_tuks or v is keep]
        # Far-right edge tuk (different vehicle) keep if IoU low with primary.
        for v in right_tuks:
            if v is keep:
                continue
            if v['bbox']['x1'] > 0.90 and iou(v['bbox'], keep['bbox']) < 0.15:
                items.append(v)

    items = sorted(items, key=lambda d: -d['confidence'])[:7]
    print('vehicles:')
    for v in items:
        print(' ', v['label'], v['confidence'], {k: round(v['bbox'][k], 3) for k in v['bbox']})

    # Height limit 5.5m — nudge down onto the circular face.
    height = {'x1': 2831 / w, 'y1': 50 / h, 'x2': 2999 / w, 'y2': 217 / h}
    signs = [{
        'kind': 'sign',
        'label': 'Height Limit 5.5m',
        'class_key': 'HEIGHT_LIMIT_5_5M',
        'class_id': 200,
        'confidence': 95.0,
        'bbox': height,
        'color': (0, 0, 255),
    }]

    canvas = img.copy()
    overlays = signs + [{**v, 'color': (0, 255, 0)} for v in items]
    anns: list[dict] = []
    lines: list[str] = []
    class_map = {'car': 100, 'motorcycle': 101, 'truck': 102, 'bus': 103, 'tuk_tuk': 104}

    for it in overlays:
        bb = it['bbox']
        x1, y1 = int(bb['x1'] * w), int(bb['y1'] * h)
        x2, y2 = int(bb['x2'] * w), int(bb['y2'] * h)
        color = it.get('color', (0, 255, 0))
        thickness = max(2, min(4, w // 700))
        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, thickness)
        conf = float(it['confidence'])
        txt = f"{it['label']} {conf / 100:.2f}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = max(0.45, min(0.9, w / 2200))
        (tw, thh), _ = cv2.getTextSize(txt, font, scale, 1)
        ty = max(0, y1 - thh - 6)
        cv2.rectangle(canvas, (x1, ty), (x1 + tw + 6, ty + thh + 6), color, -1)
        cv2.putText(canvas, txt, (x1 + 3, ty + thh + 2), font, scale, (0, 0, 0), 1, cv2.LINE_AA)

        xc = (bb['x1'] + bb['x2']) / 2
        yc = (bb['y1'] + bb['y2']) / 2
        bw = bb['x2'] - bb['x1']
        bh = bb['y2'] - bb['y1']
        cid = it.get('class_id', class_map.get(it.get('vehicle_type'), 109))
        anns.append({
            'kind': it['kind'],
            'class_id': cid,
            'class_key': it.get('class_key') or it['label'].upper().replace(' ', '_'),
            'label_en': it['label'],
            'confidence': conf,
            'bbox_xyxy': [x1, y1, x2, y2],
            'bbox_yolo': {
                'x_center': round(xc, 6),
                'y_center': round(yc, 6),
                'width': round(bw, 6),
                'height': round(bh, 6),
            },
            'bbox_norm': {k: round(bb[k], 6) for k in bb},
        })
        lines.append(f'{cid} {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}')

    ann_path = OUT / 'GX010106_snapshot_05.01.361_annotated.jpg'
    cv2.imwrite(str(ann_path), canvas, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    meta = {
        'source': 'GX010106.MP4_snapshot_05.01.361.png',
        'image_size': {'width': w, 'height': h},
        'annotations': anns,
        'vehicle_count': sum(1 for a in anns if a['kind'] == 'vehicle'),
        'sign_count': sum(1 for a in anns if a['kind'] == 'sign'),
        'notes': (
            'Height Limit 5.5m located by red-circle search under bridge. '
            'Vehicles from Cambodia YOLO + COCO. '
            'Digital green arrow countdown signals are not in the named sign catalog.'
        ),
    }
    (OUT / 'GX010106_snapshot_05.01.361_signs_vehicles.json').write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8',
    )
    (OUT / 'GX010106_snapshot_05.01.361_signs_vehicles.txt').write_text(
        '\n'.join(lines) + '\n', encoding='utf-8',
    )
    print('Saved', ann_path)
    for a in anns:
        print(a['kind'], a['label_en'], a['confidence'], a['bbox_xyxy'])


if __name__ == '__main__':
    main()
