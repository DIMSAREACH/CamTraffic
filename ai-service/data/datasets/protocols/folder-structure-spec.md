# Folder Structure Specification (Task 131)

## Goal

Standardize dataset storage before large-scale collection and annotation.

## Canonical structure

```text
ai-service/data/datasets/
├── raw/
│   ├── traffic-signs/
│   ├── vehicles/
│   ├── license-plates/
│   ├── videos/
│   └── dashcam/
├── processed/
├── splits/
├── annotations/
├── metadata/
├── manifests/
├── labels/
└── protocols/
```

## Notes

- `raw/` holds original capture files and should remain immutable.
- `processed/` stores cleaned frames/crops ready for annotation/training.
- `annotations/` stores exported annotation bundles and review artifacts.
- `metadata/` stores structured logs, GPS/session summaries, and QA summaries.
- Runtime media remains out of git except `.gitkeep` placeholders and templates.
