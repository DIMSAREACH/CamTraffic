"""Task 261 — OCR Fine-Tune Launcher.

Wrapper around training/ocr/train.py that:
  1. Checks prerequisites (verified manifest, train.py exists)
  2. Prints the exact command to run for fine-tuning
  3. If run directly, launches the fine-tune process

Prerequisites:
  - `data/datasets/annotations/ocr_manifest_verified.csv` (from verify_transcriptions.py)
  - EasyOCR installed + CUDA GPU recommended (CPU fine-tuning is very slow)
  - Minimum 50+ verified plate transcriptions

Fine-tuning command:
    python training/ocr/train.py \
        --manifest data/datasets/annotations/ocr_manifest_verified.csv \
        --epochs 30 \
        --batch-size 16 \
        --lr 1e-4 \
        --output runs/ocr/finetune/

Expected results after fine-tuning:
  - CER: 0.663 → target ≤ 0.30 (from baseline 0.663)
  - Exact Match Rate: 0.139 → target ≥ 0.50

Usage:
    python training/ocr/ocr_finetune_launcher.py            # check + print command
    python training/ocr/ocr_finetune_launcher.py --run      # actually run fine-tuning
    python training/ocr/ocr_finetune_launcher.py --dry-run  # dry run only
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]

BASELINE = {'mean_cer': 0.6632, 'exact_match_rate': 0.1386}
TARGETS  = {'mean_cer': 0.30,   'exact_match_rate': 0.50}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='OCR Fine-Tune Launcher (Task 261)')
    p.add_argument('--manifest',
                   default='data/datasets/annotations/ocr_manifest_verified.csv',
                   help='Verified manifest CSV (from verify_transcriptions.py)')
    p.add_argument('--epochs',     type=int, default=30)
    p.add_argument('--batch-size', type=int, default=16, dest='batch_size')
    p.add_argument('--lr',         type=float, default=1e-4)
    p.add_argument('--output',     default='runs/ocr/finetune/')
    p.add_argument('--run',        action='store_true',
                   help='Actually execute the fine-tuning (not just print command)')
    p.add_argument('--dry-run',    action='store_true', dest='dry_run',
                   help='Print command and exit without running')
    return p.parse_args()


def resolve(s: str) -> Path:
    p = Path(s)
    return p if p.is_absolute() else SERVICE_ROOT / p


def _check_verified_manifest(path: Path) -> tuple[bool, int]:
    if not path.exists():
        return False, 0
    try:
        import csv
        with path.open(newline='', encoding='utf-8') as fh:
            rows = list(csv.DictReader(fh))
        verified = sum(
            1 for r in rows
            if r.get('verified') in ('ok', 'corrected')
            and (r.get('transcription') or '').strip()
        )
        return True, verified
    except Exception:
        return False, 0


def main() -> None:
    args          = parse_args()
    manifest_path = resolve(args.manifest)
    train_script  = SERVICE_ROOT / 'training/ocr/train.py'
    output_dir    = resolve(args.output)

    bar = '=' * 60

    print(f'\n{bar}')
    print(f' OCR Fine-Tune Launcher — Task 261')
    print(bar)

    # Check prerequisites
    manifest_ok, n_verified = _check_verified_manifest(manifest_path)
    print(f'\n  Verified manifest: {"✓ found" if manifest_ok else "✗ not found"}')
    print(f'  Verified samples:  {n_verified}')
    print(f'  Train script:      {"✓ found" if train_script.exists() else "✗ not found"}')
    print(f'\n  Baseline CER:         {BASELINE["mean_cer"]:.4f}')
    print(f'  Baseline Exact Match: {BASELINE["exact_match_rate"]:.4f}')
    print(f'  Target  CER:         ≤ {TARGETS["mean_cer"]:.2f}')
    print(f'  Target  Exact Match: ≥ {TARGETS["exact_match_rate"]:.2f}')

    if not manifest_ok:
        print(f'\n  ⚠  Run verify_transcriptions.py first to create the verified manifest.')
        print(f'     python training/ocr/verify_transcriptions.py')
    if n_verified < 50:
        print(f'\n  ⚠  Only {n_verified} verified samples — recommend ≥ 50 for meaningful fine-tuning.')

    # Build command
    cmd = [
        sys.executable, str(train_script),
        '--manifest', str(manifest_path),
        '--epochs',   str(args.epochs),
        '--batch',    str(args.batch_size),
        '--lr',       str(args.lr),
        '--output',   str(output_dir),
    ]
    cmd_str = ' '.join(cmd)

    print(f'\n  Fine-tune command:')
    print(f'  {cmd_str}')

    if args.dry_run or not args.run:
        print(f'\n  Tip: Add --run to actually execute the fine-tuning.')
        print(f'{bar}')
        return

    if not manifest_ok:
        print(f'\n  ERROR: Manifest not found. Cannot proceed.')
        sys.exit(1)

    print(f'\n  Starting fine-tuning...')
    print(bar)

    try:
        result = subprocess.run(cmd, cwd=str(SERVICE_ROOT), check=True)
        exit_code = result.returncode
    except subprocess.CalledProcessError as exc:
        exit_code = exc.returncode

    print(f'\n  Exit code: {exit_code}')
    if exit_code == 0:
        print(f'  ✓ Fine-tuning complete. Evaluate with:')
        print(f'    python training/ocr/re_evaluate.py --baseline runs/ocr/evaluation/report_val.json')
    print(bar)


if __name__ == '__main__':
    main()
