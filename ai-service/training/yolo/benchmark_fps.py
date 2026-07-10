"""Task 284 — Benchmark YOLO inference FPS and latency.

Runs N inference passes on a sample of val images and reports:
  - mean latency (ms/image)
  - p50 / p95 / p99 latency
  - effective FPS
  - device used

Usage:
    python training/yolo/benchmark_fps.py \
        --weights runs/detect/camtraffic-v2/weights/best.pt \
        --images  data/datasets/splits/training_combined/val/images \
        --n 100 --device cpu
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="CamTraffic YOLO FPS benchmark")
    p.add_argument("--weights", required=True, help="Path to YOLO .pt weights")
    p.add_argument("--images",
                   default="data/datasets/splits/training_combined/val/images",
                   help="Directory of images to benchmark on")
    p.add_argument("--n",      type=int, default=100, help="Number of inference passes")
    p.add_argument("--imgsz",  type=int, default=640)
    p.add_argument("--device", default="cpu")
    p.add_argument("--output",
                   default="runs/benchmark/fps_benchmark_report.json",
                   help="Output JSON report path")
    return p.parse_args()


def resolve(s: str) -> Path:
    p = Path(s)
    return p if p.is_absolute() else SERVICE_ROOT / p


def percentile(data: list[float], pct: float) -> float:
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * pct / 100
    f, c = int(k), min(int(k) + 1, len(sorted_data) - 1)
    return sorted_data[f] + (sorted_data[c] - sorted_data[f]) * (k - f)


def main() -> None:
    args = parse_args()
    from ultralytics import YOLO

    weights_path = resolve(args.weights)
    images_path  = resolve(args.images)
    output_path  = resolve(args.output)

    if not weights_path.exists():
        raise FileNotFoundError(f"Weights not found: {weights_path}")
    if not images_path.is_dir():
        raise FileNotFoundError(f"Images directory not found: {images_path}")

    image_files = sorted(list(images_path.glob("*.jpg")) + list(images_path.glob("*.png")))
    if not image_files:
        raise ValueError(f"No images found in {images_path}")

    print(f"Benchmarking: {weights_path.name}")
    print(f"Device: {args.device} | Images: {len(image_files)} found | Passes: {args.n}")

    model = YOLO(str(weights_path))

    # Warm up (3 passes, not counted)
    warm_img = str(image_files[0])
    for _ in range(3):
        model.predict(warm_img, device=args.device, imgsz=args.imgsz, verbose=False)

    latencies: list[float] = []
    for i in range(args.n):
        img = str(image_files[i % len(image_files)])
        t0 = time.perf_counter()
        model.predict(img, device=args.device, imgsz=args.imgsz, verbose=False)
        latencies.append((time.perf_counter() - t0) * 1000)
        if (i + 1) % 10 == 0:
            print(f"  {i + 1}/{args.n}  mean so far: {sum(latencies)/len(latencies):.1f} ms")

    mean_ms  = sum(latencies) / len(latencies)
    p50_ms   = percentile(latencies, 50)
    p95_ms   = percentile(latencies, 95)
    p99_ms   = percentile(latencies, 99)
    min_ms   = min(latencies)
    max_ms   = max(latencies)
    fps      = 1000.0 / mean_ms

    report = {
        "weights":      str(weights_path.relative_to(SERVICE_ROOT)),
        "device":       args.device,
        "imgsz":        args.imgsz,
        "n_passes":     args.n,
        "n_images":     len(image_files),
        "latency_ms": {
            "mean": round(mean_ms, 2),
            "p50":  round(p50_ms, 2),
            "p95":  round(p95_ms, 2),
            "p99":  round(p99_ms, 2),
            "min":  round(min_ms, 2),
            "max":  round(max_ms, 2),
        },
        "fps": round(fps, 2),
        "target_met": {
            "cpu_200ms": mean_ms < 200,
            "cpu_10fps": fps >= 10,
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"\n{'='*50}")
    print(f"Mean:  {mean_ms:.1f} ms/image  ({fps:.1f} FPS)")
    print(f"p50:   {p50_ms:.1f} ms")
    print(f"p95:   {p95_ms:.1f} ms")
    print(f"p99:   {p99_ms:.1f} ms")
    print(f"Target < 200 ms (CPU): {'PASS' if mean_ms < 200 else 'FAIL'}")
    print(f"Target ≥ 10 FPS:       {'PASS' if fps >= 10 else 'FAIL'}")
    print(f"Report: {output_path}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
