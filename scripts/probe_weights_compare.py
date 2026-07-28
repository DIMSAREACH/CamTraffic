"""Compare live vs thesis sign weights on catalog art, a hard sample, and the dashcam crop."""
from pathlib import Path

import cv2
from ultralytics import YOLO

REPO = Path(__file__).resolve().parents[1]
LABELS = REPO / "ai" / "datasets" / "samples" / "manual_labels"

TARGETS = {
    "catalog art (R1_03 No U-turn)": REPO / "ai" / "catalog_10_signs" / "R1_03_No U-turn.png",
    "hard sample 01": REPO / "ai" / "test_samples" / "hard" / "hard_01_bri91.jpg",
    "dashcam full frame": LABELS / "GX010107_snapshot_05.49.549.png",
}

WEIGHTS = {
    "best.pt (248-class, live)": REPO / "ai" / "weights" / "best.pt",
    "best_v2.pt (10-class, thesis)": REPO / "ai" / "weights" / "best_v2.pt",
    "best_b2_named.pt": REPO / "ai" / "weights" / "best_b2_named.pt",
}


def make_sign_crop() -> Path:
    src = LABELS / "GX010107_snapshot_05.49.549.png"
    img = cv2.imread(str(src))
    x1, y1, x2, y2 = 907, 188, 972, 251
    pad = 30
    crop = img[max(0, y1 - pad):y2 + pad, max(0, x1 - pad):x2 + pad]
    crop = cv2.resize(crop, (crop.shape[1] * 4, crop.shape[0] * 4), interpolation=cv2.INTER_CUBIC)
    out = LABELS / "_probe_sign_crop.jpg"
    cv2.imwrite(str(out), crop)
    return out


def main() -> None:
    TARGETS["dashcam sign crop (zoomed)"] = make_sign_crop()

    for wname, wpath in WEIGHTS.items():
        if not wpath.exists():
            print(f"\n== {wname}: MISSING ==")
            continue
        model = YOLO(str(wpath))
        names = model.names
        print(f"\n== {wname} — {len(names)} classes ==")
        for label, path in TARGETS.items():
            if not path.exists():
                print(f"  {label:<32} MISSING FILE")
                continue
            res = model.predict(str(path), imgsz=640, conf=0.05, verbose=False)[0]
            found = sorted(
                ((names[int(b.cls)], round(float(b.conf), 3)) for b in res.boxes),
                key=lambda x: -x[1],
            )
            print(f"  {label:<32} boxes={len(found):<3} {found[:3]}")


if __name__ == "__main__":
    main()
