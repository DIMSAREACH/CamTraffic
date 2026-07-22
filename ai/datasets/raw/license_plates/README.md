# License plate raw imports

**Collected:** **503** images (50 reference + 453 Roboflow `Plate Number.v3i.yolov11`).

```powershell
# From repo root — uses default reference folder automatically
python ai/scripts/import_roboflow_zip.py --type plates --batch BATCH-ROBO-PLATE-001
```

Explicit folder:

```powershell
python ai/scripts/import_roboflow_zip.py --folder "D:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Plate Number.v3i.yolov11" --type plates --batch BATCH-ROBO-PLATE-001
```

Enterprise stretch target: **1,253** images, 3 classes.
