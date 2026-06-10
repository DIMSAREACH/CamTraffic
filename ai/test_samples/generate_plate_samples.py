"""Generate synthetic Cambodia-style plate images for OCR testing."""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
PLATE_TEXT = '2A-1234'


def _draw_plate_text(img: np.ndarray, text: str, scale: float = 2.2, thickness: int = 8) -> np.ndarray:
    font = cv2.FONT_HERSHEY_DUPLEX
    size = cv2.getTextSize(text, font, scale, thickness)[0]
    h, w = img.shape[:2]
    x = max((w - size[0]) // 2, 10)
    y = max((h + size[1]) // 2, size[1] + 10)
    cv2.putText(img, text, (x, y), font, scale, (0, 0, 0), thickness, cv2.LINE_AA)
    return img


def write_plate_closeup(path: Path, text: str = PLATE_TEXT) -> Path:
    """High-contrast close-up plate — optimized for EasyOCR."""
    width, height = 1000, 260
    img = np.full((height, width, 3), 30, dtype=np.uint8)

    plate_w, plate_h = 860, 170
    x0 = (width - plate_w) // 2
    y0 = (height - plate_h) // 2
    cv2.rectangle(img, (x0, y0), (x0 + plate_w, y0 + plate_h), (255, 255, 255), -1)
    cv2.rectangle(img, (x0, y0), (x0 + plate_w, y0 + plate_h), (15, 23, 42), 4)
    cv2.rectangle(img, (x0 + 8, y0 + 8), (x0 + plate_w - 8, y0 + plate_h - 8), (37, 99, 235), 2)

    plate = img[y0 + 12 : y0 + plate_h - 12, x0 + 20 : x0 + plate_w - 20].copy()
    plate[:] = 255
    plate = _draw_plate_text(plate, text, scale=2.8, thickness=10)
    img[y0 + 12 : y0 + plate_h - 12, x0 + 20 : x0 + plate_w - 20] = plate

    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), img)
    return path


def write_car_with_plate(path: Path, text: str = PLATE_TEXT) -> Path:
    """Simple car scene with plate at the bottom."""
    width, height = 960, 640
    img = np.full((height, width, 3), 148, dtype=np.uint8)

    cv2.rectangle(img, (0, 420), (width, height), (100, 116, 139), -1)
    cv2.rectangle(img, (0, 498), (width, 508), (248, 250, 252), -1)

    cv2.rectangle(img, (180, 220), (780, 500), (226, 232, 240), -1)
    cv2.rectangle(img, (300, 260), (660, 360), (186, 230, 253), -1)
    cv2.circle(img, (280, 500), 55, (30, 41, 59), -1)
    cv2.circle(img, (680, 500), 55, (30, 41, 59), -1)

    px, py, pw, ph = 340, 448, 280, 72
    cv2.rectangle(img, (px, py), (px + pw, py + ph), (255, 255, 255), -1)
    cv2.rectangle(img, (px, py), (px + pw, py + ph), (15, 23, 42), 3)
    plate = img[py + 6 : py + ph - 6, px + 10 : px + pw - 10].copy()
    plate[:] = 255
    plate = _draw_plate_text(plate, text, scale=1.35, thickness=5)
    img[py + 6 : py + ph - 6, px + 10 : px + pw - 10] = plate

    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), img)
    return path


def main():
    closeup = write_plate_closeup(ROOT / 'plate_2A-1234.png')
    car = write_car_with_plate(ROOT / 'car_with_plate_2A-1234.jpg')
    print(f'Wrote {closeup}')
    print(f'Wrote {car}')


if __name__ == '__main__':
    main()
