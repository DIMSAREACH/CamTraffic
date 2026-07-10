"""Post-training evaluation — runs after train_v2.py completes.

Generates:
  - full val metrics (mAP@50, mAP@50-95, P, R, F1)
  - per-class mAP table (JSON + Markdown)
  - FPS benchmark (100 passes on val images)
  - updated training report JSON

Usage:
    python training/yolo/post_train_eval.py
    python training/yolo/post_train_eval.py --weights runs/detect/camtraffic-v2/weights/best.pt
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Post-training evaluation for CamTraffic")
    p.add_argument("--weights",
                   default="runs/detect/camtraffic-v2/weights/best.pt",
                   help="Path to trained .pt weights")
    p.add_argument("--data",    default="training/yolo/dataset.yaml")
    p.add_argument("--imgsz",   type=int, default=640)
    p.add_argument("--batch",   type=int, default=8)
    p.add_argument("--device",  default="cpu")
    p.add_argument("--fps-n",   type=int, default=50,
                   help="Number of FPS benchmark passes")
    p.add_argument("--output",  default="runs/evaluation/post_train_eval.json")
    return p.parse_args()


def resolve(s: str) -> Path:
    p = Path(s)
    return p if p.is_absolute() else SERVICE_ROOT / p


def percentile(data: list[float], pct: float) -> float:
    sd = sorted(data)
    k  = (len(sd) - 1) * pct / 100
    f, c = int(k), min(int(k) + 1, len(sd) - 1)
    return sd[f] + (sd[c] - sd[f]) * (k - f)


def main() -> None:
    args     = parse_args()
    from ultralytics import YOLO
    import yaml

    weights = resolve(args.weights)
    data    = resolve(args.data)
    output  = resolve(args.output)

    if not weights.exists():
        raise FileNotFoundError(f"Weights not found: {weights}")

    print(f"\nEvaluating: {weights}")
    model = YOLO(str(weights))

    # ── Validation metrics ────────────────────────────────────────────────
    print("Running validation...")
    metrics = model.val(
        data=str(data),
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device if args.device != "cpu" else "cpu",
        split="val",
        verbose=True,
        plots=True,
    )

    overall = {
        "map50":    round(float(getattr(metrics.box, "map50", 0)), 4),
        "map50_95": round(float(getattr(metrics.box, "map",   0)), 4),
        "precision":round(float(getattr(metrics.box, "mp",    0)), 4),
        "recall":   round(float(getattr(metrics.box, "mr",    0)), 4),
    }

    # Per-class metrics
    class_names  = metrics.names if hasattr(metrics, "names") else {}
    per_class_ap = {}
    try:
        ap_per_class = metrics.box.ap_class_index
        ap50_vals    = metrics.box.ap50
        for idx, cls_id in enumerate(ap_per_class):
            name = class_names.get(int(cls_id), f"class_{cls_id}")
            per_class_ap[name] = round(float(ap50_vals[idx]), 4)
    except Exception:
        pass

    # ── FPS benchmark ─────────────────────────────────────────────────────
    val_images_dir = resolve("data/datasets/splits/training_combined/val/images")
    images = sorted(
        list(val_images_dir.glob("*.jpg")) + list(val_images_dir.glob("*.png"))
    )[:args.fps_n]

    fps_result: dict = {}
    if images:
        print(f"\nFPS benchmark ({args.fps_n} passes)...")
        # warm-up
        for _ in range(3):
            model.predict(str(images[0]), device=args.device, imgsz=args.imgsz, verbose=False)

        latencies = []
        for i, img in enumerate(images):
            t0 = time.perf_counter()
            model.predict(str(img), device=args.device, imgsz=args.imgsz, verbose=False)
            latencies.append((time.perf_counter() - t0) * 1000)
        mean_ms = sum(latencies) / len(latencies)
        fps_result = {
            "n_passes":  len(latencies),
            "mean_ms":   round(mean_ms, 2),
            "p50_ms":    round(percentile(latencies, 50), 2),
            "p95_ms":    round(percentile(latencies, 95), 2),
            "fps":       round(1000.0 / mean_ms, 2),
            "device":    args.device,
        }

    # ── Save report ───────────────────────────────────────────────────────
    report = {
        "weights":    str(weights.relative_to(SERVICE_ROOT)),
        "data":       args.data,
        "device":     args.device,
        "overall":    overall,
        "per_class":  per_class_ap,
        "fps":        fps_result,
        "targets": {
            "map50_ge_080":    overall["map50"] >= 0.80,
            "cpu_lt_200ms":    fps_result.get("mean_ms", 999) < 200,
            "fps_ge_10":       fps_result.get("fps", 0) >= 10,
        },
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    # ── Markdown per-class table ──────────────────────────────────────────
    md_path = output.parent / "per_class_map50_table.md"
    rows = sorted(per_class_ap.items(), key=lambda x: -x[1])
    md_lines = [
        "# Per-class mAP@50 — CamTraffic v2",
        "",
        "| Rank | Class | mAP@50 |",
        "|-----:|-------|-------:|",
    ]
    for rank, (cls, ap) in enumerate(rows, 1):
        md_lines.append(f"| {rank} | {cls} | {ap:.4f} |")
    md_lines += [
        "",
        f"**Overall mAP@50:** {overall['map50']:.4f}",
        f"**mAP@50-95:** {overall['map50_95']:.4f}",
        f"**Precision:** {overall['precision']:.4f}",
        f"**Recall:** {overall['recall']:.4f}",
    ]
    md_path.write_text("\n".join(md_lines), encoding="utf-8")

    # ── Print summary ─────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"mAP@50:     {overall['map50']:.4f}  "
          f"({'PASS ≥0.80' if overall['map50'] >= 0.80 else 'below target 0.80'})")
    print(f"mAP@50-95:  {overall['map50_95']:.4f}")
    print(f"Precision:  {overall['precision']:.4f}")
    print(f"Recall:     {overall['recall']:.4f}")
    if fps_result:
        print(f"Inference:  {fps_result['mean_ms']:.1f} ms/image  "
              f"({fps_result['fps']:.1f} FPS) on {args.device.upper()}")
    print(f"\nReport:     {output}")
    print(f"Class table:{md_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
