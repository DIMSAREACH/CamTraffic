# OpenCV Processing

> **Phase 5** · Tasks **084**

## Overview

Image preprocessing and region extraction with OpenCV (Pillow fallback).

## Structure

```text
app/processing/
├── schemas.py
├── service.py
├── router.py
└── __init__.py
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/processing/status` | Runtime and max width config |
| `POST` | `/processing/preprocess` | Resize/denoise image |

## Status

- [x] OpenCV preprocessing with Pillow fallback
- [x] Bounding-box crop and plate-region extraction helpers
