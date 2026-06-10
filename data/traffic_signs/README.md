
Last updated: 2026-05-27 (Week 1 Day 3)

## Purpose

Standard layout for **retraining YOLO**, **importing into Django**, and **Khmer/English UI + TTS**.

## Folder layout

```text
CamTraffic/
├── ai/
│   ├── sign_catalog.json          # Master metadata (KM + EN fields)
│   ├── dataset/                   # YOLO training set (generated)
│   │   ├── images/train/
│   │   ├── images/val/
│   │   └── labels/train|val/
│   └── weights/best.pt            # Trained model output
├── data/traffic_signs/
│   ├── README.md                  # This file
│   └── import_manifest.json       # DB import source (generated)
└── Reference(PDF Download)/.../ស្លាកសញ្ញាចរាចរណ៏/
    └── Cambodia_road_sign_{CODE}.svg.png   # Source artwork
```

## Naming convention

| Item | Format | Example |
|------|--------|---------|
| Sign code | `{Type}{Group}-{NN}` | `R1-01`, `W1-11A` |
| YOLO class key | underscores | `R1_01`, `W1_11A` |
| Reference image | `Cambodia_road_sign_{CODE}.svg.png` | `Cambodia_road_sign_R1-01.svg.png` |
| DB image file | `{sign_code}.png` | `R1-01.png` in `media/signs/` |

## Category mapping (code prefix)

| Prefix | Category |
|--------|----------|
| `R` | prohibitory |
| `W` | warning |
| `S` | mandatory |
| `G`, `P` | informative |

## Regenerate import manifest (Day 3+)

```bash
cd backend
python manage.py build_sign_import_manifest
```

Writes `data/traffic_signs/import_manifest.json` from `ai/sign_catalog.json`.

## Import into database (Day 4)

```bash
cd backend
python manage.py import_cambodia_signs --update --replace-placeholders
```

Uses manifest when present; falls back to `ai/sign_catalog.json`.

## Rebuild YOLO dataset (Day 4)

Full dataset:

```bash
cd ai
python build_dataset.py
python train.py
```

Quick pilot (5 train images first):

```bash
cd ai
python build_dataset.py --max-train 5 --max-val 2 --augments 1
python train.py --epochs 5
```

## Khmer / English fields

| Field | Language | Used for |
|-------|----------|----------|
| `sign_name` / `sign_name_km` | Khmer | Primary label, TTS |
| `sign_name_en` | English | EN UI |
| `description` | Khmer | Detail panel |
| `description_en` | English | EN UI |
| `guidance` | Khmer | Driver guidance, TTS |
| `guidance_en` | English | EN UI |
