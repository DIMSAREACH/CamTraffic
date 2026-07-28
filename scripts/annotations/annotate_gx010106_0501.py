"""
Annotate GX010106 snapshot 05.01.361 with traffic signs + vehicles.
Uses CamTraffic YOLO sign model (multi-box) + vehicle/COCO models.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src' / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

import cv2
from ultralytics import YOLO

from ai_detection.pipeline import run_detection_pipeline
from ai_detection.services import _collect_yolo_sign_detections, _get_sign_model, _infer_imgsz

SRC = ROOT / 'ai' / 'datasets' / 'samples' / 'manual_labels' / 'GX010106_snapshot_05.01.361.png'
OUT_DIR = ROOT / 'ai' / 'datasets' / 'samples' / 'manual_labels'
OUT_DIR.mkdir(parents=True, exist_ok=True)

SIGN_COLORS = {
    'height': (0, 0, 255),
    'no_entry': (0, 0, 255),
    'keep': (255, 128, 0),
    'default': (0, 255, 0),
}


def xyxy_to_yolo(bbox: dict) -> tuple[float, float, float, float]:
    x1, y1, x2, y2 = float(bbox['x1']), float(bbox['y1']), float(bbox['x2']), float(bbox['y2'])
    return (
        round((x1 + x2) / 2, 6),
        round((y1 + y2) / 2, 6),
        round(x2 - x1, 6),
        round(y2 - y1, 6),
    )


def _iou(a: dict, b: dict) -> float:
    ax1, ay1, ax2, ay2 = float(a['x1']), float(a['y1']), float(a['x2']), float(a['y2'])
    bx1, by1, bx2, by2 = float(b['x1']), float(b['y1']), float(b['x2']), float(b['y2'])
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    if inter <= 0:
        return 0.0
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    return inter / (area_a + area_b - inter)


def sign_color(class_key: str, label: str) -> tuple[int, int, int]:
    key = f'{class_key} {label}'.lower()
    if 'height' in key or '5.5' in key or 'no_entry' in key or 'no entry' in key:
        return SIGN_COLORS['height']
    if 'keep' in key:
        return SIGN_COLORS['keep']
    return SIGN_COLORS['default']


def main() -> None:
    if not SRC.is_file() or SRC.stat().st_size < 1000:
        raise SystemExit(f'Missing/empty source image: {SRC}')

    img = cv2.imread(str(SRC))
    if img is None:
        raise SystemExit(f'Could not read {SRC}')
    h, w = img.shape[:2]
    print(f'Source: {SRC.name} ({w}x{h})')

    work_jpg = OUT_DIR / 'GX010106_snapshot_05.01.361_work.jpg'
    cv2.imwrite(str(work_jpg), img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

    # --- Signs (multi-box from sign YOLO) ---
    model = _get_sign_model()
    sign_dets: list[dict] = []
    if model is not None:
        imgsz = max(_infer_imgsz(fast_live=False), 960)
        results = model.predict(str(work_jpg), conf=0.15, imgsz=imgsz, iou=0.55, verbose=False)
        sign_dets = _collect_yolo_sign_detections(results, min_conf=0.15)
        print(f'Sign detections: {len(sign_dets)}')
        for d in sign_dets:
            print(f"  {d.get('label')} {d.get('class_key')} conf={d.get('confidence')}")

    # --- Vehicles via full pipeline + COCO supplement ---
    print('Running vehicle / plate pipeline...')
    out = run_detection_pipeline(
        str(work_jpg),
        original_filename='GX010106_snapshot_05.01.361.jpg',
        enable_ocr=False,
        enable_plate=True,
        enable_helmet=False,
        live_fast=False,
    )
    vehicles = list(out.get('vehicles') or [])
    print(f'  Pipeline vehicles: {len(vehicles)}')

    coco = YOLO(str(ROOT / 'ai' / 'weights' / 'pretrained' / 'yolov8n.pt'))
    coco_res = coco.predict(str(work_jpg), conf=0.18, imgsz=1280, classes=[2, 3, 5, 7], verbose=False)[0]
    coco_map = {2: ('car', 'Car'), 3: ('motorcycle', 'Motorcycle'), 5: ('bus', 'Bus'), 7: ('truck', 'Truck')}
    extra: list[dict] = []
    for box in coco_res.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0]) * 100.0
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
        bbox = {
            'x1': round(x1 / w, 6),
            'y1': round(y1 / h, 6),
            'x2': round(x2 / w, 6),
            'y2': round(y2 / h, 6),
        }
        area = (bbox['x2'] - bbox['x1']) * (bbox['y2'] - bbox['y1'])
        if area > 0.35 or area < 0.0006 or bbox['y1'] > 0.88:
            continue  # drop hood / noise
        vtype, label = coco_map[cls_id]
        # Heuristic: mid-right small wide vehicle near sidewalk → tuk-tuk
        if vtype == 'car' and 0.55 <= bbox['x1'] <= 0.78 and 0.45 <= bbox['y1'] <= 0.65 and area < 0.04:
            vtype, label = 'tuk_tuk', 'Tuk Tuk'
        cand = {
            'vehicle_type': vtype,
            'label': label,
            'confidence': round(conf, 1),
            'bbox': bbox,
            'source': 'coco_supplement',
        }
        if any(_iou(cand['bbox'], v.get('bbox') or {}) >= 0.35 for v in vehicles + extra):
            continue
        extra.append(cand)
    vehicles.extend(extra)
    print(f'  Vehicles after COCO: {len(vehicles)}')

    overlay_items: list[dict] = []
    annotations: list[dict] = []
    yolo_lines: list[str] = []

    for d in sign_dets[:8]:
        bb = d.get('sign_bbox') or {}
        if not bb:
            continue
        label = d.get('label') or d.get('class_key') or 'Sign'
        conf = float(d.get('confidence') or 0)
        class_id = int(d.get('class_id') or 0)
        overlay_items.append({
            'kind': 'sign',
            'bbox': bb,
            'label': label,
            'confidence': conf,
            'color': sign_color(str(d.get('class_key') or ''), label),
        })
        xc, yc, bw, bh = xyxy_to_yolo(bb)
        x1p, y1p = int(float(bb['x1']) * w), int(float(bb['y1']) * h)
        x2p, y2p = int(float(bb['x2']) * w), int(float(bb['y2']) * h)
        annotations.append({
            'kind': 'sign',
            'class_id': class_id,
            'class_key': d.get('class_key'),
            'label_en': label,
            'confidence': conf,
            'bbox_xyxy': [x1p, y1p, x2p, y2p],
            'bbox_yolo': {'x_center': xc, 'y_center': yc, 'width': bw, 'height': bh},
            'bbox_norm': bb,
        })
        yolo_lines.append(f'{class_id} {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}')

    vehicle_class_map = {
        'car': 100, 'motorcycle': 101, 'truck': 102, 'bus': 103,
        'tuk_tuk': 104, 'tuk tuk': 104, 'vehicle': 109,
    }
    for v in vehicles[:16]:
        conf = float(v.get('confidence') or 0)
        if conf < 18:
            continue
        bbox = v.get('bbox')
        if not bbox:
            continue
        area = (float(bbox['x2']) - float(bbox['x1'])) * (float(bbox['y2']) - float(bbox['y1']))
        label = (v.get('label') or v.get('vehicle_type') or 'Vehicle').strip()
        vtype = (v.get('vehicle_type') or label).lower().replace(' ', '_')
        if vtype == 'car' and area < 0.002:
            continue
        overlay_items.append({
            'kind': 'vehicle',
            'bbox': bbox,
            'label': label,
            'confidence': conf,
            'color': (0, 255, 0),
        })
        xc, yc, bw, bh = xyxy_to_yolo(bbox)
        key = label.lower().replace('_', ' ')
        class_id = 109
        for k, cid in vehicle_class_map.items():
            if k in key or k == vtype:
                class_id = cid
                break
        x1p, y1p = int(float(bbox['x1']) * w), int(float(bbox['y1']) * h)
        x2p, y2p = int(float(bbox['x2']) * w), int(float(bbox['y2']) * h)
        annotations.append({
            'kind': 'vehicle',
            'class_id': class_id,
            'class_key': label.upper().replace(' ', '_'),
            'label_en': label,
            'confidence': round(conf, 2),
            'bbox_xyxy': [x1p, y1p, x2p, y2p],
            'bbox_yolo': {'x_center': xc, 'y_center': yc, 'width': bw, 'height': bh},
            'bbox_norm': {
                'x1': float(bbox['x1']), 'y1': float(bbox['y1']),
                'x2': float(bbox['x2']), 'y2': float(bbox['y2']),
            },
        })
        yolo_lines.append(f'{class_id} {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}')

    # Manual height-limit box if YOLO missed the 5.5m sign (common — not in named catalog).
    has_height = any('5.5' in str(a.get('label_en') or '') or 'height' in str(a.get('class_key') or '').lower() for a in annotations)
    if not has_height:
        # Approximate location under bridge center from scene
        # Circular 5.5m clearance sign on overpass beam (between green arrow signals)
        height_bb = {'x1': 0.73724, 'y1': 0.023148, 'x2': 0.78099, 'y2': 0.100463}
        overlay_items.append({
            'kind': 'sign',
            'bbox': height_bb,
            'label': 'Height Limit 5.5m',
            'confidence': 92.0,
            'color': (0, 0, 255),
        })
        xc, yc, bw, bh = xyxy_to_yolo(height_bb)
        annotations.append({
            'kind': 'sign',
            'class_id': 200,
            'class_key': 'HEIGHT_LIMIT_5_5M',
            'label_en': 'Height Limit 5.5m',
            'confidence': 92.0,
            'bbox_xyxy': [
                int(height_bb['x1'] * w), int(height_bb['y1'] * h),
                int(height_bb['x2'] * w), int(height_bb['y2'] * h),
            ],
            'bbox_yolo': {'x_center': xc, 'y_center': yc, 'width': bw, 'height': bh},
            'bbox_norm': height_bb,
            'note': 'Manual label — digital height clearance sign under bridge',
        })
        yolo_lines.append(f'200 {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}')
        print('  Added manual Height Limit 5.5m box')

    print(f'Drawing {len(overlay_items)} overlays...')
    canvas = img.copy()
    for item in overlay_items:
        bb = item.get('bbox') or {}
        try:
            x1 = int(max(0.0, float(bb['x1'])) * w)
            y1 = int(max(0.0, float(bb['y1'])) * h)
            x2 = int(min(1.0, float(bb['x2'])) * w)
            y2 = int(min(1.0, float(bb['y2'])) * h)
        except (KeyError, TypeError, ValueError):
            continue
        if x2 <= x1 or y2 <= y1:
            continue
        color = item.get('color') or (0, 255, 0)
        thickness = max(2, min(4, w // 700))
        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, thickness)
        label = str(item.get('label') or '').strip()
        conf = float(item.get('confidence') or 0)
        conf_txt = f'{conf / 100.0:.2f}' if conf > 1.0 else (f'{conf:.2f}' if conf > 0 else '')
        text = f'{label} {conf_txt}'.strip()
        if not text:
            continue
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = max(0.45, min(0.9, w / 2200))
        (tw, th), _ = cv2.getTextSize(text, font, scale, 1)
        ty = max(0, y1 - th - 6)
        cv2.rectangle(canvas, (x1, ty), (x1 + tw + 6, ty + th + 6), color, -1)
        cv2.putText(canvas, text, (x1 + 3, ty + th + 2), font, scale, (0, 0, 0), 1, cv2.LINE_AA)

    ann_out = OUT_DIR / 'GX010106_snapshot_05.01.361_annotated.jpg'
    cv2.imwrite(str(ann_out), canvas, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    print(f'Annotated: {ann_out}')

    meta = {
        'source': 'GX010106.MP4_snapshot_05.01.361.png',
        'image_size': {'width': w, 'height': h},
        'annotations': annotations,
        'vehicle_count': len([a for a in annotations if a['kind'] == 'vehicle']),
        'sign_count': len([a for a in annotations if a['kind'] == 'sign']),
        'format': 'YOLO (class_id x_center y_center width height) normalized',
        'notes': 'Signs from YOLO multi-detect (+ manual height limit if missed); vehicles from Cambodia YOLO + COCO.',
    }
    json_out = OUT_DIR / 'GX010106_snapshot_05.01.361_signs_vehicles.json'
    json_out.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8')
    txt_out = OUT_DIR / 'GX010106_snapshot_05.01.361_signs_vehicles.txt'
    txt_out.write_text('\n'.join(yolo_lines) + '\n', encoding='utf-8')
    print(f'JSON: {json_out}')
    print(f'YOLO txt: {txt_out}')
    print('\nSummary:')
    for a in annotations:
        print(f"  [{a['kind']}] {a.get('label_en')} conf={a.get('confidence')} box={a['bbox_xyxy']}")

    try:
        work_jpg.unlink(missing_ok=True)
    except Exception:
        pass


if __name__ == '__main__':
    main()
