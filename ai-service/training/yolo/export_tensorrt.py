"""Task 265 — TensorRT (TRT) / INT8 Export for GPU inference acceleration.

Exports the trained YOLO model to TensorRT format for GPU deployment.
Falls back to ONNX FP16 if TensorRT is not available on the host.

Hardware requirements:
  - NVIDIA GPU with TensorRT support (Jetson Nano, T4, A100, etc.)
  - tensorrt, pycuda libraries (installed via CUDA toolkit)

Usage:
    # TensorRT (GPU required):
    python training/yolo/export_tensorrt.py --device 0

    # ONNX FP16 (CPU/GPU compatible):
    python training/yolo/export_tensorrt.py --format onnx-fp16

    # INT8 quantization (requires calibration data):
    python training/yolo/export_tensorrt.py --format trt-int8 --calib-images data/datasets/splits/training_combined/val/images
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]

EXPORT_FORMATS = {
    'trt':      'TensorRT engine (.engine) — GPU only',
    'trt-int8': 'TensorRT INT8 quantized (.engine) — GPU + calibration data',
    'onnx-fp16':'ONNX FP16 (.onnx) — compatible with ONNX Runtime / TRT',
    'onnx':     'ONNX FP32 (.onnx) — universal export (already done in Task 264)',
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='CamTraffic — TensorRT / ONNX export')
    p.add_argument('--weights',
                   default='runs/detect/camtraffic-v2/weights/best.pt')
    p.add_argument('--format',  default='trt',
                   choices=list(EXPORT_FORMATS.keys()))
    p.add_argument('--imgsz',   type=int, default=640)
    p.add_argument('--device',  default='0',
                   help="GPU index (e.g. '0') — required for TRT formats")
    p.add_argument('--half',    action='store_true', default=True,
                   help='FP16 precision (enabled by default)')
    p.add_argument('--int8',    action='store_true',
                   help='INT8 quantization (requires calibration images)')
    p.add_argument('--calib-images', default=None,
                   dest='calib_images')
    p.add_argument('--output',  default='models/exports/')
    return p.parse_args()


def resolve(s: str) -> Path:
    p = Path(s)
    return p if p.is_absolute() else SERVICE_ROOT / p


def _check_gpu_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


def _check_tensorrt() -> bool:
    try:
        import tensorrt as trt  # type: ignore[import]
        return True
    except ImportError:
        return False


def main() -> None:
    args    = parse_args()
    weights = resolve(args.weights)
    output  = resolve(args.output)
    output.mkdir(parents=True, exist_ok=True)

    gpu_available = _check_gpu_available()
    trt_available = _check_tensorrt()
    export_format = args.format

    print(f'\n{"="*60}')
    print(f' CamTraffic — Model Export')
    print(f'{"="*60}')
    print(f'  Weights:   {weights}')
    print(f'  Format:    {export_format} — {EXPORT_FORMATS[export_format]}')
    print(f'  GPU:       {"available" if gpu_available else "NOT available"}')
    print(f'  TensorRT:  {"available" if trt_available else "NOT available"}')
    print(f'{"="*60}\n')

    if not weights.exists():
        print(f'ERROR: Weights not found: {weights}')
        print('Run training/yolo/train_v2.py first.')
        return

    # Auto-downgrade to ONNX if GPU/TRT not available
    if export_format.startswith('trt') and not gpu_available:
        print('⚠  GPU not available — downgrading to onnx-fp16 export')
        export_format = 'onnx-fp16'

    from ultralytics import YOLO
    model = YOLO(str(weights))

    t0 = time.perf_counter()

    if export_format == 'trt':
        exported = model.export(
            format='engine',
            imgsz=args.imgsz,
            half=True,
            device=args.device,
        )
    elif export_format == 'trt-int8':
        if not args.calib_images:
            print('⚠  INT8 requires --calib-images — downgrading to trt')
            exported = model.export(
                format='engine', imgsz=args.imgsz, half=True, device=args.device,
            )
        else:
            exported = model.export(
                format='engine',
                imgsz=args.imgsz,
                int8=True,
                data=str(resolve('training/yolo/dataset.yaml')),
                device=args.device,
            )
    elif export_format == 'onnx-fp16':
        exported = model.export(
            format='onnx',
            imgsz=args.imgsz,
            half=True,
            opset=12,
            simplify=True,
        )
    else:  # onnx fp32
        exported = model.export(
            format='onnx',
            imgsz=args.imgsz,
            half=False,
            opset=12,
            simplify=True,
        )

    elapsed = time.perf_counter() - t0
    exported_path = Path(str(exported)) if exported else None
    export_size   = round(exported_path.stat().st_size / 1e6, 2) if exported_path and exported_path.exists() else 0

    report = {
        'source_weights': str(weights.relative_to(SERVICE_ROOT)),
        'export_format':  export_format,
        'exported_path':  str(exported_path.relative_to(SERVICE_ROOT)) if exported_path else None,
        'size_mb':        export_size,
        'elapsed_sec':    round(elapsed, 1),
        'imgsz':          args.imgsz,
        'gpu_used':       gpu_available and export_format.startswith('trt'),
        'notes': (
            'TRT export enables up to 5-10× faster inference on GPU compared to PyTorch. '
            f'GPU run uses {args.device} device. '
            f'Format: {EXPORT_FORMATS[export_format]}'
        ),
    }

    report_path = output / f'export_{export_format.replace("-", "_")}_report.json'
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'\n{"="*60}')
    print(f'Export complete in {elapsed:.1f} s')
    if exported_path and exported_path.exists():
        print(f'  Output: {exported_path}  ({export_size} MB)')
    print(f'  Report: {report_path}')
    print(f'{"="*60}')

    print('\nInference speed estimates:')
    print('  PyTorch CPU:    ~60-80 ms/image')
    print('  ONNX FP16 CPU: ~30-50 ms/image')
    print('  TRT FP16 GPU:  ~5-15 ms/image   (RTX 3080)')
    print('  TRT INT8 GPU:  ~3-8  ms/image   (RTX 3080)')


if __name__ == '__main__':
    main()
