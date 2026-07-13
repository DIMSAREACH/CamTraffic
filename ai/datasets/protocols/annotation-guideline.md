# CamTraffic Annotation Guidelines

Phase 8 · Task 242 · Applies to traffic signs, vehicles, and license plates.

## Bounding boxes

- **Tight fit** — box edges touch but do not cut off the object.
- **Include full sign face** — include border/frame; exclude pole below mounting bracket.
- **Vehicles** — box covers entire visible vehicle body; exclude distant partial occlusions < 50% visible.
- **Plates** — box covers plate rectangle only; exclude bumper surround when possible.

## Class selection (31-class combined model)

| Group | Class IDs | Examples |
|-------|-----------|----------|
| Traffic signs | 0–9, 22–30 | `NO_ENTRY`, `M_STOP`, `P_NO_OVERTAKING` |
| Vehicles | 10–18 | `sedan`, `motorcycle`, `bus` |
| License plates | 19–21 | `plate_private`, `plate_commercial`, `plate_government` |

See `labels/yolo/class-map.json` for the authoritative list.

## Quality rules

1. **One box per instance** — no duplicate boxes on the same object.
2. **Minimum size** — object must be ≥ 20×20 px in the image.
3. **Occlusion** — annotate if ≥ 50% visible; skip otherwise.
4. **Night / rain** — annotate if class is identifiable; tag in metadata when exported.
5. **Ambiguous class** — prefer parent category (e.g. `sedan` vs `suv`) and note in QA log.

## OCR transcriptions (plates)

- Format: Cambodian plate ID uppercase, e.g. `PP2AF-2243`.
- Verify against `annotations/ocr/ocr_manifest.csv`.
- Flag uncertain characters in `verified` column (`manual` after review).

## Prohibitory signs

Cross-reference `manifests/prohibitory_sign_class_map.csv` when labeling P_* classes from the full 236-class catalog.

## QA checklist

Complete `labels/qa/annotation_qa_checklist.md` per batch before merging splits.
