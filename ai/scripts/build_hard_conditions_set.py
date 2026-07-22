#!/usr/bin/env python
"""
Phase B4: Build a hard-conditions test folder (dark / low-contrast road frames).

Usage:
  python ai/scripts/build_hard_conditions_set.py
"""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageStat

AI_ROOT = Path(__file__).resolve().parents[1]
SRC = AI_ROOT / 'datasets' / 'external' / 'cambodia_traffic_signs_yolo' / 'images'
OUT = AI_ROOT / 'test_samples' / 'hard'
META = OUT / 'hard_conditions_meta.json'


def mean_brightness(path: Path) -> float:
    with Image.open(path) as im:
        gray = im.convert('L')
        # downsample for speed
        gray.thumbnail((320, 320))
        return float(ImageStat.Stat(gray).mean[0])


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('hard_*'):
        old.unlink()

    files = sorted(SRC.glob('*'))
    files = [p for p in files if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}]
    scored = []
    # Sample every Nth to keep runtime reasonable
    step = max(1, len(files) // 400)
    for p in files[::step]:
        try:
            b = mean_brightness(p)
            scored.append((b, p))
        except Exception:
            continue
    scored.sort(key=lambda x: x[0])
    # darkest 20 + mid-dark 10
    picks = scored[:20] + scored[20:50:3][:10]
    rows = []
    for i, (b, p) in enumerate(picks, 1):
        dest = OUT / f'hard_{i:02d}_bri{int(b)}{p.suffix.lower()}'
        shutil.copy2(p, dest)
        rows.append({'file': dest.name, 'source': p.name, 'brightness': round(b, 2)})
    meta = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'count': len(rows),
        'note': 'Low mean-luminance frames for night/shadow robustness checks',
        'samples': rows,
    }
    META.write_text(json.dumps(meta, indent=2), encoding='utf-8')
    print(json.dumps(meta, indent=2))
    print(f'Wrote {len(rows)} files → {OUT}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
