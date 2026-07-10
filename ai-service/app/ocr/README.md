# EasyOCR Service

> **Phase 5** · Tasks **085**

## Overview

License plate and text recognition with EasyOCR and mock fallback.

## Structure

```text
app/ocr/
├── schemas.py
├── model_loader.py
├── service.py
├── router.py
└── __init__.py
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/ocr/status` | OCR readiness and languages |
| `POST` | `/ocr/recognize` | General text recognition |
| `POST` | `/ocr/plate` | Plate-focused OCR |

## Status

- [x] Lazy EasyOCR reader loading
- [x] Mock OCR mode for development
