"""Published AI metrics (thesis accuracy) — served from JSON + training results.csv."""
from __future__ import annotations

import csv
import json
from pathlib import Path

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.responses import success_response

REPO = Path(getattr(settings, 'REPO_ROOT', Path(settings.BASE_DIR).parent.parent))
AI_ROOT = REPO / 'ai'
PUBLISHED = AI_ROOT / 'metrics' / 'published_metrics.json'


def _parse_yolo_results_csv(path: Path) -> dict | None:
    if not path.is_file():
        return None
    rows = list(csv.DictReader(path.open(encoding='utf-8')))
    if not rows:
        return None
    last = rows[-1]
    # Ultralytics columns vary; prefer metrics/mAP50(B)
    def num(*keys):
        for k in keys:
            for col, val in last.items():
                if col.strip() == k or col.strip().endswith(k):
                    try:
                        return float(val)
                    except (TypeError, ValueError):
                        continue
        return None

    return {
        'map50': num('metrics/mAP50(B)', 'mAP50'),
        'map50_95': num('metrics/mAP50-95(B)', 'mAP50-95'),
        'precision': num('metrics/precision(B)', 'precision'),
        'recall': num('metrics/recall(B)', 'recall'),
        'epoch': num('epoch'),
        'source': str(path.relative_to(REPO)).replace('\\', '/'),
    }


def load_published_metrics() -> dict:
    if PUBLISHED.is_file():
        return json.loads(PUBLISHED.read_text(encoding='utf-8'))

    v2 = _parse_yolo_results_csv(AI_ROOT / 'training' / 'runs' / 'detect' / 'dataset_10_train' / 'results.csv')
    b2 = _parse_yolo_results_csv(AI_ROOT / 'training' / 'runs' / 'detect' / 'b2_cambodia_named_signs' / 'results.csv')
    model_path = getattr(settings, 'AI_MODEL_PATH', '') or ''
    live_classes = 248
    if 'best_v2' in str(model_path).replace('\\', '/'):
        live_classes = 10
    elif 'b2_named' in str(model_path).replace('\\', '/') or 'best_b2' in str(model_path).replace('\\', '/'):
        live_classes = 26

    payload = {
        'live_model': {
            'path': str(model_path),
            'classes': live_classes,
            'role': 'runtime_catalog' if live_classes == 248 else 'runtime',
        },
        'thesis_eval_10_class': {
            'weights': 'ai/weights/best_v2.pt',
            'classes': 10,
            # Canonical defense numbers from AI-ACCURACY-EVALUATION.md (do not swap for a later CSV row)
            'map50': 0.9084,
            'map50_95': 0.7956,
            'precision': (v2 or {}).get('precision'),
            'recall': (v2 or {}).get('recall'),
            'note': 'Cite mAP@50≈0.908 only for best_v2.pt / dataset_10 eval.',
            'results_csv': (v2 or {}).get('source'),
            'results_csv_last_epoch': {
                'map50': (v2 or {}).get('map50'),
                'map50_95': (v2 or {}).get('map50_95'),
            } if v2 else None,
        },
        'b2_named_26_class': {
            'weights': 'ai/weights/best_b2_named.pt',
            'classes': 26,
            'map50': (b2 or {}).get('map50'),
            'map50_95': (b2 or {}).get('map50_95'),
            'precision': (b2 or {}).get('precision'),
            'recall': (b2 or {}).get('recall'),
            'results_csv': (b2 or {}).get('source'),
        },
        'full_248_class': {
            'weights': 'ai/weights/best.pt',
            'classes': 248,
            'map50': None,
            'note': (
                'Full 248-class mAP requires populated ai/dataset train/val images. '
                'Until then, do not claim 0.908 for best.pt. Use best_v2 for thesis accuracy demo.'
            ),
        },
        'ocr': {
            'engine': 'EasyOCR + Cambodia normalize + fuzzy vehicle link',
            'exact_match_rate': 0.0,
            'cer_postprocess': 2.401,
            'note': 'Officer confirmation required; OCR assists, does not auto-fine.',
        },
    }
    PUBLISHED.parent.mkdir(parents=True, exist_ok=True)
    PUBLISHED.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    return payload


class PublishedModelMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success_response(load_published_metrics())
