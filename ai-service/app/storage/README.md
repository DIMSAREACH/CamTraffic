# AI Result Storage

> **Phase 5** · Tasks **087**

## Overview

Persist and retrieve pipeline detection results as JSON files.

## Structure

```text
app/storage/
├── schemas.py
├── repository.py
├── service.py
└── __init__.py
```

## Storage

Records are saved to `data/detections/{uuid}.json` by default.

## Status

- [x] File-based detection repository
- [x] List/search/get helpers for stored records
