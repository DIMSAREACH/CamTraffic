# Phase B2+ — Complete (2026-07-23)

Status of optional upgrades after B1 real photos.

---

## B2 — Multi-class retrain from Dim Sareach road data ✅ (dataset + training started)

### Problem found
`cambodia_traffic_signs_yolo/labels/*.txt` were **single-class** (`id=0` = Traffic Sign).  
Fine names (STOP, NO ENTRY, …) live in **VIA CSV** `data/CAM_TSR_csv.csv`.

### What we built
| Item | Path |
|------|------|
| Convert + train script | `ai/scripts/build_b2_named_signs_dataset.py` |
| YOLO dataset (26 classes) | `ai/datasets/splits/b2_cambodia_named_signs/` |
| Meta | `.../build_meta.json` |
| Train run | `ai/training/runs/detect/b2_cambodia_named_signs/` |
| Output weights (when done) | `ai/weights/best_b2_named.pt` |

**Dataset:** 1093 images · 26 named classes · train 771 / val 220 / test 111  
**Training:** fine-tune from `best.pt` → **26-class** head, **15 epochs**, CPU (running in background).

```bash
# Rebuild only
python ai/scripts/build_b2_named_signs_dataset.py

# Rebuild + train
python ai/scripts/build_b2_named_signs_dataset.py --train --epochs 15 --device cpu
```

When training finishes, optional switch for experiments:

```env
AI_MODEL_PATH=...\ai\weights\best_b2_named.pt
```

**Defense note:** Live demo can stay on **248-class `best.pt`**. B2 adds a **road-named 26-class** model with measurable train/val metrics from real Cambodian footage. Do not claim thesis mAP@50=0.908 for B2 until `results.csv` is published.

---

## B3 — Cambodia plate OCR post-process ✅

Improved `src/backend/ai_detection/plate_ocr.py`:
- Auto-insert missing dash (`2A1234` → `2A-1234`)
- Stronger OCR character fixes (serial O/I/B/S confusions)
- Second normalize pass after dash insert

Test:

```bash
python ai/scripts/test_plate_normalize.py
```

Full EasyOCR fine-tune still future work; officer confirmation remains required.

---

## B4 — Hard conditions set ✅

```bash
python ai/scripts/build_hard_conditions_set.py
```

Output: `ai/test_samples/hard/` (30 low-brightness frames)  
Upload in AI Detection to show night/shadow limitation honesty.

---

## B5 — Story alignment

| Model | Role |
|-------|------|
| `best.pt` (248) | **Live runtime** (catalog) |
| `best_v2.pt` (10) | Thesis **mAP@50 = 0.908** |
| `best_b2_named.pt` (26) | Road-named retrain from Dim Sareach VIA (B2) |

---

## Suggested viva line

> “We deployed a 248-class catalog model for live inference. We also converted our Cambodian road VIA annotations into a 26-class named dataset and fine-tuned YOLO on real footage. Plate OCR uses Cambodia-specific normalization; full OCR fine-tune is future work. Hard/dark frames are in our robustness test set.”
