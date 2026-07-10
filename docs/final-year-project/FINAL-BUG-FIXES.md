# Final Bug Fixes

**Task 156 — Final Year Project**
**Date**: 2026-07

---

## 1. Known Issues Resolved

| # | Issue | Severity | Resolution | Status |
|---|-------|----------|-----------|--------|
| BUG-01 | `validate_integration.py` failed with HTTP 422 on AI pipeline run — test image bytes were not a valid JPEG | Medium | Replaced raw bytes with `_minimal_jpeg()` function generating a real 1×1 JPEG via PIL | ✅ Fixed |
| BUG-02 | PowerShell `&&` operator not valid as statement separator in CI commit scripts | Low | Replaced `&&` with `;` throughout PowerShell commands | ✅ Fixed |
| BUG-03 | `AI_YOLO_WEIGHTS` default mismatch between `ai-service/app/config.py` and `ai-service/.env.example` | Low | Aligned both to `yolov11_camtraffic_v1.pt` | ✅ Fixed |
| BUG-04 | `detection/constants.py` only mapped 5 classes; remaining 26 classes unmapped | Medium | Expanded `SIGN_CODE_BY_CLASS` to all 31 classes; added `VEHICLE_CLASS_NAMES` and `PLATE_CLASS_NAMES` | ✅ Fixed |
| BUG-05 | OCR manifest auto-transcriptions had high CER (0.663) — transcriptions not manually verified | High (data quality) | Documented in evaluation report; manual QC required before production fine-tuning | ⚠️ Deferred |
| BUG-06 | `ai-service/runs/detect/` directory missing from `.gitignore` — large weight files risked accidental commit | Medium | Added `runs/detect/*/weights/*.pt` pattern to `.gitignore` | ✅ Fixed |
| BUG-07 | `backend/apps/integration/views.py` SSE stream had no `camera_id` validation before polling | Low | Added `camera_id` filter support with graceful handling when camera does not exist | ✅ Fixed |

---

## 2. Outstanding Issues (Deferred to v2)

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| DEFER-01 | RTSP live stream reader not implemented | Medium | Out of scope for v1; frame upload endpoint used instead |
| DEFER-02 | OCR transcription manual QC not complete | High (data) | Required before EasyOCR fine-tuning; ~454 plate crops to review |
| DEFER-03 | GPU training not run | High (AI) | CPU bootstrap only; GPU training needed for production mAP ≥ 0.80 |
| DEFER-04 | Email SMTP not configured in dev | Low | Documented in `.env.example`; requires production mail relay |
| DEFER-05 | Mobile application not developed | Low | Web-only for v1 |

---

## 3. Code Quality Checks

| Check | Tool | Status |
|-------|------|--------|
| Python lint | `flake8` / `ruff` | ✅ Clean |
| Python type hints | `mypy` (selective) | ✅ Main services typed |
| JavaScript/TypeScript lint | `ESLint` | ✅ Clean |
| Dependency audit | `pip-audit`, `npm audit` | ✅ No high-severity CVEs |
| Secret scan | `git-secrets` / manual review | ✅ No secrets in repo |

---

## 4. Final Structural Validation

```bash
npm run validate
# Expected: Structure validation PASSED.
```

All required files and directories confirmed present across all 13 phases.

---

## 5. Final Pre-Submission Checklist

- [x] All Phase 1–13 tasks marked complete in `CHECKLIST-MASTER.md`
- [x] No secrets or credentials in git history
- [x] `.env.example` files present for all services
- [x] `docker-compose.yml` builds and starts cleanly
- [x] `python manage.py migrate` and `seed_database` run without errors
- [x] AI service starts and `/health` returns 200
- [x] Integration validation script passes
- [x] All documentation files present in `docs/`
- [x] `README.md` at root provides quick-start instructions
