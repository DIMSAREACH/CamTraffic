"""CamTraffic — v2 training entry-point.

Improvements over v1 (5-epoch bootstrap):
  - Cosine LR schedule
  - Cambodia-tuned augmentation (hyperparams.yaml)
  - Configurable epoch count (default 50 for CPU, 100 for GPU)
  - Automatic resume detection
  - Post-training evaluation + JSON report

Usage (CPU, 50 epochs):
    python training/yolo/train_v2.py

Usage (GPU, 100 epochs):
    python training/yolo/train_v2.py --epochs 100 --device 0

Resume interrupted run:
    python training/yolo/train_v2.py --resume
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="CamTraffic YOLOv11 v2 training")
    p.add_argument("--data",     default="training/yolo/dataset.yaml")
    p.add_argument("--model",    default="yolo11n.pt",
                   help="Pretrained weights. Use 'runs/detect/runs/yolo/camtraffic-v1/weights/best.pt' to start from v1 checkpoint.")
    p.add_argument("--epochs",   type=int,   default=50)
    p.add_argument("--imgsz",    type=int,   default=640)
    p.add_argument("--batch",    type=int,   default=8,
                   help="Batch size. Use 16+ on GPU.")
    p.add_argument("--device",   default="cpu",
                   help="'cpu' or CUDA index e.g. '0'")
    p.add_argument("--workers",  type=int,   default=2)
    p.add_argument("--patience", type=int,   default=20,
                   help="Early-stopping patience epochs.")
    p.add_argument("--name",     default="camtraffic-v2")
    p.add_argument("--resume",   action="store_true",
                   help="Resume from last checkpoint of --name run.")
    p.add_argument("--hyp",      default="training/yolo/hyperparams.yaml",
                   help="Hyperparameter YAML override.")
    p.add_argument("--seed",     type=int,   default=42)
    return p.parse_args()


def resolve(path: str) -> Path:
    p = Path(path)
    return p if p.is_absolute() else SERVICE_ROOT / p


def main() -> None:
    args = parse_args()

    from ultralytics import YOLO
    import yaml

    data_path = resolve(args.data)
    hyp_path  = resolve(args.hyp)

    if not data_path.exists():
        raise FileNotFoundError(f"Dataset config not found: {data_path}")

    # Load hyperparams
    hyp: dict = {}
    if hyp_path.exists():
        with hyp_path.open(encoding="utf-8") as fh:
            hyp = yaml.safe_load(fh) or {}
        print(f"Loaded hyperparams from {hyp_path}")

    # Decide starting weights
    model_path = args.model
    v1_best = SERVICE_ROOT / "runs/detect/runs/yolo/camtraffic-v1/weights/best.pt"
    if args.model == "yolo11n.pt" and v1_best.exists():
        model_path = str(v1_best)
        print(f"Starting from v1 checkpoint: {model_path}")
    else:
        print(f"Starting from: {model_path}")

    model = YOLO(model_path)

    t0 = time.time()
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device if args.device != "cpu" else "cpu",
        workers=args.workers,
        patience=args.patience,
        project=str(SERVICE_ROOT / "runs/detect"),
        name=args.name,
        seed=args.seed,
        resume=args.resume,
        exist_ok=args.resume,
        # Hyperparams from YAML
        lr0=hyp.get("lr0", 0.01),
        lrf=hyp.get("lrf", 0.005),
        momentum=hyp.get("momentum", 0.937),
        weight_decay=hyp.get("weight_decay", 0.0005),
        warmup_epochs=hyp.get("warmup_epochs", 5.0),
        warmup_momentum=hyp.get("warmup_momentum", 0.8),
        warmup_bias_lr=hyp.get("warmup_bias_lr", 0.1),
        cos_lr=hyp.get("cos_lr", True),
        box=hyp.get("box", 7.5),
        cls=hyp.get("cls", 0.5),
        dfl=hyp.get("dfl", 1.5),
        hsv_h=hyp.get("hsv_h", 0.02),
        hsv_s=hyp.get("hsv_s", 0.8),
        hsv_v=hyp.get("hsv_v", 0.5),
        degrees=hyp.get("degrees", 5.0),
        translate=hyp.get("translate", 0.1),
        scale=hyp.get("scale", 0.6),
        shear=hyp.get("shear", 2.0),
        perspective=hyp.get("perspective", 0.0002),
        flipud=hyp.get("flipud", 0.0),
        fliplr=hyp.get("fliplr", 0.3),
        mosaic=hyp.get("mosaic", 1.0),
        mixup=hyp.get("mixup", 0.05),
        copy_paste=hyp.get("copy_paste", 0.1),
        auto_augment=hyp.get("auto_augment", "randaugment"),
        erasing=hyp.get("erasing", 0.3),
        close_mosaic=int(hyp.get("close_mosaic", 15)),
        amp=hyp.get("amp", True),
        plots=True,
        verbose=True,
    )

    elapsed = time.time() - t0
    run_dir = SERVICE_ROOT / "runs/detect" / args.name
    best_pt = run_dir / "weights/best.pt"

    # Extract metrics
    metrics: dict = {}
    try:
        mp  = float(getattr(results.box, "mp",    0.0))
        mr  = float(getattr(results.box, "mr",    0.0))
        m50 = float(getattr(results.box, "map50", 0.0))
        m5095 = float(getattr(results.box, "map", 0.0))
        metrics = {"precision": mp, "recall": mr, "map50": m50, "map50_95": m5095}
    except Exception:
        pass

    report = {
        "run_name":     args.name,
        "epochs":       args.epochs,
        "device":       args.device,
        "model":        model_path,
        "dataset":      args.data,
        "hyp":          str(hyp_path),
        "elapsed_sec":  round(elapsed, 1),
        "weights":      str(best_pt.relative_to(SERVICE_ROOT)) if best_pt.exists() else "n/a",
        "final_metrics": metrics,
        "notes": (
            f"v2 training with cosine LR + Cambodia-tuned augmentation. "
            f"{'GPU' if args.device != 'cpu' else 'CPU'} run, {args.epochs} epochs."
        ),
    }

    out_path = SERVICE_ROOT / "runs/yolo" / f"{args.name}_training_report.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\n{'='*60}")
    print(f"Training complete in {elapsed/60:.1f} min")
    print(f"Best weights: {best_pt}")
    print(f"Report: {out_path}")
    if metrics:
        print(f"mAP@50: {metrics.get('map50', 0):.4f}  "
              f"mAP@50-95: {metrics.get('map50_95', 0):.4f}  "
              f"P: {metrics.get('precision', 0):.4f}  "
              f"R: {metrics.get('recall', 0):.4f}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
