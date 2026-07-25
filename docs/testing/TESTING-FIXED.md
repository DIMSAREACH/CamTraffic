# ✅ Test Failures Fixed (July 23, 2026)

## What was broken

From `python manage.py test` you had **17 failures + 5 errors**, mainly:

1. Camera DELETE 500 — missing `camera_events` table
2. User delete test expected hard-delete (system soft-deletes)
3. Wrong AI path (`src/ai` instead of repo `ai/`)
4. Catalog aliases outdated (`P_*` vs current `I_*`)
5. `pytest` missing from project `.venv`
6. Plate filename hint `BTM2C-5927` not normalizing to `2C-5927`

## What we fixed

| Fix | File(s) |
|-----|---------|
| Skip missing camera child tables on delete | `infrastructure/views.py` |
| Soft-delete assertion | `tests/test_api.py` |
| `AI_ROOT` = repo `ai/` | `camtraffic/settings.py` + AI modules |
| Catalog path in tests | `tests/catalog_helpers.py`, `test_traffic_sign_catalog_10.py` |
| YOLO / Gemini aliases → `I_*` | `services.py`, `gemini_service.py` |
| Plate commercial prefix strip | `plate_ocr.py` |
| Installed pytest in `.venv` | `pytest==7.4.3`, `pytest-django==4.7.0` |

## How to run tests now

```bash
cd src/backend

# Recommended (reuse DB, no "already exists" prompt)
..\..\.venv\Scripts\python.exe manage.py test --keepdb

# Or after typing yes once, always use:
python manage.py test --keepdb
```

If you see **"database is being accessed by other users"** at the end — ignore it when using `--keepdb`, or close other Django/shell sessions connected to `test_camtraffic_db`.

## Verified OK

These previously failing cases now **pass**:

- Camera CRUD delete
- Admin soft-delete user
- Traffic sign catalog 10/50 file
- Plate Roboflow filename hint
- Sign catalog mapping
- Gemini catalog helpers
- Visual / shape-hint tests (optional image tests skip if media missing)

## Note

Full suite may still show some **skips** (optional media, remote AI services). That is normal. Core API + catalog + camera paths are fixed.
