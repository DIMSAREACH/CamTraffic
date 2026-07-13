# OCR Fine-Tuning Guide — CamTraffic

## Data

- Manifest: `ai/datasets/annotations/ocr/ocr_manifest.csv` (503 transcriptions)
- Crops: `ai/datasets/annotations/ocr/crops/`

## Baseline

```bash
python ai/training/ocr/ocr_baseline.py --limit 50
```

Report: `ai/runs/evaluation/ocr_baseline.json`

## Post-processing improvements

1. Uppercase + remove spaces
2. Map common OCR confusions: `O`→`0`, `I`→`1` in numeric segments
3. Validate Cambodian plate pattern: `[A-Z]{2,3}[0-9][A-Z]?-[0-9]{3,4}`

## Fine-tune workflow

1. `python ai/training/ocr/ocr_finetune_launcher.py` — prereq check
2. Manual review: `python ai/training/ocr/verify_transcriptions.py`
3. Compare engines: `python ai/training/ocr/compare_engines.py`

## Edge cases

`python ai/training/ocr/plate_edge_cases.py` — 10 degradation conditions
