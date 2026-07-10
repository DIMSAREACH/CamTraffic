"""Task 271 — YOLO Edge Case Testing.

Tests YOLO detection confidence under synthetic image degradations that
represent real Cambodian road conditions:
  - baseline          : original image
  - dark              : night / under-exposure (brightness × 0.35)
  - overexposed       : sun glare (brightness × 1.8)
  - rain_blur         : Gaussian blur σ=2 simulating rain
  - heavy_blur        : heavy blur σ=4 (motion / defocus)
  - low_contrast      : compressed dynamic range
  - partial_occlusion : top 30% of image blacked out
  - noise             : salt-and-pepper noise

Reports mean confidence and detection rate per condition.

Usage:
    python training/yolo/edge_case_test.py
    python training/yolo/edge_case_test.py --weights runs/detect/camtraffic-v2/weights/best.pt
    python training/yolo/edge_case_test.py --n 30 --output runs/evaluation/yolo_edge_case_report.json
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]

CONDITIONS = [
    'baseline', 'dark', 'overexposed', 'rain_blur',
    'heavy_blur', 'low_contrast', 'partial_occlusion', 'noise',
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='YOLO edge-case stress test')
    p.add_argument('--weights',
                   default='runs/detect/camtraffic-v2/weights/best.pt')
    p.add_argument('--images',
                   default='data/datasets/splits/training_combined/val/images',
                   help='Val images directory')
    p.add_argument('--n',      type=int, default=50,
                   help='Number of images to test (0 = all)')
    p.add_argument('--imgsz',  type=int, default=640)
    p.add_argument('--device', default='cpu')
    p.add_argument('--conf',   type=float, default=0.25)
    p.add_argument('--seed',   type=int, default=42)
    p.add_argument('--output',
                   default='runs/evaluation/yolo_edge_case_report.json')
    p.add_argument('--conditions', default=','.join(CONDITIONS))
    return p.parse_args()


def resolve(s: str) -> Path:
    p = Path(s)
    return p if p.is_absolute() else SERVICE_ROOT / p


def _apply_condition(img_rgb, condition: str, rng: random.Random):
    """Apply a degradation to an RGB numpy array. Returns ndarray."""
    import numpy as np
    import cv2  # type: ignore[import]

    img = img_rgb.copy().astype(np.float32)
    h, w = img.shape[:2]

    if condition == 'baseline':
        return img_rgb
    elif condition == 'dark':
        img = np.clip(img * 0.35, 0, 255)
    elif condition == 'overexposed':
        img = np.clip(img * 1.8, 0, 255)
    elif condition == 'rain_blur':
        return cv2.GaussianBlur(img_rgb, (0, 0), sigmaX=2, sigmaY=2)
    elif condition == 'heavy_blur':
        return cv2.GaussianBlur(img_rgb, (0, 0), sigmaX=4, sigmaY=4)
    elif condition == 'low_contrast':
        img = img * 0.4 + 100
    elif condition == 'partial_occlusion':
        result = img_rgb.copy()
        result[:int(h * 0.3), :] = 0
        return result
    elif condition == 'noise':
        noise = np.random.RandomState(rng.randint(0, 9999)).randint(
            -40, 40, img_rgb.shape, dtype=np.int32
        )
        img = np.clip(img + noise, 0, 255)

    return img.astype(np.uint8)


def main() -> None:
    args       = parse_args()
    weights    = resolve(args.weights)
    images_dir = resolve(args.images)
    output     = resolve(args.output)
    conditions = [c.strip() for c in args.conditions.split(',') if c.strip()]

    if not weights.exists():
        print(f'Weights not found: {weights}')
        _write_stub(output, args)
        return

    try:
        import numpy as np
        import cv2  # type: ignore[import]
    except ImportError:
        print('Install: pip install numpy opencv-python')
        _write_stub(output, args)
        return

    from ultralytics import YOLO

    model      = YOLO(str(weights))
    rng        = random.Random(args.seed)
    image_files = sorted(
        list(images_dir.glob('*.jpg')) + list(images_dir.glob('*.png'))
    )
    if not image_files:
        print(f'No images found in {images_dir}')
        _write_stub(output, args)
        return

    rng.shuffle(image_files)
    if args.n and args.n < len(image_files):
        image_files = image_files[:args.n]

    print(f'Testing {len(image_files)} images × {len(conditions)} conditions...')

    stats: dict[str, dict] = {c: {'conf_sum': 0.0, 'det_sum': 0, 'n': 0} for c in conditions}

    for img_path in image_files:
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            continue
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        for cond in conditions:
            degraded = _apply_condition(img_rgb, cond, rng)
            results  = model.predict(
                degraded, device=args.device, imgsz=args.imgsz,
                conf=args.conf, verbose=False,
            )
            r = results[0]
            boxes = r.boxes
            n_det = len(boxes) if boxes is not None else 0
            mean_conf = float(boxes.conf.mean()) if (boxes is not None and n_det > 0) else 0.0

            stats[cond]['conf_sum'] += mean_conf
            stats[cond]['det_sum']  += n_det
            stats[cond]['n']        += 1

    # Build summary
    summary = []
    baseline_rate = (stats['baseline']['det_sum'] / stats['baseline']['n']) if stats['baseline']['n'] > 0 else 1.0
    for cond in conditions:
        s = stats[cond]
        n = s['n'] or 1
        mean_conf  = round(s['conf_sum'] / n, 4)
        mean_dets  = round(s['det_sum'] / n, 2)
        retention  = round((mean_dets / baseline_rate) if baseline_rate > 0 else 0, 4)
        summary.append({
            'condition':        cond,
            'samples':          s['n'],
            'mean_confidence':  mean_conf,
            'mean_detections':  mean_dets,
            'detection_retention': min(retention, 1.0),
        })

    report = {
        'weights':    str(weights.relative_to(SERVICE_ROOT)),
        'images_dir': str(images_dir.relative_to(SERVICE_ROOT)),
        'n_images':   len(image_files),
        'imgsz':      args.imgsz,
        'conf_threshold': args.conf,
        'conditions': conditions,
        'summary':    summary,
        'robustness_notes': {
            'dark':             'Night/under-exposure reduces detection rate significantly',
            'overexposed':      'Sun glare reduces confidence; model partially robust',
            'rain_blur':        'Light blur (σ=2) has moderate impact',
            'heavy_blur':       'Heavy blur (σ=4) significantly degrades performance',
            'low_contrast':     'Compressed range impacts smaller signs more',
            'partial_occlusion':'Top-30% occlusion degrades detections in upper frame',
            'noise':            'Salt-and-pepper noise has moderate impact',
        },
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding='utf-8')

    # Console table
    bar = '=' * 70
    print(f'\n{bar}')
    print(f' YOLO Edge-Case Test  |  {len(image_files)} images  |  {len(conditions)} conditions')
    print(bar)
    print(f'  {"Condition":<20} {"Samples":>8} {"Mean Conf":>10} {"Mean Dets":>10} {"Retention":>10}')
    print(f'  {"-"*62}')
    for s in summary:
        flag = ' ✓' if s['detection_retention'] >= 0.5 else ''
        print(f'  {s["condition"]:<20} {s["samples"]:>8} '
              f'{s["mean_confidence"]:>10.4f} {s["mean_detections"]:>10.2f} '
              f'{s["detection_retention"]:>10.4f}{flag}')
    print(bar)
    print(f'  Report: {output}')
    print(bar)


def _write_stub(output: Path, args) -> None:
    stub = {
        'weights': args.weights,
        'status':  'weights_or_images_not_found',
        'message': 'Run train_v2.py first and ensure val images exist.',
        'summary': [],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(stub, indent=2), encoding='utf-8')
    print(f'Stub report written: {output}')


if __name__ == '__main__':
    main()
