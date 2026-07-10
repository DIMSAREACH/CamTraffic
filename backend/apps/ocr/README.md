# OCR App

> **Phase 5/6** · Tasks **085, 099**

## Overview

Django OCR result storage linked to AI detections.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/ocr/results/` | admin | List OCR results |
| `POST` | `/api/v1/ocr/results/` | admin | Store OCR result for detection |
| `GET` | `/api/v1/ocr/results/<id>/` | admin | OCR result detail |
| `GET` | `/api/v1/ocr/detections/<id>/` | admin/officer | OCR by detection ID |

## Related Tasks

| Task | Status |
|------|--------|
| Task 085 | ✅ AI service EasyOCR |
| Task 099 | ✅ Backend OCR API |

## Status

- [x] `OCRResult` model linked to `Detection`
- [x] List/create/detail OCR result endpoints
- [x] Detection lookup endpoint

## Notes

Creating an OCR result updates the parent detection `plate_number` and `plate_confidence` fields.
