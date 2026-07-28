"""Video / webcam / IP camera stream processing."""

from __future__ import annotations

import logging
import tempfile
import uuid
from pathlib import Path

import cv2

from config import Settings, get_settings
from plate_detector import decode_image_bytes, detect_plates, load_image
from detector import detect_objects
from ocr_engine import read_plates_from_regions
from violation_engine import evaluate_violations, overall_confidence

logger = logging.getLogger(__name__)


def run_full_pipeline(
    image,
    *,
    settings: Settings | None = None,
    observed_speed_kmh: float | None = None,
    save_annotated_to: Path | None = None,
) -> dict:
    """End-to-end: signs → vehicles → plates → OCR → violations."""
    settings = settings or get_settings()
    detections = detect_objects(image, settings=settings)
    signs = detections["signs"]
    vehicles = detections["vehicles"]
    plate_regions = detect_plates(image, vehicles, settings=settings)
    plates = read_plates_from_regions(image, plate_regions, settings=settings)
    violations = evaluate_violations(
        signs,
        vehicles,
        plates,
        observed_speed_kmh=observed_speed_kmh,
    )
    annotated_path = None
    if save_annotated_to is not None:
        annotated_path = str(annotate_and_save(image, signs, vehicles, plates, save_annotated_to))

    return {
        "detection_id": str(uuid.uuid4()),
        "signs": signs,
        "vehicles": vehicles,
        "plates": plates,
        "violation_suggestions": violations,
        "confidence_score": overall_confidence(signs, vehicles, plates),
        "annotated_path": annotated_path,
        "mock_mode": settings.ai_mock_mode,
    }


def annotate_and_save(
    image,
    signs: list[dict],
    vehicles: list[dict],
    plates: list[dict],
    out_path: Path,
) -> Path:
    canvas = image.copy()
    for item, color in (
        *((s, (0, 165, 255)) for s in signs),
        *((v, (0, 255, 0)) for v in vehicles),
        *((p, (255, 0, 0)) for p in plates),
    ):
        bbox = item.get("bbox") or []
        if len(bbox) != 4:
            continue
        x1, y1, x2, y2 = map(int, bbox)
        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 2)
        label = item.get("class_name") or item.get("text") or "obj"
        conf = item.get("confidence")
        text = f"{label}" + (f" {conf:.2f}" if conf is not None else "")
        cv2.putText(canvas, text, (x1, max(15, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), canvas)
    return out_path


def process_video_file(
    video_path: Path,
    *,
    frame_stride: int = 15,
    max_frames: int = 40,
    settings: Settings | None = None,
) -> dict:
    """Sample frames from a video and aggregate detections."""
    settings = settings or get_settings()
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    frame_idx = 0
    processed = 0
    all_signs: list[dict] = []
    all_vehicles: list[dict] = []
    all_plates: list[dict] = []
    all_violations: list[dict] = []

    try:
        while processed < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_idx % frame_stride != 0:
                frame_idx += 1
                continue
            result = run_full_pipeline(frame, settings=settings)
            all_signs.extend(result["signs"])
            all_vehicles.extend(result["vehicles"])
            all_plates.extend(result["plates"])
            all_violations.extend(result["violation_suggestions"])
            processed += 1
            frame_idx += 1
    finally:
        cap.release()

    return {
        "detection_id": str(uuid.uuid4()),
        "frames_processed": processed,
        "signs": all_signs,
        "vehicles": all_vehicles,
        "plates": all_plates,
        "violation_suggestions": _dedupe_violations(all_violations),
        "confidence_score": overall_confidence(all_signs, all_vehicles, all_plates),
        "mock_mode": settings.ai_mock_mode,
    }


def process_ip_camera(
    stream_url: str,
    *,
    frames: int = 5,
    settings: Settings | None = None,
) -> dict:
    """Grab N frames from RTSP/HTTP IP camera and run detection."""
    settings = settings or get_settings()
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        raise ValueError(f"Cannot open stream: {stream_url}")

    collected: list[dict] = []
    try:
        for _ in range(max(1, frames)):
            ok, frame = cap.read()
            if not ok:
                break
            collected.append(run_full_pipeline(frame, settings=settings))
    finally:
        cap.release()

    if not collected:
        raise ValueError("No frames captured from IP camera")

    # Return last frame result with aggregate counts
    last = collected[-1]
    last["frames_processed"] = len(collected)
    last["stream_url"] = stream_url
    return last


def process_webcam_frame_bytes(data: bytes, *, settings: Settings | None = None) -> dict:
    image = decode_image_bytes(data)
    return run_full_pipeline(image, settings=settings)


def process_image_path(path: Path, *, settings: Settings | None = None, annotated_dir: Path | None = None) -> dict:
    image = load_image(path)
    out = None
    if annotated_dir is not None:
        out = annotated_dir / f"annotated_{path.stem}_{uuid.uuid4().hex[:8]}.jpg"
    return run_full_pipeline(image, settings=settings, save_annotated_to=out)


def process_image_bytes(data: bytes, *, settings: Settings | None = None, annotated_dir: Path | None = None) -> dict:
    image = decode_image_bytes(data)
    out = None
    if annotated_dir is not None:
        out = annotated_dir / f"annotated_{uuid.uuid4().hex[:10]}.jpg"
    return run_full_pipeline(image, settings=settings, save_annotated_to=out)


def save_upload_to_temp(data: bytes, suffix: str) -> Path:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(data)
    tmp.close()
    return Path(tmp.name)


def _dedupe_violations(items: list[dict]) -> list[dict]:
    best: dict[str, dict] = {}
    for item in items:
        key = item.get("violation_type", "")
        prev = best.get(key)
        if prev is None or float(item.get("confidence", 0)) > float(prev.get("confidence", 0)):
            best[key] = item
    return list(best.values())
