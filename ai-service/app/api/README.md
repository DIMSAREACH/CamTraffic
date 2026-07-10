# Detection History API

> **Phase 5** · Tasks **089**

## Overview

REST endpoints for browsing stored pipeline detection results.

## Structure

```text
app/api/
├── router.py
└── __init__.py
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/detections/history` | List stored detections |
| `GET` | `/api/v1/detections/history/{id}` | Detection record detail |

## Status

- [x] History list with search and camera filter
- [x] Detail endpoint backed by storage service
