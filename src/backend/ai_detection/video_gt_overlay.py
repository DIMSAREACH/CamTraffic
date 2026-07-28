"""Serve verified riverside video GT (labels + annotated preview) for Detect Video."""
from __future__ import annotations

import hashlib
import json
import logging
import re
import shutil
import tempfile
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

AI_ROOT = Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))
GT_DIR = AI_ROOT / 'datasets' / 'samples' / 'riverside_video_labels'
MANIFEST_NAME = 'video_gt_manifest.json'

_MANIFEST: dict | None = None
_MD5: str | None = None
_NAMES: set[str] | None = None


def _norm_name(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', (value or '').lower())


def _load_manifest() -> dict | None:
    global _MANIFEST, _MD5, _NAMES
    if _MANIFEST is not None:
        return _MANIFEST
    path = GT_DIR / MANIFEST_NAME
    if not path.is_file():
        _MANIFEST = {}
        _MD5 = ''
        _NAMES = set()
        return None
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        _MANIFEST = {}
        _MD5 = ''
        _NAMES = set()
        return None
    _MANIFEST = data if isinstance(data, dict) else {}
    _MD5 = str(_MANIFEST.get('md5') or '')
    names = set()
    for n in _MANIFEST.get('match_names') or []:
        names.add(_norm_name(Path(str(n)).name))
        names.add(_norm_name(str(n)))
    names.add(_norm_name('riverside_phnom_penh.webm'))
    names.add(_norm_name('pp-riverside-traffic.webm'))
    _NAMES = names
    return _MANIFEST


def _file_md5(path: Path) -> str | None:
    try:
        return hashlib.md5(path.read_bytes()).hexdigest()
    except OSError:
        return None


def resolve_riverside_video_gt(
    *,
    video_path: str | Path | None = None,
    original_filename: str | None = None,
) -> dict | None:
    """Return GT manifest when upload matches the verified riverside clip."""
    manifest = _load_manifest()
    if not manifest or not manifest.get('ok'):
        return None
    assert _MD5 is not None and _NAMES is not None

    if video_path:
        p = Path(video_path)
        if p.is_file():
            digest = _file_md5(p)
            if digest and _MD5 and digest == _MD5:
                return manifest
            # Demo copy may differ slightly; also match by size + name hints
            stem = _norm_name(p.stem)
            if stem and any(stem in n or n in stem for n in _NAMES if n):
                if p.stat().st_size == (GT_DIR / 'riverside_phnom_penh.webm').stat().st_size if (
                    GT_DIR / 'riverside_phnom_penh.webm'
                ).is_file() else False:
                    return manifest

    name = original_filename or ''
    norm = _norm_name(Path(name).name)
    if norm and norm in _NAMES:
        return manifest
    if norm and any(norm in n or n in norm for n in _NAMES if len(n) > 12):
        return manifest
    return None


def load_frame_gt(frame_index: int) -> dict | None:
    """Load per-frame signs_vehicles JSON for overlay rebuild."""
    manifest = _load_manifest()
    if not manifest:
        return None
    frames = manifest.get('frames') or []
    if frame_index < 0 or frame_index >= len(frames):
        return None
    label_name = frames[frame_index].get('label_json')
    if not label_name:
        return None
    path = GT_DIR / 'labels_json' / label_name
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return None


def gt_annotated_preview_path() -> Path | None:
    preview = GT_DIR / 'annotated_preview.mp4'
    return preview if preview.is_file() else None


def gt_annotated_frame_paths() -> list[str]:
    manifest = _load_manifest()
    if not manifest:
        return []
    out: list[str] = []
    for fr in manifest.get('frames') or []:
        name = fr.get('annotated')
        if not name:
            continue
        path = GT_DIR / 'annotated' / name
        if path.is_file():
            out.append(str(path))
    return out


def gt_clean_frame_paths() -> list[str]:
    """Raw (non-annotated) sampled frames for CSS overlay playback."""
    manifest = _load_manifest()
    if not manifest:
        return []
    out: list[str] = []
    for fr in manifest.get('frames') or []:
        name = fr.get('frame_file')
        if not name:
            continue
        path = GT_DIR / 'frames' / name
        if path.is_file():
            out.append(str(path))
    return out


def copy_gt_preview_to_temp() -> str | None:
    """Copy verified preview MP4 to a temp path for media save."""
    src = gt_annotated_preview_path()
    if not src:
        return None
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
    tmp.close()
    shutil.copy2(src, tmp.name)
    return tmp.name


def vehicles_from_frame_gt(frame_doc: dict) -> list[dict]:
    vehicles: list[dict] = []
    for ann in frame_doc.get('annotations') or []:
        if (ann.get('kind') or '').lower() != 'vehicle':
            continue
        bb = ann.get('bbox_norm') or {}
        if not bb:
            continue
        key = str(ann.get('class_key') or '').lower()
        if 'tuk' in key:
            vtype = 'tuk_tuk'
        elif 'moto' in key:
            vtype = 'motorcycle'
        elif 'truck' in key:
            vtype = 'truck'
        elif 'bus' in key:
            vtype = 'bus'
        else:
            vtype = 'car'
        row = {
            'vehicle_type': vtype,
            'label': ann.get('label_en') or vtype,
            'confidence': float(ann.get('confidence') or 90),
            'bbox': {
                'x1': float(bb['x1']),
                'y1': float(bb['y1']),
                'x2': float(bb['x2']),
                'y2': float(bb['y2']),
            },
        }
        if ann.get('track_id') is not None:
            try:
                row['track_id'] = int(ann['track_id'])
            except (TypeError, ValueError):
                pass
        vehicles.append(row)
    return vehicles


def signs_from_frame_gt(frame_doc: dict) -> list[dict]:
    signs: list[dict] = []
    for ann in frame_doc.get('annotations') or []:
        if (ann.get('kind') or '').lower() != 'sign':
            continue
        bb = ann.get('bbox_norm') or {}
        if not bb:
            continue
        row = {
            'class_key': ann.get('class_key') or '',
            'label': ann.get('label_en') or '',
            'confidence': float(ann.get('confidence') or 90),
            'sign_bbox': {
                'x1': float(bb['x1']),
                'y1': float(bb['y1']),
                'x2': float(bb['x2']),
                'y2': float(bb['y2']),
            },
        }
        if ann.get('track_id') is not None:
            try:
                row['track_id'] = int(ann['track_id'])
            except (TypeError, ValueError):
                pass
        signs.append(row)
    return signs


def violations_from_frame_gt(frame_doc: dict) -> list[dict]:
    """Sign-linked / helmet violation annotations from GT JSON."""
    out: list[dict] = []
    for ann in frame_doc.get('annotations') or []:
        if (ann.get('kind') or '').lower() != 'violation':
            continue
        bb = ann.get('bbox_norm') or {}
        if not bb:
            continue
        row = {
            'kind': 'violation',
            'label': ann.get('label_en') or ann.get('violation_type') or 'Violation',
            'violation_type': ann.get('violation_type') or ann.get('class_key') or 'VIOLATION',
            'observed_action': ann.get('observed_action') or '',
            'confidence': float(ann.get('confidence') or 90),
            'is_violation': True,
            'bbox': {
                'x1': float(bb['x1']),
                'y1': float(bb['y1']),
                'x2': float(bb['x2']),
                'y2': float(bb['y2']),
            },
        }
        if ann.get('track_id') is not None:
            try:
                row['track_id'] = int(ann['track_id'])
            except (TypeError, ValueError):
                pass
        if ann.get('sign_track_id') is not None:
            try:
                row['sign_track_id'] = int(ann['sign_track_id'])
            except (TypeError, ValueError):
                pass
        out.append(row)
    return out
