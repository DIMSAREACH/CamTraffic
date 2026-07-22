"""OCR training operations for admin UI."""

from __future__ import annotations

import csv
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings


def _repo_root() -> Path:
    return Path(settings.BASE_DIR).parent


def _ai_root() -> Path:
    return _repo_root() / 'ai'


def _eval_path(name: str) -> Path:
    return _ai_root() / 'runs' / 'evaluation' / name


def _manifest_path() -> Path:
    return _ai_root() / 'datasets' / 'annotations' / 'ocr' / 'ocr_manifest.csv'


def _read_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, OSError):
        return None


def get_ocr_manifest_stats() -> dict:
    path = _manifest_path()
    if not path.is_file():
        return {'exists': False, 'samples': 0, 'crops_dir': 'ai/datasets/annotations/ocr/crops/'}
    rows = list(csv.DictReader(path.open(encoding='utf-8')))
    crop_dir = _ai_root() / 'datasets' / 'annotations' / 'ocr' / 'crops'
    crop_count = len(list(crop_dir.glob('*'))) if crop_dir.is_dir() else 0
    preview = []
    for row in rows[:8]:
        preview.append({
            'crop_path': row.get('crop_path', ''),
            'transcription': row.get('transcription', ''),
        })
    return {
        'exists': True,
        'manifest_path': str(path.relative_to(_repo_root())).replace('\\', '/'),
        'samples': len(rows),
        'crop_files': crop_count,
        'preview': preview,
    }


def get_ocr_training_status() -> dict:
    baseline = _read_json(_eval_path('ocr_baseline.json'))
    improved = _read_json(_eval_path('ocr_report_val_improved.json'))
    manifest = get_ocr_manifest_stats()
    return {
        'manifest': manifest,
        'baseline': baseline,
        'improved': improved,
        'guide_path': 'docs/training/OCR-FINETUNING-GUIDE.md',
        'scripts': {
            'baseline': 'ai/training/ocr/ocr_baseline.py',
            'launcher': 'ai/training/ocr/ocr_finetune_launcher.py',
            'verify': 'ai/training/ocr/verify_transcriptions.py',
            'compare': 'ai/training/ocr/compare_engines.py',
            'edge_cases': 'ai/training/ocr/plate_edge_cases.py',
        },
    }


def _run_script(rel_path: str, args: list[str] | None = None, timeout: int = 300) -> dict:
    script = _repo_root() / rel_path.replace('/', '\\') if '\\' in rel_path else _repo_root() / rel_path
    if not script.is_file():
        return {'ok': False, 'error': f'Script not found: {rel_path}'}
    cmd = [sys.executable, str(script), *(args or [])]
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(_repo_root()),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            'ok': proc.returncode == 0,
            'exit_code': proc.returncode,
            'output': ((proc.stdout or '') + (proc.stderr or '')).strip()[-6000:],
            'ran_at': datetime.now(timezone.utc).isoformat(),
        }
    except subprocess.TimeoutExpired:
        return {'ok': False, 'error': f'Timed out after {timeout}s'}
    except OSError as exc:
        return {'ok': False, 'error': str(exc)}


def run_ocr_prereq_check() -> dict:
    result = _run_script('ai/training/ocr/ocr_finetune_launcher.py', timeout=60)
    result['status'] = get_ocr_training_status()
    return result


def run_ocr_baseline(limit: int = 50) -> dict:
    result = _run_script(
        'ai/training/ocr/ocr_baseline.py',
        args=['--limit', str(max(1, min(limit, 200)))],
        timeout=600,
    )
    result['report'] = _read_json(_eval_path('ocr_baseline.json'))
    result['status'] = get_ocr_training_status()
    return result


def run_ocr_edge_cases() -> dict:
    result = _run_script('ai/training/ocr/plate_edge_cases.py', timeout=300)
    result['status'] = get_ocr_training_status()
    return result
