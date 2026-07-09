# Annotation Guideline (Task 130)

This document defines how to annotate traffic-sign detection and OCR targets
for the CamTraffic AI dataset.

## Scope

- Object detection labels for traffic signs and license plates (YOLO format)
- Optional transcription metadata for OCR targets
- Quality and review checklist for annotation consistency

## Tooling

- Recommended tools: CVAT, Label Studio, Roboflow, or LabelImg
- Export format: YOLO TXT (`class_id x_center y_center width height`)
- Coordinate convention: normalized to image width/height (0.0–1.0)

## Labeling rules

1. Draw boxes tightly around visible object boundaries.
2. Include partially occluded objects only if at least 35% is visible.
3. Exclude extremely blurred objects that cannot be recognized by a human.
4. One object = one box.
5. Do not merge adjacent signs into one box.

## Class assignment

Use class IDs defined in `labels/yolo/classes.txt` and mapping in
`labels/yolo/class-map.json`.

For ANPR images, annotate both vehicle classes (for example `car_sedan`) and
plate classes (`license_plate_kh_*`) on the same frame when visible.

If an object does not match any class:
- use `unknown_sign` (if visible and relevant), or
- skip and record in QA notes.

## OCR annotation rules

- Annotate plate region as detection object (`license_plate_*` class).
- Keep text transcription in metadata CSV/JSON (not in YOLO TXT).
- Use uppercase transcription and preserve Khmer characters.

## Difficult cases

- **Night glare**: annotate if sign outline is distinguishable.
- **Motion blur**: annotate only if class remains human-identifiable.
- **Overlapping signs**: annotate each sign separately.
- **Far distance**: annotate if object is at least 12x12 pixels.

## Review protocol

- 10% of each batch must be double-reviewed.
- If disagreement > 3% class mismatch, retrain annotators and recheck batch.
- Keep per-batch QA report in `labels/qa/`.
