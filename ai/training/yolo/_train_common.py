"""Shared helpers for CamTraffic YOLO training scripts."""
from __future__ import annotations

import json
from pathlib import Path

import yaml

AI_ROOT = Path(__file__).resolve().parents[2]
TRAINING_YOLO = AI_ROOT / 'training' / 'yolo'
RUNS_ROOT = AI_ROOT / 'runs' / 'detect'
WEIGHTS_DIR = AI_ROOT / 'weights'
EVAL_ROOT = AI_ROOT / 'runs' / 'evaluation'
EXPORT_ROOT = AI_ROOT / 'models' / 'exports'


def abs_yaml(yaml_path: Path) -> Path:
    """Rewrite path: entries to absolute paths for Ultralytics."""
    data = yaml.safe_load(yaml_path.read_text(encoding='utf-8'))
    root = (yaml_path.parent / data['path']).resolve()
    data['path'] = root.as_posix()
    out = yaml_path.parent / f'.{yaml_path.name}'
    out.write_text(yaml.dump(data, sort_keys=False, allow_unicode=True), encoding='utf-8')
    return out


def load_hyperparams() -> dict:
    hp_path = TRAINING_YOLO / 'hyperparams.yaml'
    return yaml.safe_load(hp_path.read_text(encoding='utf-8'))


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding='utf-8')
