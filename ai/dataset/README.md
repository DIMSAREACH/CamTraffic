# Full Cambodian sign YOLO dataset (local media gitignored)

```
dataset/
├── data.yaml
├── images/train/   # place .jpg/.png here
├── images/val/
├── labels/train/   # matching YOLO .txt
└── labels/val/
```

Build from Dim Sareach reference:

```bash
python ai/build_dataset.py
```
