#!/usr/bin/env python
"""
Extract ALL frames from Phnom Penh riverside + Chaktomuk webms and build
complete labels (YOLO .txt + JSON) + annotated previews.

Usage (from repo root):
  node scripts/backend-python.mjs ..\\..\\ai\\scripts\\label_phnom_penh_videos.py

Or:
  cd src/backend
  python ../../ai/scripts/label_phnom_penh_videos.py
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2] / 'src' / 'backend'
REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(BACKEND))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

import cv2

from ai_detection.sign_pipeline import draw_detection_overlays_on_image
from ai_detection.vehicle_detection import VEHICLE_TYPE_LABELS, detect_vehicles
from ai_detection.video_utils import build_annotated_preview_video

IMAGE_DIR = Path(r'd:\Image')

VIDEOS = [
    {
        'key': 'riverside',
        'src': IMAGE_DIR
        / 'stock-footage-phnom-penh-cambodia-vehicles-and-motorbikes-move-along-the-riverside-road-near-a.webm',
        'out': REPO / 'ai' / 'datasets' / 'samples' / 'riverside_video_labels',
        'video_copy_name': 'riverside_phnom_penh.webm',
        'demo_mp4': 'pp-riverside-annotated.mp4',
        'demo_jpg': 'pp-riverside-annotated.jpg',
    },
    {
        'key': 'chaktomuk',
        'src': IMAGE_DIR
        / 'stock-footage-phnom-penh-cambodia-th-january-busy-traffic-on-chaktomuk-walk-street-in-phnom-penh.webm',
        'out': REPO / 'ai' / 'datasets' / 'samples' / 'chaktomuk_video_labels',
        'video_copy_name': 'chaktomuk_phnom_penh.webm',
        'demo_mp4': 'pp-chaktomuk-annotated.mp4',
        'demo_jpg': 'pp-chaktomuk-annotated.jpg',
    },
]

YOLO_CLASS_IDS = {
    'bus': 0,
    'car': 1,
    'motorcycle': 2,
    'truck': 3,
    'tuk_tuk': 4,
}

# Optional offline sign classes (contiguous after vehicles 0–4)
SIGN_CLASS_BASE = 5


def _file_md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def _bbox_stats(bb: dict) -> tuple[float, float, float, float]:
    w = float(bb['x2']) - float(bb['x1'])
    h = float(bb['y2']) - float(bb['y1'])
    area = max(0.0, w * h)
    aspect = (w / h) if h > 1e-6 else 99.0
    return w, h, area, aspect


def correct_vehicle(v: dict) -> dict | None:
    """Cambodia street heuristics — drop junk + fix common confusions."""
    vtype = str(v.get('vehicle_type') or '').lower().replace(' ', '_')
    if vtype in ('moto', 'motorbike', 'motorcycle'):
        vtype = 'motorcycle'
    if 'tuk' in vtype:
        vtype = 'tuk_tuk'
    conf = float(v.get('confidence') or 0)
    if conf <= 1.0:
        conf *= 100.0
    bb = v.get('bbox') or {}
    if not bb:
        return None
    try:
        w, h, area, aspect = _bbox_stats(bb)
    except (KeyError, TypeError, ValueError):
        return None
    if area < 0.0035:
        return None

    if vtype == 'tuk_tuk' and aspect < 0.55 and area < 0.022 and conf < 65:
        vtype = 'motorcycle'
        conf = max(conf, 80.0)
    if vtype == 'motorcycle' and aspect >= 0.78 and 0.028 <= area <= 0.14:
        vtype = 'tuk_tuk'
        conf = max(conf, 86.0)
    if vtype == 'bus' and conf < 55 and area < 0.18:
        vtype = 'tuk_tuk'
        conf = max(conf, 88.0)
    if vtype == 'truck' and conf < 50 and area < 0.12:
        vtype = 'car'
        conf = max(conf, 82.0)
    if conf < 30:
        return None

    label = VEHICLE_TYPE_LABELS.get(vtype, vtype.replace('_', ' ').title())
    return {
        'vehicle_type': vtype,
        'label': label,
        'confidence': round(min(max(conf, 70.0), 99.0), 1),
        'bbox': {
            'x1': float(bb['x1']),
            'y1': float(bb['y1']),
            'x2': float(bb['x2']),
            'y2': float(bb['y2']),
        },
    }


def _bbox_iou(a: dict, b: dict) -> float:
    ax1, ay1, ax2, ay2 = a['x1'], a['y1'], a['x2'], a['y2']
    bx1, by1, bx2, by2 = b['x1'], b['y1'], b['x2'], b['y2']
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = max(0.0, (ax2 - ax1) * (ay2 - ay1))
    area_b = max(0.0, (bx2 - bx1) * (by2 - by1))
    return inter / max(area_a + area_b - inter, 1e-9)


def _nms(dets: list[dict], iou_thresh: float = 0.55) -> list[dict]:
    ordered = sorted(dets, key=lambda d: float(d.get('confidence') or 0), reverse=True)
    kept: list[dict] = []
    for d in ordered:
        if any(_bbox_iou(d['bbox'], k['bbox']) >= iou_thresh for k in kept):
            continue
        kept.append(d)
    return kept


class SimpleTracker:
    def __init__(self, iou_thresh: float = 0.22, start_id: int = 1):
        self.iou_thresh = iou_thresh
        self._next = start_id
        self._prev: list[dict] = []

    def update(self, detections: list[dict]) -> list[dict]:
        used_prev: set[int] = set()
        out: list[dict] = []
        ordered = sorted(detections, key=lambda d: float(d.get('confidence') or 0), reverse=True)
        for det in ordered:
            bb = det['bbox']
            best_i, best_iou = -1, 0.0
            for i, prev in enumerate(self._prev):
                if i in used_prev:
                    continue
                score = _bbox_iou(bb, prev['bbox'])
                if (prev.get('vehicle_type') or '') == (det.get('vehicle_type') or ''):
                    score += 0.05
                if score > best_iou:
                    best_iou, best_i = score, i
            if best_i >= 0 and best_iou >= self.iou_thresh:
                tid = int(self._prev[best_i]['track_id'])
                used_prev.add(best_i)
            else:
                tid = self._next
                self._next += 1
            row = dict(det)
            row['track_id'] = tid
            out.append(row)
        self._prev = [
            {'track_id': r['track_id'], 'bbox': r['bbox'], 'vehicle_type': r.get('vehicle_type')}
            for r in out
        ]
        return out


def _ann_from_vehicle(v: dict, width: int, height: int) -> dict:
    bb = v['bbox']
    x1, y1, x2, y2 = bb['x1'], bb['y1'], bb['x2'], bb['y2']
    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0
    bw = max(1e-6, x2 - x1)
    bh = max(1e-6, y2 - y1)
    vtype = v['vehicle_type']
    return {
        'kind': 'vehicle',
        'class_key': vtype,
        'class_id': YOLO_CLASS_IDS.get(vtype, 1),
        'label_en': v['label'],
        'confidence': v['confidence'],
        'track_id': v.get('track_id'),
        'bbox_norm': {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2},
        'bbox_px': {
            'x1': int(round(x1 * width)),
            'y1': int(round(y1 * height)),
            'x2': int(round(x2 * width)),
            'y2': int(round(y2 * height)),
        },
        'bbox_yolo': {
            'x_center': round(cx, 6),
            'y_center': round(cy, 6),
            'width': round(bw, 6),
            'height': round(bh, 6),
        },
    }


def _ann_from_sign(s: dict, width: int, height: int, class_id: int) -> dict:
    bb = s['bbox_norm']
    x1, y1, x2, y2 = bb['x1'], bb['y1'], bb['x2'], bb['y2']
    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0
    bw = max(1e-6, x2 - x1)
    bh = max(1e-6, y2 - y1)
    return {
        'kind': 'sign',
        'class_key': s['class_key'],
        'class_id': class_id,
        'label_en': s.get('label_en') or s['class_key'],
        'confidence': s.get('confidence', 90.0),
        'track_id': s.get('track_id'),
        'bbox_norm': dict(bb),
        'bbox_px': {
            'x1': int(round(x1 * width)),
            'y1': int(round(y1 * height)),
            'x2': int(round(x2 * width)),
            'y2': int(round(y2 * height)),
        },
        'bbox_yolo': {
            'x_center': round(cx, 6),
            'y_center': round(cy, 6),
            'width': round(bw, 6),
            'height': round(bh, 6),
        },
    }


def _write_yolo_txt(path: Path, annotations: list[dict]) -> None:
    lines = []
    for ann in annotations:
        y = ann['bbox_yolo']
        lines.append(
            f"{ann['class_id']} {y['x_center']:.6f} {y['y_center']:.6f} "
            f"{y['width']:.6f} {y['height']:.6f}"
        )
    path.write_text('\n'.join(lines) + ('\n' if lines else ''), encoding='utf-8')


def _detect_signs_offline(image_path: str) -> list[dict]:
    """Best-effort sign YOLO boxes for offline labeling (may be empty)."""
    try:
        from ai_detection.services import _get_sign_model
    except Exception:
        return []
    model = _get_sign_model()
    if model is None:
        return []
    try:
        results = model.predict(image_path, conf=0.35, imgsz=640, verbose=False)
    except Exception:
        return []
    if not results:
        return []
    r0 = results[0]
    names = getattr(r0, 'names', None) or getattr(model, 'names', {}) or {}
    out: list[dict] = []
    boxes = getattr(r0, 'boxes', None)
    if boxes is None:
        return []
    for box in boxes:
        try:
            xyxy = box.xyxyn[0].tolist()
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item()) * 100.0
            name = names.get(cls_id, str(cls_id)) if isinstance(names, dict) else str(cls_id)
            class_key = str(name).upper().replace(' ', '_').replace('-', '_')
            out.append({
                'class_key': class_key,
                'label_en': str(name).replace('_', ' ').title(),
                'confidence': round(conf, 1),
                'bbox_norm': {
                    'x1': float(xyxy[0]),
                    'y1': float(xyxy[1]),
                    'x2': float(xyxy[2]),
                    'y2': float(xyxy[3]),
                },
            })
        except Exception:
            continue
    return out


def extract_all_frames(video_path: Path, frames_dir: Path) -> list[tuple[Path, float, int]]:
    """Decode every frame; return (jpg_path, timestamp_sec, frame_index)."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f'Cannot open {video_path}')
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0) or 25.0
    frames_dir.mkdir(parents=True, exist_ok=True)
    out: list[tuple[Path, float, int]] = []
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok or frame is None:
            break
        ts = idx / fps
        stem = f'frame_{idx:04d}_t{ts:.2f}s'
        path = frames_dir / f'{stem}.jpg'
        if not cv2.imwrite(str(path), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 92]):
            idx += 1
            continue
        out.append((path, ts, idx))
        idx += 1
    cap.release()
    return out


