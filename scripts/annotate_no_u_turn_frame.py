"""Label + annotate No U-Turn sign on a highway snapshot."""
import json
from pathlib import Path

import cv2
import numpy as np

OUT_DIR = Path(__file__).resolve().parents[1] / "ai" / "datasets" / "samples" / "manual_labels"
SRC = OUT_DIR / "GX010107_snapshot_05.49.549.png"


def find_red_sign_bbox(img: np.ndarray) -> tuple[int, int, int, int]:
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask1 = cv2.inRange(hsv, (0, 70, 50), (10, 255, 255))
    mask2 = cv2.inRange(hsv, (160, 70, 50), (180, 255, 255))
    mask = cv2.bitwise_or(mask1, mask2)
    mask[:, : w // 2] = 0
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < 80:
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        ratio = bw / max(bh, 1)
        if 0.6 <= ratio <= 1.5 and 15 <= bw <= 120 and 15 <= bh <= 120:
            candidates.append((area, x, y, bw, bh))

    candidates.sort(reverse=True)
    print("Candidates:", candidates[:5])

    if candidates:
        _, x, y, bw, bh = candidates[0]
        pad = max(4, int(0.12 * max(bw, bh)))
        return (
            max(0, x - pad),
            max(0, y - pad),
            min(w - 1, x + bw + pad),
            min(h - 1, y + bh + pad),
        )

    # Fallback from visual estimate (upper-right circular sign)
    print("Used fallback bbox")
    cx, cy = int(0.918 * w), int(0.38 * h)
    r = int(0.035 * w)
    return cx - r, cy - r, cx + r, cy + r


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = cv2.imread(str(SRC))
    if img is None:
        raise SystemExit(f"Cannot read image: {SRC}")

    h, w = img.shape[:2]
    print(f"Image size: {w}x{h}")
    x1, y1, x2, y2 = find_red_sign_bbox(img)
    print(f"BBox xyxy: ({x1},{y1})-({x2},{y2})")

    class_id = 3  # ai/dataset_10/classes.txt
    class_name = "NO_U_TURN"
    label_en = "No U-Turn"
    label_kh = "ហាមបត់ត្រឡប់"

    bw = x2 - x1
    bh = y2 - y1
    xc = (x1 + x2) / 2 / w
    yc = (y1 + y2) / 2 / h
    nw = bw / w
    nh = bh / h
    yolo_line = f"{class_id} {xc:.6f} {yc:.6f} {nw:.6f} {nh:.6f}"

    annotated = img.copy()
    color = (0, 255, 0)
    thickness = max(2, int(round(min(w, h) / 400)))
    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)

    caption = f"{label_en} ({class_name})"
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = max(0.45, min(w, h) / 1200)
    (tw, th), _ = cv2.getTextSize(caption, font, scale, max(1, thickness - 1))
    ty = max(0, y1 - th - 8)
    cv2.rectangle(annotated, (x1, ty), (x1 + tw + 8, y1), color, -1)
    cv2.putText(
        annotated,
        caption,
        (x1 + 4, y1 - 6),
        font,
        scale,
        (0, 0, 0),
        max(1, thickness - 1),
        cv2.LINE_AA,
    )

    stem = "GX010107_snapshot_05.49.549_no_u_turn"
    img_out = OUT_DIR / f"{stem}.jpg"
    ann_out = OUT_DIR / f"{stem}_annotated.jpg"
    lbl_out = OUT_DIR / f"{stem}.txt"
    meta_out = OUT_DIR / f"{stem}.json"

    cv2.imwrite(str(img_out), img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    cv2.imwrite(str(ann_out), annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    lbl_out.write_text(yolo_line + "\n", encoding="utf-8")

    meta = {
        "source": SRC.name,
        "image_size": {"width": w, "height": h},
        "annotations": [
            {
                "class_id": class_id,
                "class_key": class_name,
                "label_en": label_en,
                "label_kh": label_kh,
                "bbox_xyxy": [x1, y1, x2, y2],
                "bbox_yolo": {
                    "x_center": round(xc, 6),
                    "y_center": round(yc, 6),
                    "width": round(nw, 6),
                    "height": round(nh, 6),
                },
                "sign_code": "KH-NOUT / R1-03",
                "category": "prohibitory",
            }
        ],
        "format": "YOLO (class_id x_center y_center width height) normalized",
        "dataset_ref": "ai/dataset_10/classes.txt index 3 = NO_U_TURN",
    }
    meta_out.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print("Saved:")
    for p in (img_out, ann_out, lbl_out, meta_out):
        print(" ", p)
    print("YOLO:", yolo_line)


if __name__ == "__main__":
    main()
