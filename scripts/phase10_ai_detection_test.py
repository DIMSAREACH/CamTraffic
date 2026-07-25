#!/usr/bin/env python
"""
Phase 10 — batch AI detection test log (thesis evidence).

Runs sign inference on up to N images and M videos, writes JSON + markdown summary.
Uses production sign weights (default: ai/weights/best.pt — same as AI_MODEL_PATH).

Usage (repo root):
  python scripts/phase10_ai_detection_test.py
  python scripts/phase10_ai_detection_test.py --images 50 --videos 10
  python scripts/phase10_ai_detection_test.py --pipeline-sample 10   # Django full pipeline on 10 images
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI_ROOT = ROOT / 'ai'
REPORTS = ROOT / 'docs' / 'reports'
BACKEND = ROOT / 'backend'

IMAGE_POOLS = [
    (AI_ROOT / 'dataset_10' / 'images' / 'val', 'dataset_10_val'),
    (AI_ROOT / 'datasets' / 'splits' / 'cam_tsr_street_signs_dim_sareach' / 'images' / 'test', 'cam_tsr_test'),
]

VIDEO_POOLS = [
    AI_ROOT / 'datasets' / 'raw' / 'road_footage' / 'urban',
]


def _collect_images(limit: int, seed: int) -> list[tuple[Path, str]]:
    by_pool: list[list[tuple[Path, str]]] = []
    exts = {'.jpg', '.jpeg', '.png', '.webp'}
    for folder, tag in IMAGE_POOLS:
        if not folder.is_dir():
            continue
        imgs = sorted(p for p in folder.rglob('*') if p.suffix.lower() in exts)
        by_pool.append([(p, tag) for p in imgs])
    if not by_pool:
        raise SystemExit('No image pools found for Phase 10 test')

    rng = random.Random(seed)
    per_pool = max(1, limit // len(by_pool))
    chosen: list[tuple[Path, str]] = []
    for pool in by_pool:
        rng.shuffle(pool)
        chosen.extend(pool[:per_pool])
    rng.shuffle(chosen)
    return chosen[:limit]


def _collect_videos(limit: int) -> list[Path]:
    sys.path.insert(0, str(AI_ROOT / 'scripts'))
    try:
        from dim_sareach_paths import road_footage_source_root

        extra = road_footage_source_root()
    except Exception:
        extra = None

    exts = {'.mp4', '.webm', '.mov', '.avi', '.mkv'}
    paths: list[Path] = []
    for folder in VIDEO_POOLS:
        if folder.is_dir():
            paths.extend(sorted(p for p in folder.iterdir() if p.suffix.lower() in exts))
    if extra and extra.is_dir():
        paths.extend(sorted(p for p in extra.iterdir() if p.suffix.lower() in exts))
    seen: set[str] = set()
    unique: list[Path] = []
    for p in paths:
        key = str(p.resolve())
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique[:limit]


def run_yolo_batch(
    images: list[tuple[Path, str]],
    weights: Path,
    conf: float,
) -> list[dict]:
    from ultralytics import YOLO

    model = YOLO(str(weights))
    rows: list[dict] = []
    for img_path, pool in images:
        t0 = time.perf_counter()
        results = model.predict(str(img_path), conf=conf, verbose=False)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        top = None
        if results and results[0].boxes is not None and len(results[0].boxes):
            boxes = results[0].boxes
            best_i = int(boxes.conf.argmax())
            cls_id = int(boxes.cls[best_i])
            top = {
                'class_id': cls_id,
                'class_name': results[0].names.get(cls_id, str(cls_id)),
                'confidence': round(float(boxes.conf[best_i]), 4),
            }
        rows.append({
            'path': str(img_path),
            'pool': pool,
            'detected': top is not None,
            'top_detection': top,
            'inference_ms': round(elapsed_ms, 1),
        })
    return rows


def run_pipeline_sample(images: list[tuple[Path, str]], limit: int) -> list[dict]:
    sys.path.insert(0, str(BACKEND))
    import os

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    import django

    django.setup()
    from ai_detection.pipeline import run_detection_pipeline

    rows: list[dict] = []
    for img_path, pool in images[:limit]:
        t0 = time.perf_counter()
        try:
            out = run_detection_pipeline(str(img_path), original_filename=img_path.name, sign_only=False)
            payload = out.get('payload') or {}
            rows.append({
                'path': str(img_path),
                'pool': pool,
                'ok': True,
                'sign_name_en': payload.get('sign_name_en') or '',
                'display_confidence': payload.get('display_confidence'),
                'detected_plate': payload.get('detected_plate') or '',
                'vehicle_count': len(out.get('vehicles') or []),
                'pipeline_ms': round((time.perf_counter() - t0) * 1000, 1),
            })
        except Exception as exc:
            rows.append({
                'path': str(img_path),
                'pool': pool,
                'ok': False,
                'error': str(exc),
                'pipeline_ms': round((time.perf_counter() - t0) * 1000, 1),
            })
    return rows


def run_video_yolo(videos: list[Path], weights: Path, conf: float, max_frames: int) -> list[dict]:
    sys.path.insert(0, str(BACKEND))
    from ai_detection.video_utils import extract_video_frames

    from ultralytics import YOLO

    model = YOLO(str(weights))
    rows: list[dict] = []
    for video in videos:
        cleanup: list[str] = []
        try:
            frames = extract_video_frames(str(video), max_frames=max_frames)
            cleanup = [p for p, _ in frames]
            best = None
            for frame_path, ts in frames:
                results = model.predict(frame_path, conf=conf, verbose=False)
                if not results or results[0].boxes is None or len(results[0].boxes) == 0:
                    continue
                boxes = results[0].boxes
                best_i = int(boxes.conf.argmax())
                conf_v = float(boxes.conf[best_i])
                if best is None or conf_v > best['confidence']:
                    cls_id = int(boxes.cls[best_i])
                    best = {
                        'timestamp_sec': round(ts, 2),
                        'class_name': results[0].names.get(cls_id, str(cls_id)),
                        'confidence': round(conf_v, 4),
                    }
            rows.append({
                'video': str(video),
                'frames_sampled': len(frames),
                'sign_detected': best is not None,
                'best_frame': best,
            })
        except Exception as exc:
            rows.append({'video': str(video), 'error': str(exc), 'sign_detected': False})
        finally:
            for p in cleanup:
                Path(p).unlink(missing_ok=True)
    return rows


def write_markdown_summary(report: dict, md_path: Path) -> None:
    img = report.get('image_yolo', {})
    vid = report.get('video_yolo', {})
    pipe = report.get('pipeline_sample', {})
    lines = [
        '# AI Detection — Phase 10 Test Log',
        '',
        f"**Generated:** {report['generated_at']}",
        f"**Weights:** `{report['weights']}`",
        f"**Confidence threshold (YOLO):** {report['conf']}",
        '',
        '## Automated batch — images (YOLO sign model)',
        '',
        f"| Metric | Value |",
        f"|--------|------:|",
        f"| Images tested | {img.get('count', 0)} |",
        f"| Sign detected (≥1 box) | {img.get('detected_count', 0)} |",
        f"| Detection rate | {img.get('detection_rate_pct', 0)}% |",
        f"| Mean inference (ms) | {img.get('mean_inference_ms', '—')} |",
        '',
        '## Automated batch — videos (frame sampling + YOLO)',
        '',
        f"| Metric | Value |",
        f"|--------|------:|",
        f"| Videos tested | {vid.get('count', 0)} |",
        f"| Videos with sign on a sampled frame | {vid.get('detected_count', 0)} |",
        '',
    ]
    if pipe:
        lines.extend([
            '## Django full pipeline sample',
            '',
            f"| Metric | Value |",
            f"|--------|------:|",
            f"| Images | {pipe.get('count', 0)} |",
            f"| Success | {pipe.get('ok_count', 0)} |",
            f"| Mean pipeline (ms) | {pipe.get('mean_ms', '—')} |",
            '',
            '| Image pool | Sign (EN) | Confidence |',
            '|------------|-----------|------------|',
        ])
        for row in (pipe.get('rows') or [])[:15]:
            if not row.get('ok'):
                continue
            name = (row.get('sign_name_en') or '—')[:40]
            conf = row.get('display_confidence')
            conf_s = f"{conf}%" if conf is not None else '—'
            lines.append(f"| {row.get('pool', '')} | {name} | {conf_s} |")
        lines.append('')
    lines.extend([
        '## Manual — Webcam & live camera (officer UAT)',
        '',
        '| Test | Pass | Tester | Date | Notes |',
        '|------|:----:|--------|------|-------|',
        '| Webcam — daylight | ☐ | | | |',
        '| Webcam — low light | ☐ | | | |',
        '| Live camera — demo frame URL | ☐ | | | |',
        '| Live camera — real RTSP/snapshot | ☐ | | | |',
        '',
        '## Raw JSON',
        '',
        f"See `{report['json_file']}`",
        '',
    ])
    md_path.write_text('\n'.join(lines), encoding='utf-8')


def main() -> int:
    parser = argparse.ArgumentParser(description='Phase 10 AI detection batch test')
    parser.add_argument('--images', type=int, default=50)
    parser.add_argument('--videos', type=int, default=10)
    parser.add_argument('--weights', type=Path, default=AI_ROOT / 'weights' / 'best.pt')
    parser.add_argument('--conf', type=float, default=0.25)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--pipeline-sample', type=int, default=0, help='Run Django pipeline on N images')
    parser.add_argument('--video-frames', type=int, default=6)
    args = parser.parse_args()

    weights = args.weights.resolve()
    if not weights.is_file():
        raise SystemExit(f'Weights not found: {weights}')

    images = _collect_images(args.images, args.seed)
    videos = _collect_videos(args.videos)

    print(f'Images: {len(images)}  Videos: {len(videos)}  Weights: {weights.name}')

    image_rows = run_yolo_batch(images, weights, args.conf)
    detected = sum(1 for r in image_rows if r['detected'])
    mean_ms = round(sum(r['inference_ms'] for r in image_rows) / len(image_rows), 1) if image_rows else 0

    video_rows = run_video_yolo(videos, weights, args.conf, args.video_frames) if videos else []
    vid_detected = sum(1 for r in video_rows if r.get('sign_detected'))

    pipeline_rows: list[dict] = []
    if args.pipeline_sample > 0:
        print(f'Django pipeline sample: {args.pipeline_sample} images...')
        pipeline_rows = run_pipeline_sample(images, args.pipeline_sample)

    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    REPORTS.mkdir(parents=True, exist_ok=True)
    json_path = REPORTS / f'phase10_detection_test_{stamp}.json'
    md_path = REPORTS / 'AI-DETECTION-PHASE10-TEST-LOG.md'

    report = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'weights': str(weights),
        'conf': args.conf,
        'image_yolo': {
            'count': len(image_rows),
            'detected_count': detected,
            'detection_rate_pct': round(100 * detected / len(image_rows), 1) if image_rows else 0,
            'mean_inference_ms': mean_ms,
            'rows': image_rows,
        },
        'video_yolo': {
            'count': len(video_rows),
            'detected_count': vid_detected,
            'rows': video_rows,
        },
        'pipeline_sample': {
            'count': len(pipeline_rows),
            'ok_count': sum(1 for r in pipeline_rows if r.get('ok')),
            'mean_ms': round(
                sum(r.get('pipeline_ms', 0) for r in pipeline_rows) / len(pipeline_rows), 1,
            ) if pipeline_rows else None,
            'rows': pipeline_rows,
        } if pipeline_rows else None,
        'json_file': json_path.name,
    }
    json_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    write_markdown_summary(report, md_path)

    print(f'Detection rate (images): {report["image_yolo"]["detection_rate_pct"]}%')
    print(f'Videos with sign: {vid_detected}/{len(video_rows)}')
    print(f'JSON: {json_path}')
    print(f'Markdown: {md_path}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