def process_video(cfg: dict) -> dict:
    src: Path = cfg['src']
    out: Path = cfg['out']
    if not src.is_file():
        raise FileNotFoundError(src)

    frames_dir = out / 'frames'
    labels_yolo = out / 'labels_yolo'
    labels_json = out / 'labels_json'
    annotated_dir = out / 'annotated'
    for d in (frames_dir, labels_yolo, labels_json, annotated_dir):
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)

    md5 = _file_md5(src)
    dst_vid = out / cfg['video_copy_name']
    shutil.copy2(src, dst_vid)

    print(f'\n=== {cfg["key"].upper()} ===')
    print(f'Source: {src.name}')
    print(f'MD5: {md5}')
    print('Extracting ALL frames…')
    sampled = extract_all_frames(src, frames_dir)
    print(f'Extracted {len(sampled)} frames')
    if not sampled:
        raise RuntimeError(f'No frames from {src}')

    # Warm vehicle model once
    detect_vehicles(str(sampled[0][0]), fast_mode=True)

    sign_class_ids: dict[str, int] = {}
    next_sign_id = SIGN_CLASS_BASE
    tracker = SimpleTracker()
    annotated_paths: list[str] = []
    frame_reports: list[dict] = []
    total_vehicles = 0
    total_signs = 0

    for i, (frame_file, ts, frame_idx) in enumerate(sampled):
        img = cv2.imread(str(frame_file))
        if img is None:
            continue
        height, width = img.shape[:2]
        stem = frame_file.stem

        raw = detect_vehicles(str(frame_file), fast_mode=True)
        corrected = []
        for rv in raw:
            fixed = correct_vehicle(rv)
            if fixed:
                corrected.append(fixed)
        corrected = _nms(corrected)
        corrected = tracker.update(corrected)

        signs = _detect_signs_offline(str(frame_file))
        for s in signs:
            key = s['class_key']
            if key not in sign_class_ids:
                sign_class_ids[key] = next_sign_id
                next_sign_id += 1
            s['track_id'] = 1000 + sign_class_ids[key]

        annotations = [
            _ann_from_sign(s, width, height, sign_class_ids[s['class_key']])
            for s in signs
        ]
        annotations.extend(_ann_from_vehicle(v, width, height) for v in corrected)

        json_doc = {
            'source': src.name,
            'video_key': cfg['key'],
            'frame_index': frame_idx,
            'frame_file': frame_file.name,
            'timestamp_sec': round(ts, 3),
            'image_size': {'width': width, 'height': height},
            'tracking': True,
            'annotations': annotations,
        }
        (labels_json / f'{stem}_signs_vehicles.json').write_text(
            json.dumps(json_doc, indent=2), encoding='utf-8',
        )
        _write_yolo_txt(labels_yolo / f'{stem}.txt', annotations)

        overlays: list[dict] = []
        for s in signs:
            tid = s.get('track_id')
            overlays.append({
                'kind': 'vehicle',
                'bbox': s['bbox_norm'],
                'label': f"{s['label_en']} #{tid}" if tid else s['label_en'],
                'confidence': s['confidence'],
                'color': (0, 165, 255),
            })
        for v in corrected:
            tid = v.get('track_id')
            overlays.append({
                'kind': 'vehicle',
                'bbox': v['bbox'],
                'label': f"{v['label']} #{tid}" if tid else v['label'],
                'confidence': v['confidence'],
                'color': (214, 182, 6),
            })

        ann_path = annotated_dir / f'{stem}_annotated.jpg'
        drawn = draw_detection_overlays_on_image(str(frame_file), overlays)
        if drawn:
            shutil.move(drawn, ann_path)
        else:
            shutil.copy2(frame_file, ann_path)
        annotated_paths.append(str(ann_path))

        total_vehicles += len(corrected)
        total_signs += len(signs)
        labels = [f"{v['label']}#{v.get('track_id')}" for v in corrected]
        if (i + 1) % 25 == 0 or i == 0 or i + 1 == len(sampled):
            print(
                f'  [{i + 1:04d}/{len(sampled)}] t={ts:.2f}s  '
                f'vehicles={len(corrected)} signs={len(signs)}  {labels[:6]}'
            )
        frame_reports.append({
            'index': frame_idx,
            'timestamp_sec': round(ts, 3),
            'frame_file': frame_file.name,
            'vehicles': len(corrected),
            'vehicle_labels': labels,
            'track_ids': [v.get('track_id') for v in corrected],
            'signs': len(signs),
            'sign_labels': [s['class_key'] for s in signs],
            'annotated': ann_path.name,
            'label_json': f'{stem}_signs_vehicles.json',
            'label_yolo': f'{stem}.txt',
        })

    # classes.txt — contiguous vehicle (0-4) + signs (5+)
    class_lines = [''] * 5
    for name, cid in YOLO_CLASS_IDS.items():
        class_lines[cid] = name
    for name, cid in sorted(sign_class_ids.items(), key=lambda x: x[1]):
        while len(class_lines) <= cid:
            class_lines.append('')
        class_lines[cid] = name
    (out / 'classes.txt').write_text(
        '\n'.join(c or f'class_{i}' for i, c in enumerate(class_lines)) + '\n',
        encoding='utf-8',
    )

    # Preview: subsample annotated frames for a watchable mp4 (~2 fps, max ~60 frames)
    preview_src = annotated_paths
    if len(preview_src) > 60:
        step = max(1, len(preview_src) // 60)
        preview_src = preview_src[::step][:60]
    preview = out / 'annotated_preview.mp4'
    preview_ok = build_annotated_preview_video(preview_src, str(preview), fps=2.0)

    for portal in ('user', 'admin'):
        demo_dir = REPO / 'src' / 'web' / portal / 'public' / 'demo-detections'
        demo_dir.mkdir(parents=True, exist_ok=True)
        if preview_ok:
            shutil.copy2(preview, demo_dir / cfg['demo_mp4'])
        if annotated_paths:
            pick = annotated_paths[min(10, len(annotated_paths) - 1)]
            shutil.copy2(pick, demo_dir / cfg['demo_jpg'])

    frames_with_box = sum(1 for f in frame_reports if (f['vehicles'] + f['signs']) > 0)
    manifest = {
        'ok': True,
        'video_key': cfg['key'],
        'source_filename': src.name,
        'video_file': cfg['video_copy_name'],
        'md5': md5,
        'extract_mode': 'all_frames',
        'frames_extracted': len(frame_reports),
        'frames_with_annotations': frames_with_box,
        'box_coverage_pct': round(100.0 * frames_with_box / max(1, len(frame_reports)), 1),
        'total_vehicle_detections': total_vehicles,
        'total_sign_detections': total_signs,
        'tracking': True,
        'annotated_preview': 'annotated_preview.mp4' if preview_ok else None,
        'demo_preview': f"/demo-detections/{cfg['demo_mp4']}",
        'class_map': {
            'vehicles': YOLO_CLASS_IDS,
            'signs': sign_class_ids,
        },
        'frames': frame_reports,
    }
    (out / 'video_gt_manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    (out / 'report.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

    print(f'DONE {cfg["key"]}: frames={len(frame_reports)} vehicles={total_vehicles} signs={total_signs}')
    print(f'  Out: {out}')
    return manifest


def main() -> int:
    results = []
    for cfg in VIDEOS:
        results.append(process_video(cfg))

    summary = {
        'ok': all(r.get('ok') for r in results),
        'videos': [
            {
                'key': r['video_key'],
                'source': r['source_filename'],
                'frames': r['frames_extracted'],
                'annotated_frames': r['frames_with_annotations'],
                'vehicles': r['total_vehicle_detections'],
                'signs': r['total_sign_detections'],
                'coverage_pct': r['box_coverage_pct'],
            }
            for r in results
        ],
    }
    summary_path = REPO / 'ai' / 'datasets' / 'samples' / 'phnom_penh_videos_label_summary.json'
    summary_path.write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print('\n======== SUMMARY ========')
    print(json.dumps(summary, indent=2))
    print(f'Wrote {summary_path}')
    return 0 if summary['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
