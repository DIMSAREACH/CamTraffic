# Detections App

> **Phase 5/6** · Tasks **046, 064, 098**

## Overview

AI detection monitoring and detail APIs.

## Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/detections/monitoring/` | Recent detections with filters |
| `GET` | `/api/v1/detections/monitoring/summary/` | Aggregate metrics |
| `GET` | `/api/v1/detections/monitoring/<id>/` | Detection detail with OCR summary |

## Officer Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/detections/officer/monitoring/` | Station detection feed |
| `GET` | `/api/v1/detections/officer/monitoring/summary/` | Station metrics |
| `GET` | `/api/v1/detections/officer/monitoring/<id>/` | Station detection detail |
| `GET` | `/api/v1/detections/officer/cameras/` | Camera filter options |

## Related Tasks

| Task | Status |
|------|--------|
| Task 046 | ✅ Admin detection monitoring |
| Task 064 | ✅ Officer live detection |
| Task 098 | ✅ AI Detection API |

## Status

- [x] Admin and officer monitoring list/summary endpoints
- [x] Detection detail views with bounding box and OCR summary
