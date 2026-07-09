"""Fill OCR manifest `transcription` by running EasyOCR on plate crops.

Task 141 pending step:
- Type correct plate text (manual). We automate the pipeline step by
  generating initial transcriptions with the existing OCR runtime.

Notes:
- This will populate the manifest even if the OCR guess is imperfect.
- You should treat the result as "auto-filled" and optionally QC/correct.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Iterable


import sys


SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.ocr.service import ocr_service  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fill OCR manifest transcriptions using EasyOCR")
    parser.add_argument(
        "--manifest",
        required=True,
        help="Path to OCR manifest CSV (with crop_path column)",
    )
    parser.add_argument(
        "--output",
        default="",
        help="Output manifest path. If empty, writes '<manifest>.filled.csv'",
    )
    parser.add_argument(
        "--splits",
        default="train,val,test",
        help="Comma-separated splits to update (train,val,test)",
    )
    parser.add_argument(
        "--only-empty",
        action="store_true",
        help="Only fill rows whose transcription is empty",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max rows to process (0 = no limit)",
    )
    parser.add_argument(
        "--sample-ids",
        default="",
        help="Comma-separated sample_id values to process (empty = all matching rows)",
    )
    parser.add_argument(
        "--progress-every",
        type=int,
        default=25,
        help="Print progress every N rows",
    )
    return parser.parse_args()


def resolve_manifest_path(manifest_path_arg: str) -> Path:
    p = Path(manifest_path_arg)
    return p


def parse_splits(splits_arg: str) -> set[str]:
    return {s.strip().lower() for s in splits_arg.split(",") if s.strip()}


def iter_rows(manifest_path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with manifest_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        rows: list[dict[str, str]] = [dict(row) for row in reader]
    return rows, fieldnames


def write_rows(output_path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def ocr_with_preprocessing_fallback(image_bytes: bytes) -> str:
    """Try OCR variants when the standard OCR path returns empty text."""
    try:
        import numpy as np
        import cv2
    except ImportError:
        return ""

    # Use the same loaded EasyOCR reader as the runtime service.
    from app.ocr.model_loader import get_reader

    loaded = get_reader()
    reader = loaded.reader

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        return ""

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    variants: list[tuple[str, np.ndarray]] = [
        ("orig_bgr", img_bgr),
        ("gray", gray),
        ("gray_x2", cv2.resize(gray, (gray.shape[1] * 2, gray.shape[0] * 2), interpolation=cv2.INTER_CUBIC)),
    ]

    # Thresholding variants can help with low-contrast plate crops.
    _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants.append(("otsu", otsu))
    variants.append(
        ("otsu_x2", cv2.resize(otsu, (otsu.shape[1] * 2, otsu.shape[0] * 2), interpolation=cv2.INTER_CUBIC))
    )

    adapt = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2
    )
    variants.append(("adapt", adapt))
    variants.append(
        ("adapt_x2", cv2.resize(adapt, (adapt.shape[1] * 2, adapt.shape[0] * 2), interpolation=cv2.INTER_CUBIC))
    )

    best_norm = ""
    best_len = 0
    for _name, v in variants:
        if v.ndim == 2:
            rgb = cv2.cvtColor(v, cv2.COLOR_GRAY2RGB)
        else:
            rgb = cv2.cvtColor(v, cv2.COLOR_BGR2RGB)

        tokens = reader.readtext(rgb, detail=0, paragraph=False)
        raw = "".join(tokens).strip()
        norm = ocr_service._normalize_plate(raw)  # noqa: SLF001 (internal helper)
        if norm and len(norm) > best_len:
            best_norm = norm
            best_len = len(norm)

    return best_norm


def main() -> None:
    args = parse_args()
    manifest_path = resolve_manifest_path(args.manifest).resolve()
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    output_path = Path(args.output) if args.output else manifest_path.with_suffix("").as_posix() + ".filled.csv"
    output_path = Path(output_path)

    rows, fieldnames = iter_rows(manifest_path)
    if not rows:
        raise ValueError(f"Manifest is empty: {manifest_path}")
    if not fieldnames:
        raise ValueError(f"Manifest has no header: {manifest_path}")
    if "transcription" not in fieldnames:
        raise ValueError(f"Manifest missing 'transcription' column: {manifest_path}")

    allowed_splits = parse_splits(args.splits)
    sample_id_filter = {s.strip() for s in (args.sample_ids or "").split(",") if s.strip()}

    # Resolve relative crop paths relative to ai-service root (manifest parent is `ai-service/data/.../manifests/`)
    service_root = manifest_path.parents[2]

    filled = 0
    processed = 0
    for row in rows:
        sample_id = (row.get("sample_id") or "").strip()
        if sample_id_filter and sample_id not in sample_id_filter:
            continue

        split = (row.get("split") or "").strip().lower()
        if split not in allowed_splits:
            continue

        transcription = (row.get("transcription") or "").strip()
        if args.only_empty and transcription:
            continue

        crop_path_str = (row.get("crop_path") or "").strip()
        if not crop_path_str:
            continue
        crop_path = Path(crop_path_str)
        if not crop_path.is_absolute():
            crop_path = service_root / crop_path
        if not crop_path.exists():
            raise FileNotFoundError(f"Crop missing for sample_id={row.get('sample_id')}: {crop_path}")

        # OCR inference
        image_bytes = crop_path.read_bytes()
        plate_resp = ocr_service.recognize_plate(image_bytes)
        transcription = plate_resp.plate_text.strip()
        if not transcription:
            # Some crops may be low-contrast; try preprocessing fallback.
            transcription = ocr_with_preprocessing_fallback(image_bytes)
        row["transcription"] = transcription

        filled += 1
        processed += 1
        if args.progress_every > 0 and processed % args.progress_every == 0:
            print(f"Processed {processed} row(s)... filled so far: {filled}")

        if args.limit and processed >= args.limit:
            break

    write_rows(output_path, rows, fieldnames)
    print(f"Done. Filled {filled} row(s).")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()

