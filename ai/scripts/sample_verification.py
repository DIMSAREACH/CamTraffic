#!/usr/bin/env python
"""
Build a visual QA sample list (default 10% per class, min 1).

Usage:
  python ai/scripts/sample_verification.py --dataset ai/dataset_10 --fraction 0.1
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _common import AI_ROOT, DATASETS_ROOT, REPORTS_DIR, iter_images, load_yaml_names


def main() -> int:
    parser = argparse.ArgumentParser(description='Per-class QA sample selection')
    parser.add_argument('--dataset', type=Path, default=AI_ROOT / 'dataset_10')
    parser.add_argument('--data-yaml', type=Path, default=None)
    parser.add_argument('--fraction', type=float, default=0.10)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    dataset = args.dataset.resolve()
    yaml_path = args.data_yaml or (dataset / 'data.yaml')
    names = load_yaml_names(yaml_path) if yaml_path.is_file() else {}

    by_class: dict[str, list[str]] = defaultdict(list)
    for split, path in iter_images(dataset):
        stem = path.stem
        cls = stem
        for name in names.values():
            if stem.startswith(name):
                cls = name
                break
        by_class[cls].append(f'{split}/{path.name}')

    rng = random.Random(args.seed)
    samples: dict[str, list[str]] = {}
    for cls, files in sorted(by_class.items()):
        n = max(1, math.ceil(len(files) * args.fraction))
        picks = rng.sample(files, min(n, len(files)))
        samples[cls] = picks

    report = {
        'dataset': str(dataset),
        'fraction': args.fraction,
        'classes': len(samples),
        'total_samples': sum(len(v) for v in samples.values()),
        'samples': samples,
    }

    stamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    qa_dir = DATASETS_ROOT / 'annotations' / 'qa'
    qa_dir.mkdir(parents=True, exist_ok=True)
    out = qa_dir / f'sample_verification_{stamp}.json'
    out.write_text(json.dumps(report, indent=2), encoding='utf-8')

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    copy = REPORTS_DIR / f'sample_verification_{stamp}.json'
    copy.write_text(json.dumps(report, indent=2), encoding='utf-8')

    print(f'Dataset: {dataset}')
    print(f'Classes sampled: {report["classes"]}')
    print(f'Total QA samples: {report["total_samples"]}')
    print(f'QA list: {out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
