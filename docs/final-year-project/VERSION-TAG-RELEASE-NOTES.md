# Version Tag & Release Notes — v1.0.0

**Task 421** · CamTraffic Final Year Project  
**Tag:** `v1.0.0` · **Date:** 2026-07-12  
**Codename:** Thesis Release

---

## Release summary

First stable release marking completion of Phases 0–17 (440/440 checklist tasks). Suitable for final-year project submission, defense demonstration, and examiner review.

---

## Tag instructions

```bash
git tag -a v1.0.0 -m "CamTraffic v1.0.0 — Thesis release (Phases 0–17)"
# Push only when user explicitly requests:
# git push origin v1.0.0
```

---

## What's included in v1.0.0

### Application

- Django REST API — 16 apps, ~120 endpoints  
- Admin portal (React 19 + Vite)  
- User portal — officer + driver roles  
- YOLO11n 10-class sign detection (`best_v2.pt` — distribute separately)  
- EasyOCR plate pipeline  
- Violations, fines, appeals, notifications  
- JWT + RBAC + audit logging  

### DevOps

- Docker Compose production stack (8 services)  
- GitHub Actions CI  
- Deploy scripts for Ubuntu VPS  
- PostgreSQL backup automation  

### Documentation

- 7 thesis chapters (FINAL)  
- 15-slide defense presentation + PPTX  
- UAT, performance, AI evaluation reports  
- Installation, user, developer, maintenance guides  

### Testing

- Backend phase12 test suite  
- Frontend Vitest  
- Playwright E2E (4/4 PASS)  

---

## AI model metrics (bundled separately)

| Metric | Value |
|--------|------:|
| mAP@50 | 0.908 |
| mAP@50-95 | 0.796 |
| CPU FPS | ~20 |

Weights path: `ai/weights/best_v2.pt` (not in git — see release assets)

---

## Breaking changes

None — initial public thesis release.

---

## Known limitations

- 10-class production model (31-class taxonomy documented for future)  
- OCR exact-match rate 0% without domain training  
- Demo payment flow (no real gateway)  
- Phase 18 enterprise UI redesign — removed from scope (existing shared UI retained)

---

## Upgrade path

| Version | Focus |
|---------|-------|
| v1.1.0 | 31-class model, OCR fine-tune |
| v1.2.0 | Payment gateway, SMS notifications |
| v2.0.0 | Mobile app, edge RTSP at scale |

---

## Checklist progress at release

**440 / 440 tasks** — Phases 0–17 complete

---

## Contributors

- [Your Name] — primary developer  
- [Supervisor Name] — academic supervision  

---

*Version tag release notes — Phase 17 Task 421*
