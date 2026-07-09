#!/usr/bin/env python3
"""
Public Traffic Sign Downloader — CamTraffic
Downloads free/public-domain traffic sign images for classes that have no
local source images. Uses:
  - Open Images v7 (via fiftyone or direct CSV manifest)
  - Wikimedia Commons SVG renders
  - Synthetic generation from basic shapes (fallback)

Usage:
    python download_public_signs.py [--class CLASS] [--count N] [--source SOURCE]

Sources: wikimedia | synthetic | openimages
Requires (choose one source):
    pip install requests Pillow      (for wikimedia + synthetic)
    pip install fiftyone             (for openimages — large install)
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

SCRIPT_DIR   = Path(__file__).resolve().parent
DATASETS_DIR = SCRIPT_DIR.parent
RAW_DIR      = DATASETS_DIR / "raw" / "traffic_signs"
REPORT_DIR   = DATASETS_DIR / "manifests"

# Wikimedia Commons API base
WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php"
WIKIMEDIA_FILE = "https://commons.wikimedia.org/wiki/Special:FilePath/"

# Traffic sign Wikimedia search queries (Cambodian/ASEAN context)
WIKIMEDIA_QUERIES = {
    "no_entry":           "no entry traffic sign",
    "no_u_turn":          "no u-turn sign",
    "no_left_turn":       "no left turn traffic sign",
    "no_right_turn":      "no right turn traffic sign",
    "no_overtaking":      "no overtaking sign",
    "parking_prohibited": "no parking sign",
    "speed_limit_30":     "speed limit 30 sign",
    "speed_limit_40":     "speed limit 40 sign",
    "speed_limit_60":     "speed limit 60 sign",
    "stop":               "STOP traffic sign",
    "yield":              "give way yield sign",
    "one_way":            "one way traffic sign",
    "pedestrian_crossing": "pedestrian crossing sign",
    "school_zone":        "school zone warning sign",
    "traffic_light_signal": "traffic light signal sign",
    "no_horn":            "no horn sign",
}

# ── Synthetic sign generation ─────────────────────────────────────────────────

def draw_prohibitory_base(size=256, fill_color=(220, 30, 30), symbol_text=""):
    """Draw a round red prohibitory sign base."""
    if not HAS_PIL:
        return None
    img = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    margin = size // 10
    draw.ellipse([margin, margin, size - margin, size - margin], fill=fill_color, outline=(0, 0, 0), width=3)
    inner = size // 4
    draw.ellipse(
        [inner, inner, size - inner, size - inner],
        fill=(255, 255, 255), outline=fill_color, width=0
    )
    if symbol_text:
        # estimate font size
        font_size = size // 4
        try:
            from PIL import ImageFont
            font = ImageFont.load_default(size=font_size)
        except Exception:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), symbol_text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((size - tw) // 2, (size - th) // 2), symbol_text, fill=(0, 0, 0), font=font)
    return img


def generate_synthetic(class_name: str, count: int, out_dir: Path) -> int:
    """Generate simple synthetic sign images using PIL."""
    if not HAS_PIL:
        print("  PIL not installed — cannot generate synthetic images")
        print("  Install with: pip install Pillow")
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)
    import random

    TEMPLATES = {
        "no_entry":           {"shape": "circle_red", "text": ""},
        "no_u_turn":          {"shape": "circle_red", "text": "↩"},
        "no_left_turn":       {"shape": "circle_red", "text": "←"},
        "no_right_turn":      {"shape": "circle_red", "text": "→"},
        "no_overtaking":      {"shape": "circle_red", "text": "≋"},
        "no_horn":            {"shape": "circle_red", "text": "📢"},
        "parking_prohibited": {"shape": "circle_red_cross", "text": "P"},
        "speed_limit_30":     {"shape": "circle_red_border", "text": "30"},
        "speed_limit_40":     {"shape": "circle_red_border", "text": "40"},
        "speed_limit_60":     {"shape": "circle_red_border", "text": "60"},
        "stop":               {"shape": "octagon", "text": "STOP"},
        "yield":              {"shape": "triangle_red", "text": ""},
        "one_way":            {"shape": "rect_blue", "text": "→"},
        "pedestrian_crossing": {"shape": "diamond_yellow", "text": "🚶"},
        "school_zone":        {"shape": "diamond_yellow", "text": "SCHOOL"},
        "traffic_light_signal": {"shape": "circle_black", "text": "🚦"},
    }

    tmpl = TEMPLATES.get(class_name, {"shape": "circle_red", "text": "?"})
    generated = 0

    for i in range(count):
        size = random.choice([256, 320, 416, 512])
        img = Image.new("RGB", (size, size), (random.randint(220, 255),) * 3)
        draw = ImageDraw.Draw(img)
        margin = size // 8
        color = (200 + random.randint(-20, 20), 25 + random.randint(-10, 10), 25 + random.randint(-10, 10))

        shape = tmpl["shape"]
        text  = tmpl["text"]

        if "circle" in shape:
            draw.ellipse([margin, margin, size - margin, size - margin], outline=color, width=max(3, size // 30))
            if "red" == shape:
                draw.ellipse([margin + 5, margin + 5, size - margin - 5, size - margin - 5], fill=color)
            if "border" in shape and text:
                font_sz = size // 3
                try:
                    font = ImageFont.load_default(size=font_sz)
                except Exception:
                    font = ImageFont.load_default()
                bb = draw.textbbox((0, 0), text, font=font)
                tw, th = bb[2] - bb[0], bb[3] - bb[1]
                draw.text(((size - tw) // 2, (size - th) // 2), text, fill=(0, 0, 0), font=font)
        elif "octagon" == shape:
            r = size // 2 - margin
            cx, cy = size // 2, size // 2
            pts = [(int(cx + r * math.cos(math.radians(a))), int(cy + r * math.sin(math.radians(a)))) for a in range(22, 361, 45)]
            draw.polygon(pts, fill=color)
            if text:
                font_sz = size // 4
                try:
                    font = ImageFont.load_default(size=font_sz)
                except Exception:
                    font = ImageFont.load_default()
                bb = draw.textbbox((0, 0), text, font=font)
                tw, th = bb[2] - bb[0], bb[3] - bb[1]
                draw.text(((size - tw) // 2, (size - th) // 2), text, fill=(255, 255, 255), font=font)
        elif "triangle" in shape:
            h = int(size * 0.8)
            top = (size // 2, margin)
            bl  = (margin, margin + h)
            br  = (size - margin, margin + h)
            draw.polygon([top, bl, br], outline=color, fill=(255, 255, 255), width=max(3, size // 30))

        out_path = out_dir / f"{class_name}_syn_{i:04d}.jpg"
        img.save(out_path, quality=90)
        generated += 1

    print(f"  [{class_name}] Generated {generated} synthetic images → {out_dir}")
    return generated


def download_wikimedia(class_name: str, count: int, out_dir: Path) -> int:
    """Download sign images from Wikimedia Commons."""
    if not HAS_REQUESTS:
        print("  'requests' not installed. Install with: pip install requests")
        return 0

    query = WIKIMEDIA_QUERIES.get(class_name)
    if not query:
        print(f"  No Wikimedia query defined for class '{class_name}'")
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)
    downloaded = 0

    params = {
        "action": "query",
        "list": "search",
        "srsearch": f"{query} filetype:png filetype:jpg",
        "srnamespace": "6",  # File namespace
        "srlimit": min(count * 3, 50),
        "format": "json",
    }
    try:
        resp = requests.get(WIKIMEDIA_API, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  Wikimedia search failed: {e}")
        return 0

    results = data.get("query", {}).get("search", [])
    print(f"  [{class_name}] Found {len(results)} Wikimedia results for: {query}")

    for item in results:
        if downloaded >= count:
            break
        title = item["title"]
        if not any(title.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".svg"]):
            continue
        file_name = title.replace("File:", "").replace(" ", "_")
        url = WIKIMEDIA_FILE + requests.utils.quote(file_name)

        try:
            r = requests.get(url, timeout=20, stream=True)
            r.raise_for_status()
            content_type = r.headers.get("Content-Type", "")
            if "svg" in content_type:
                continue  # Skip SVG — needs renderer
            ext = ".jpg" if "jpeg" in content_type else ".png"
            out_path = out_dir / f"{class_name}_wiki_{downloaded:03d}{ext}"
            with open(out_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            downloaded += 1
            print(f"    Downloaded: {out_path.name}")
        except Exception as e:
            print(f"    Failed: {file_name} — {e}")

    return downloaded


def main():
    parser = argparse.ArgumentParser(description="Download public traffic sign images")
    parser.add_argument("--class", dest="cls", default=None)
    parser.add_argument("--count", type=int, default=30)
    parser.add_argument("--source", default="synthetic", choices=["synthetic", "wikimedia", "both"])
    args = parser.parse_args()

    MISSING_CLASSES = [
        "no_left_turn", "no_right_turn", "no_overtaking", "no_horn",
        "speed_limit_30", "speed_limit_40", "speed_limit_60",
        "yield", "one_way", "pedestrian_crossing", "school_zone", "traffic_light_signal",
    ]

    classes = [args.cls] if args.cls else MISSING_CLASSES

    results = {}
    for cls in classes:
        out_dir = RAW_DIR / cls
        total = 0

        if args.source in ("synthetic", "both"):
            total += generate_synthetic(cls, args.count, out_dir)

        if args.source in ("wikimedia", "both"):
            total += download_wikimedia(cls, args.count, out_dir)

        results[cls] = total

    print(f"\n{'─'*50}")
    print(f"Download complete. Images added per class:")
    for cls, n in results.items():
        print(f"  {cls:<30s} +{n}")

    report_path = REPORT_DIR / "download_report.json"
    with open(report_path, "w") as f:
        json.dump({"generated_at": datetime.now(timezone.utc).isoformat(), "results": results}, f, indent=2)
    print(f"\nReport → {report_path}")


if __name__ == "__main__":
    main()
