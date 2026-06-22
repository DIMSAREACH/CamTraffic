#!/usr/bin/env python
"""Keep only signs listed in ai/sign_catalog.json (trained set) before rebuild/train.

Removes extra TrafficSign rows from the database and optionally wipes ai/dataset/.

Usage (from project root):
    python scripts/clear_signs_before_train.py
    python scripts/clear_signs_before_train.py --dry-run
    python scripts/clear_signs_before_train.py --keep-dataset
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'backend'
CATALOG_PATH = ROOT / 'ai' / 'sign_catalog.json'
DATASET_DIR = ROOT / 'ai' / 'dataset'


def _load_trained_codes() -> set[str]:
    if not CATALOG_PATH.is_file():
        raise SystemExit(f'Missing {CATALOG_PATH} — run: python ai/build_dataset.py')
    catalog = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    if not catalog:
        raise SystemExit('sign_catalog.json is empty.')
    return {row['sign_code'].upper().replace('_', '-') for row in catalog}


def main() -> None:
    parser = argparse.ArgumentParser(description='Prune DB + dataset to trained sign catalog only.')
    parser.add_argument('--dry-run', action='store_true', help='Print what would be deleted')
    parser.add_argument('--keep-dataset', action='store_true', help='Do not delete ai/dataset/')
    args = parser.parse_args()

    trained = _load_trained_codes()
    print(f'Trained catalog: {len(trained)} sign(s) in {CATALOG_PATH.name}')

    sys.path.insert(0, str(BACKEND))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
    import django

    django.setup()

    from traffic_signs.models import TrafficSign

    db_codes = list(TrafficSign.objects.values_list('sign_code', flat=True))
    extra = [c for c in db_codes if c.upper().replace('_', '-') not in trained]
    missing = sorted(trained - {c.upper().replace('_', '-') for c in db_codes})

    print(f'Database: {len(db_codes)} sign(s)')
    print(f'  Extra (will remove): {len(extra)}')
    if missing:
        print(f'  Missing from DB (sync after train): {len(missing)}')

    if extra:
        if args.dry_run:
            for code in sorted(extra)[:20]:
                print(f'  [dry-run] delete {code}')
            if len(extra) > 20:
                print(f'  ... and {len(extra) - 20} more')
        else:
            deleted, _ = TrafficSign.objects.filter(sign_code__in=extra).delete()
            print(f'Deleted {deleted} row(s) from traffic_signs')

    if not args.keep_dataset and DATASET_DIR.is_dir():
        if args.dry_run:
            n_img = len(list(DATASET_DIR.rglob('*.jpg')))
            print(f'[dry-run] would clear {DATASET_DIR} ({n_img} jpg files)')
        else:
            shutil.rmtree(DATASET_DIR, ignore_errors=True)
            print(f'Cleared {DATASET_DIR}')

    if not args.dry_run:
        remaining = TrafficSign.objects.count()
        print(f'Done. Database now has {remaining} sign(s). Next:')
        print('  python ai/build_dataset.py --augments 8')
        print('  python ai/train.py --epochs 30 --batch 4 --device cpu')


if __name__ == '__main__':
    main()
