"""Task 262 / Task 177 — Interactive OCR transcription verifier.

Opens each plate crop in the default image viewer, shows the current
transcription, and lets you accept, correct, or skip it.

Saves a verified copy of the manifest to:
    data/datasets/annotations/ocr_manifest_verified.csv

Usage:
    python training/ocr/verify_transcriptions.py
    python training/ocr/verify_transcriptions.py --manifest data/datasets/annotations/ocr_manifest.csv
    python training/ocr/verify_transcriptions.py --from-row 50   # resume from row 50
"""

from __future__ import annotations

import argparse
import csv
import os
import subprocess
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = SERVICE_ROOT / "data/datasets/annotations/ocr_manifest.csv"
DEFAULT_OUTPUT   = SERVICE_ROOT / "data/datasets/annotations/ocr_manifest_verified.csv"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Interactive OCR transcription verifier")
    p.add_argument("--manifest",  default=str(DEFAULT_MANIFEST))
    p.add_argument("--output",    default=str(DEFAULT_OUTPUT))
    p.add_argument("--from-row",  type=int, default=1, help="Start from 1-based row number")
    p.add_argument("--dry-run",   action="store_true", help="Print only, do not save")
    return p.parse_args()


def open_image(path: Path) -> None:
    """Open image in default viewer (cross-platform)."""
    try:
        if sys.platform == "win32":
            os.startfile(str(path))
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(path)])
        else:
            subprocess.Popen(["xdg-open", str(path)])
    except Exception as exc:
        print(f"  (Could not open image: {exc})")


def main() -> None:
    args = parse_args()
    manifest_path = Path(args.manifest)
    output_path   = Path(args.output)

    if not manifest_path.exists():
        print(f"Manifest not found: {manifest_path}")
        sys.exit(1)

    with manifest_path.open(newline="", encoding="utf-8") as fh:
        reader  = csv.DictReader(fh)
        rows    = list(reader)
        headers = reader.fieldnames or []

    # Add verified column if missing
    if "verified" not in headers:
        headers = list(headers) + ["verified"]

    total    = len(rows)
    start    = max(0, args.from_row - 1)
    verified = 0
    skipped  = 0

    print(f"\n{'='*60}")
    print(f" OCR Transcription Verifier — {total} plates")
    print(f" Starting at row {args.from_row}")
    print(f" Commands: [Enter]=accept  [new text]=correct  [s]=skip  [q]=quit")
    print(f"{'='*60}\n")

    # Copy already-processed rows
    output_rows = rows[:start]

    for idx in range(start, total):
        row = rows[idx]
        sample_id    = row.get("sample_id", f"row-{idx+1}")
        crop_path    = row.get("crop_path", "")
        current_text = row.get("transcription", "").strip()

        print(f"[{idx+1}/{total}] {sample_id}")
        print(f"  Current: '{current_text}'")

        # Try to open image
        full_path = Path(crop_path)
        if not full_path.is_absolute():
            full_path = SERVICE_ROOT / crop_path
        if full_path.exists():
            open_image(full_path)
        else:
            print(f"  (Image not found: {full_path})")

        try:
            user_input = input("  Accept/correct/skip (Enter=accept, s=skip, q=quit): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nInterrupted — saving progress...")
            output_rows.append(row)
            break

        if user_input.lower() == "q":
            print("Quit — saving progress...")
            output_rows.append(row)
            output_rows.extend(rows[idx + 1:])
            break
        elif user_input.lower() == "s":
            row["verified"] = "skipped"
            skipped += 1
            print(f"  Skipped\n")
        elif user_input == "":
            row["verified"] = "ok"
            verified += 1
            print(f"  Accepted: '{current_text}'\n")
        else:
            row["transcription"] = user_input
            row["verified"] = "corrected"
            verified += 1
            print(f"  Corrected → '{user_input}'\n")

        output_rows.append(row)

    if not args.dry_run and output_rows:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=headers, extrasaction="ignore")
            writer.writeheader()
            for r in output_rows:
                if "verified" not in r:
                    r["verified"] = ""
                writer.writerow(r)
        print(f"\nSaved: {output_path}")

    print(f"\nSession: verified={verified}  skipped={skipped}  processed={idx+1}/{total}")
    print("Run again with --from-row to continue where you left off.")


if __name__ == "__main__":
    main()
