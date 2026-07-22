# Vehicle raw imports

**Collected:** **218** images (22 reference + 196 Roboflow `Cambodia Traffic.v1i.yolov11`).

```powershell
# From repo root — uses default reference folder automatically
python ai/scripts/import_roboflow_zip.py --type vehicles --batch BATCH-ROBO-VEH-001
```

Explicit folder (if reference path differs):

```powershell
python ai/scripts/import_roboflow_zip.py --folder "D:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Cambodia Traffic.v1i.yolov11" --type vehicles --batch BATCH-ROBO-VEH-001
```

Enterprise stretch target: **4,615** images, 9 classes.
