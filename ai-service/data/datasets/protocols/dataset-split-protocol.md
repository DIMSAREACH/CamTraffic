# Dataset Split Protocol (Task 140)

## Objective

Create reproducible `train/val/test` splits for YOLO training from validated CVAT exports.

## Inputs

- Exported YOLO dataset folders:
  - `annotations/exports/<batch_id>/images/`
  - `annotations/exports/<batch_id>/labels/`

## Split ratios

- `train`: 70%
- `val`: 20%
- `test`: 10%

## Rules

1. Split by *image stem* (image/label pair must stay together).
2. Deterministic behavior:
   - Use a fixed `--seed` (default `42`).
3. Always create split directories even if a split is empty:
   - `splits/train/images`, `splits/train/labels`
   - `splits/val/images`, `splits/val/labels`
   - `splits/test/images`, `splits/test/labels`
4. After splitting, validate each split with the Task 139 validator.

## Output locations (canonical)

Under `ai-service/data/datasets/splits/`:

```text
splits/
  train/
    images/
    labels/
  val/
    images/
    labels/
  test/
    images/
    labels/
```

## Completion criteria

Task 140 is complete when:

- Train/val/test folders exist with corresponding image/label pairs
- Validator checks pass for each split
- Split artifacts are reproducible given the same seed

