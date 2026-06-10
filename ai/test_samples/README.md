# OCR test images

Synthetic Cambodia-style plates for testing **Module 5 — License Plate OCR**.

## Generate samples

```bash
# From project root
python ai/test_samples/generate_plate_samples.py

# Or via Django (same output)
cd backend
python manage.py test_plate_ocr --generate-sample
```

Creates:

| File | Use |
|------|-----|
| `plate_2A-1234.png` | Close-up plate — best for OCR accuracy |
| `car_with_plate_2A-1234.jpg` | Car scene with plate — full pipeline demo |

## Run OCR test (CLI)

```bash
cd backend
python manage.py test_plate_ocr
python manage.py test_plate_ocr --full
python manage.py test_plate_ocr ai/test_samples/car_with_plate_2A-1234.jpg --full
python manage.py test_plate_ocr --json
```

## Link to database

Seed vehicles include plate `2A-1234`:

```bash
cd backend
python manage.py seed_data
python manage.py test_plate_ocr --full
```

Expected: `DB match: 2A-1234 — (owner name)`.

## Requirements

- `pip install easyocr`
- `AI_PLATE_OCR_ENABLED=True` in `backend/.env`
- First EasyOCR run downloads models (~100MB)
