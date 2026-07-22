"""Basic unit tests for AI service (mock mode)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("AI_MOCK_MODE", "true")

from violation_engine import evaluate_violations, overall_confidence  # noqa: E402
from detector import detect_objects  # noqa: E402
from ocr_engine import normalize_plate_text, format_valid  # noqa: E402


def test_normalize_plate():
    assert normalize_plate_text("2a 1234") == "2A-1234"
    assert format_valid("2A-1234")


def test_mock_detect():
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    out = detect_objects(img)
    assert out["signs"]
    assert out["vehicles"]


def test_violation_engine():
    signs = [{"class_name": "no_entry", "confidence": 0.9}]
    vehicles = [{"class_name": "car", "confidence": 0.9, "bbox": [1, 2, 3, 4]}]
    plates = [{"text": "2A-1234", "confidence": 0.8}]
    suggestions = evaluate_violations(signs, vehicles, plates)
    assert any(s["violation_type"] == "NO_ENTRY" for s in suggestions)
    assert overall_confidence(signs, vehicles, plates) > 0
