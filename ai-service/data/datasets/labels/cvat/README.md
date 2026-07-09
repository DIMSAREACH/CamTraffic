# CVAT Label Definitions (Task 138)

Import `project-labels.json` when creating the CamTraffic CVAT project.

Label order must stay synchronized with:

- `labels/yolo/classes.txt`
- `labels/yolo/class-map.json`

After CVAT export, run `scripts/validate_yolo_export.py` before promoting data to `splits/`.
