"""Shared helpers for CamTraffic dataset collection scripts."""
from __future__ import annotations

import csv
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AI_ROOT = ROOT / 'ai'
DATASETS_ROOT = AI_ROOT / 'datasets'
MANIFESTS_DIR = DATASETS_ROOT / 'manifests'
REPORTS_DIR = ROOT / 'docs' / 'reports'

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.avif'}
DEFAULT_BLUR_THRESHOLD = 80.0


def sha256_file(path: Path, chunk_size: int = 65536) -> str:
    h = hashlib.sha256()
    with path.open('rb') as fh:
        while True:
            chunk = fh.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def load_yaml_names(yaml_path: Path) -> dict[int, str]:
    names: dict[int, str] = {}
    if not yaml_path.is_file():
        raise FileNotFoundError(f'Missing {yaml_path}')
    in_names = False
    for line in yaml_path.read_text(encoding='utf-8').splitlines():
        if line.strip().startswith('names:'):
            in_names = True
            continue
        if not in_names:
            m = re.match(r'\s*(\d+):\s*(\S+)', line)
            if m:
                names[int(m.group(1))] = m.group(2)
            continue
        if not line.startswith('  '):
            break
        m = re.match(r'\s*(\d+):\s*(.+)', line)
        if m:
            names[int(m.group(1))] = m.group(2).strip()
    return names


def iter_images(root: Path) -> list[tuple[str, Path]]:
    """Return (split, path) for images under images/train|val or flat dirs."""
    out: list[tuple[str, Path]] = []
    images_root = root / 'images'
    if images_root.is_dir():
        for split in ('train', 'val', 'valid', 'test', 'all'):
            split_dir = images_root / split
            if not split_dir.is_dir():
                continue
            for path in sorted(split_dir.rglob('*')):
                if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
                    out.append((split, path))
        if out:
            return out
    for path in sorted(root.rglob('*')):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
            rel = path.relative_to(root)
            split = rel.parts[0] if len(rel.parts) > 1 else 'all'
            out.append((split, path))
    return out


def label_path_for(image_path: Path) -> Path | None:
    parts = list(image_path.parts)
    if 'images' in parts:
        idx = parts.index('images')
        parts[idx] = 'labels'
        candidate = Path(*parts).with_suffix('.txt')
        return candidate if candidate.is_file() else None
    sibling = image_path.with_suffix('.txt')
    if sibling.is_file():
        return sibling
    labels_dir = image_path.parent.parent / 'labels' / image_path.parent.name
    candidate = labels_dir / f'{image_path.stem}.txt'
    return candidate if candidate.is_file() else None


def write_csv(path: Path, headers: list[str], rows: list[list[object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as fh:
        writer = csv.writer(fh)
        writer.writerow(headers)
        writer.writerows(rows)
