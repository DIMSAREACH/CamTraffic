"""Fix Height Limit 5.5m box onto the real overpass sign (not the truck)."""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parents[1]
OUT = ROOT / 'ai' / 'datasets' / 'samples' / 'manual_labels'
SRC = OUT / 'GX010106_snapshot_05.01.361.png'


def main() -> None:
    img = cv2.imread(str(SRC))
    if img is None:
        raise SystemExit(f'Cannot read {SRC}')
    h, w = img.shape[:2]

    # Region with left arrow + height sign + right arrow on overpass beam
    rx1, ry1, rx2, ry2 = 2580, 60, 3360, 420
    roi = img[ry1:ry2, rx1:rx2]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (7, 7), 1.5)
    circles = cv2.HoughCircles(
        blur, cv2.HOUGH_GRADIENT, dp=1.2, minDist=40,
        param1=80, param2=20, minRadius=25, maxRadius=90,
    )

    best = None
    if circles is not None:
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        for c in circles[0]:
            cx, cy, r = map(float, c)
            yy, xx = np.ogrid[: roi.shape[0], : roi.shape[1]]
            dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
            ring = (dist >= r * 0.7) & (dist <= r * 1.05)
            core = dist <= r * 0.55
            if int(ring.sum()) < 30:
                continue
            rh = hsv[:, :, 0][ring]
            rs = hsv[:, :, 1][ring]
            red_frac = float((((rh < 12) | (rh > 160)) & (rs > 60)).mean())
            core_bright = float(roi[core].mean()) if core.any() else 0.0
            score = red_frac * 100 + (20 if core_bright > 100 else 0)
            print(
                f'cand cx={cx:.0f} cy={cy:.0f} r={r:.0f} '
                f'red={red_frac:.2f} core={core_bright:.0f} score={score:.1f}'
            )
            if best is None or score > best[0]:
                best = (score, cx, cy, r)

    if best:
        _, cx, cy, r = best
        pad = int(r * 0.18)
        x1 = int(rx1 + cx - r - pad)
        y1 = int(ry1 + cy - r - pad)
        x2 = int(rx1 + cx + r + pad)
        y2 = int(ry1 + cy + r + pad)
        print('BEST full xyxy', x1, y1, x2, y2)
    else:
        # Manual fallback from verified lights-row crop
        x1, y1, x2, y2 = 2865, 125, 3015, 285
        print('FALLBACK', x1, y1, x2, y2)

    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w - 1, x2), min(h - 1, y2)
    height_bb = {'x1': x1 / w, 'y1': y1 / h, 'x2': x2 / w, 'y2': y2 / h}
    print('norm', {k: round(v, 6) for k, v in height_bb.items()})

    crop = img[y1:y2, x1:x2]
    cv2.imwrite(
        str(OUT / '_final_height_crop.jpg'),
        cv2.resize(crop, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC),
    )

    meta_path = OUT / 'GX010106_snapshot_05.01.361_signs_vehicles.json'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    vehicles = [a for a in meta['annotations'] if a['kind'] == 'vehicle']

    canvas = img.copy()
    overlays = [{
        'kind': 'sign',
        'label': 'Height Limit 5.5m',
        'class_key': 'HEIGHT_LIMIT_5_5M',
        'class_id': 200,
        'confidence': 95.0,
        'bbox': height_bb,
        'color': (0, 0, 255),
    }]
    for v in vehicles:
        overlays.append({
            'kind': 'vehicle',
            'label': v['label_en'],
            'class_key': v['class_key'],
            'class_id': v['class_id'],
            'confidence': v['confidence'],
            'bbox': v['bbox_norm'],
            'color': (0, 255, 0),
        })

    anns: list[dict] = []
    lines: list[str] = []
    for it in overlays:
        bb = it['bbox']
        X1, Y1 = int(bb['x1'] * w), int(bb['y1'] * h)
        X2, Y2 = int(bb['x2'] * w), int(bb['y2'] * h)
        color = it['color']
        thickness = max(2, min(4, w // 700))
        cv2.rectangle(canvas, (X1, Y1), (X2, Y2), color, thickness)
        conf = float(it['confidence'])
        txt = f"{it['label']} {conf / 100:.2f}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = max(0.45, min(0.9, w / 2200))
        (tw, thh), _ = cv2.getTextSize(txt, font, scale, 1)
        ty = max(0, Y1 - thh - 6)
        cv2.rectangle(canvas, (X1, ty), (X1 + tw + 6, ty + thh + 6), color, -1)
        cv2.putText(canvas, txt, (X1 + 3, ty + thh + 2), font, scale, (0, 0, 0), 1, cv2.LINE_AA)

        xc = (bb['x1'] + bb['x2']) / 2
        yc = (bb['y1'] + bb['y2']) / 2
        bw = bb['x2'] - bb['x1']
        bh = bb['y2'] - bb['y1']
        anns.append({
            'kind': it['kind'],
            'class_id': it['class_id'],
            'class_key': it['class_key'],
            'label_en': it['label'],
            'confidence': conf,
            'bbox_xyxy': [X1, Y1, X2, Y2],
            'bbox_yolo': {
                'x_center': round(xc, 6),
                'y_center': round(yc, 6),
                'width': round(bw, 6),
                'height': round(bh, 6),
            },
            'bbox_norm': {k: round(bb[k], 6) for k in bb},
        })
        lines.append(f"{it['class_id']} {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}")

    ann_path = OUT / 'GX010106_snapshot_05.01.361_annotated.jpg'
    cv2.imwrite(str(ann_path), canvas, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    new_meta = {
        'source': 'GX010106.MP4_snapshot_05.01.361.png',
        'image_size': {'width': w, 'height': h},
        'annotations': anns,
        'vehicle_count': sum(1 for a in anns if a['kind'] == 'vehicle'),
        'sign_count': sum(1 for a in anns if a['kind'] == 'sign'),
        'notes': (
            'Height Limit 5.5m corrected onto circular sign on overpass beam '
            '(between green arrow countdown signals). Previous box was wrongly '
            'on the white truck corner. Vehicles unchanged.'
        ),
    }
    meta_path.write_text(json.dumps(new_meta, indent=2, ensure_ascii=False), encoding='utf-8')
    (OUT / 'GX010106_snapshot_05.01.361_signs_vehicles.txt').write_text(
        '\n'.join(lines) + '\n', encoding='utf-8',
    )

    # Keep annotate script coords in sync
    clean = SCRIPT_DIR / 'annotate_gx010106_0501_clean.py'
    if clean.is_file():
        text = clean.read_text(encoding='utf-8')
        old = "height = {'x1': 2399 / w, 'y1': 680 / h, 'x2': 2496 / w, 'y2': 780 / h}"
        new = (
            f"height = {{'x1': {x1} / w, 'y1': {y1} / h, "
            f"'x2': {x2} / w, 'y2': {y2} / h}}"
        )
        if old in text:
            clean.write_text(text.replace(old, new), encoding='utf-8')
            print('Updated annotate_gx010106_0501_clean.py coords')

    print('Saved', ann_path)
    for a in anns:
        print(a['kind'], a['label_en'], a['bbox_xyxy'])


if __name__ == '__main__':
    main()
