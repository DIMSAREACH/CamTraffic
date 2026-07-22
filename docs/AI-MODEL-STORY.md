# CamTraffic AI Model Story (Defense Canonical)

**Last updated:** 2026-07-23  
**Purpose:** One consistent explanation for thesis defense, demo, and docs.

---

## Short answer (say this in viva)

> Live inference uses the **full 248-class Cambodian sign model** (`best.pt`) aligned with `sign_catalog.json`.  
> Separately, we evaluated a **balanced 10-class subset** (`best_v2.pt`) with **mAP@50 = 0.908** for thesis accuracy reporting.  
> Phase B2 also builds a **26-class road-named model** (`best_b2_named.pt`) from Dim Sareach VIA annotations — see `docs/final-year-project/PHASE-B2-PLUS.md`.  
> **Do not claim mAP@50 = 0.908 for the 248-class or B2 models** unless re-evaluated.

---

## Current runtime (this project)

| Setting | Value |
|---------|-------|
| `AI_MODEL_PATH` | `ai/weights/best.pt` |
| Classes loaded | **248** |
| Catalog | `ai/sign_catalog.json` (248) |

After restart, log should show: `Loaded sign YOLO: 248 classes`.

---

## Weight files (what exists)

| File | Classes | Role | When to use |
|------|--------:|------|-------------|
| `ai/weights/best.pt` | **248** | **Live runtime** — full catalog | Default now |
| `ai/weights/best_v2.pt` | **10** | Thesis-evaluated subset (metrics) | Cite mAP only |
| `ai/weights/best_b2_named.pt` | **26** | Road-named fine-tune (Dim Sareach VIA → YOLO) | Optional after B2 train |
| `ai/weights/best_combined.pt` | **31** | Intermediate expansion | Optional |

| Asset | Count | Role |
|-------|------:|------|
| `ai/sign_catalog.json` | **248** | Sign registry (Khmer + English names) |
| `ai/dataset_10/` (first 10) | **10** | Training/eval subset behind mAP numbers |

### The 10 thesis evaluation classes (`best_v2.pt`)

1. NO_ENTRY  
2. NO_LEFT_TURN  
3. NO_RIGHT_TURN  
4. NO_U_TURN  
5. NO_PARKING  
6. M_STOP  
7. P_SPEED_LIMIT_20_KM_H  
8. P_SPEED_LIMIT_50_KM_H  
9. W_PEDESTRIAN_CROSSING  
10. I_ONE_WAY_TRAFFIC  

Mapping: `src/backend/ai_detection/yolo_class_mapping.py`

---

## Metrics (do not mix)

| Metric | Value | Model |
|--------|------:|-------|
| mAP@50 | **0.908** | 10-class `best_v2.pt` / `dataset_10_train` **only** |
| mAP@50-95 | **0.796** | same |
| ~20 FPS CPU | yes | upload / officer workflow |

**Do not claim** mAP@50 = 0.908 for the 248-class `best.pt` unless that model is re-evaluated.

Source: `docs/final-year-project/AI-ACCURACY-EVALUATION.md`

---

## How to switch models

### Use 248 (current default)

```env
AI_MODEL_PATH=../ai/weights/best.pt
```

### Use 10-class (metrics demo)

```env
AI_MODEL_PATH=../ai/weights/best_v2.pt
```

Restart `python manage.py runserver` after changing `.env`.

---

## Pipeline objects (unchanged)

| Stage | Objects | Training need |
|-------|---------|---------------|
| Sign YOLO | 248 runtime / 10 eval subset | Custom train |
| Vehicle YOLO | car, motorcycle, bus, truck | Pretrained COCO |
| Plate OCR | plate text (EasyOCR) | Future Cambodia fine-tune |

---

## How to answer examiner questions

**Q: Why 248 live if metrics are on 10?**  
A: Catalog + runtime cover full Cambodian signs. The 10-class subset was trained with balanced data to publish a trustworthy mAP. Expanding evaluation to all 248 is future work.

**Q: Is the live system 248-class?**  
A: Yes — `best.pt` with 248 classes. Published mAP@50 = 0.908 refers to `best_v2.pt` (10-class).

**Q: Why is recall lower than precision?**  
A: Documented limitation on the evaluated subset; officer-in-the-loop confirmation prevents false fines.

---

## Docs that must stay aligned

- This file (`docs/AI-MODEL-STORY.md`) — **source of truth**
- `docs/final-year-project/DEMO-SCRIPT.md`
- `docs/final-year-project/DEFENSE-PREPARATION.md`
- `docs/GOVERNMENT_WEB_SYSTEM.md`
- `SYSTEM_STATUS_REPORT.md`
- `README.md` (pointer only)
