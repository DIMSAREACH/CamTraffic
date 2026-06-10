#!/usr/bin/env python
"""Remove prior YOLO dataset/weights so you can train from scratch."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI = ROOT / 'ai'
BACKEND_ENV = ROOT / 'backend' / '.env'

REMOVE_DIRS = [
    AI / 'dataset',
    AI / 'weights',
    AI / 'runs',
    ROOT / 'runs',
]

def reset_env_for_mock() -> None:
    if not BACKEND_ENV.is_file():
        return
    text = BACKEND_ENV.read_text(encoding='utf-8')
    lines = []
    seen_mock = seen_path = False
    for line in text.splitlines():
        if line.startswith('AI_USE_MOCK='):
            lines.append('AI_USE_MOCK=True')
            seen_mock = True
            continue
        if line.startswith('AI_MODEL_PATH='):
            lines.append('AI_MODEL_PATH=../ai/weights/best.pt')
            seen_path = True
            continue
        lines.append(line)
    if not seen_mock:
        lines.append('AI_USE_MOCK=True')
    if not seen_path:
        lines.append('AI_MODEL_PATH=../ai/weights/best.pt')
    BACKEND_ENV.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def recreate_empty_dirs() -> None:
    for sub in (
        'dataset/images/train',
        'dataset/images/val',
        'dataset/labels/train',
        'dataset/labels/val',
        'weights',
    ):
        p = AI / sub
        p.mkdir(parents=True, exist_ok=True)
        keep = p / '.gitkeep'
        if not keep.exists():
            keep.touch()


def main() -> None:
    removed = []
    for d in REMOVE_DIRS:
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)
            removed.append(str(d.relative_to(ROOT)))

    for pt in AI.rglob('*.pt'):
        pt.unlink(missing_ok=True)
        removed.append(str(pt.relative_to(ROOT)))

    recreate_empty_dirs()
    reset_env_for_mock()

    print('Cleaned AI training artifacts:')
    if removed:
        for r in sorted(set(removed)):
            print(f'  - {r}')
    else:
        print('  (no large artifacts found; dataset/weights reset to empty)')
    print('\nNext:')
    print('  cd ai')
    print('  ..\\backend\\venv\\Scripts\\python.exe build_dataset.py --augments 8')
    print('  ..\\backend\\venv\\Scripts\\python.exe train.py --epochs 30 --batch 8 --device cpu')


if __name__ == '__main__':
    main()
