"""Spread operational record dates across recent months so dashboard charts fill."""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src' / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from django.utils import timezone  # noqa: E402

from ai_detection.models import AIDetectionLog  # noqa: E402
from fines.models import Fine  # noqa: E402
from violations.models import TrafficViolation  # noqa: E402


def month_anchors(months: int = 7):
    now = timezone.now()
    anchors = []
    y, m = now.year, now.month
    for _ in range(months):
        anchors.append(timezone.make_aware(datetime(y, m, 10, 10, 0, 0)))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    anchors.reverse()
    return anchors, now


def distribute(qs, field_names: list[str], months: int = 7) -> int:
    items = list(qs.order_by('pk'))
    if not items:
        return 0
    anchors, now = month_anchors(months)
    updated = 0
    for i, obj in enumerate(items):
        base = anchors[i % len(anchors)]
        day_offset = (i // len(anchors)) % 18
        stamp = base + timedelta(days=day_offset, hours=(i % 12), minutes=(i * 7) % 60)
        if stamp > now:
            stamp = now - timedelta(hours=(i % 48) + 1)
        changes = [f for f in field_names if hasattr(obj, f)]
        for fname in changes:
            setattr(obj, fname, stamp)
        if changes:
            obj.save(update_fields=changes)
            updated += 1
    return updated


def main() -> int:
    print('Spreading chart dates across last 7 months…')
    v = distribute(TrafficViolation.objects.all(), ['violation_date', 'created_at', 'updated_at'])
    f = distribute(Fine.objects.all(), ['created_at', 'updated_at'])
    a = distribute(AIDetectionLog.objects.all(), ['created_at', 'updated_at'])
    print(f'  violations: {v}')
    print(f'  fines: {f}')
    print(f'  ai_logs: {a}')
    print('Done — refresh Admin Dashboard (hard refresh).')
    print('Trim/spread from repo root:')
    print('  node scripts/backend-python.mjs ../../scripts/db/spread_chart_dates.py')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
