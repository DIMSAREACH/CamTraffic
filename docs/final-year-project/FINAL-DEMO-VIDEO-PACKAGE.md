# Final Demo Video Package

**Task 409** · CamTraffic Final Year Project  
**Updated:** 2026-07-12

---

## 1. Package contents

| Item | Path | Purpose |
|------|------|---------|
| Demo script (7 scenes) | `DEMO-SCRIPT.md` | Shot-by-shot narration |
| Presentation slides | `PRESENTATION-SLIDES.md` | Intro/outro slides |
| Live setup validation | `LIVE-DEMO-SETUP-VALIDATION.md` | Pre-recording checks |
| Integration report | `INTEGRATION-VALIDATION-REPORT.md` | Pipeline evidence |
| AI evaluation | `AI-ACCURACY-EVALUATION.md` | Metrics for voiceover |
| API examples | `api-examples/` | Optional terminal B-roll |
| Training visuals | `ai/runs/detect/dataset_10_train/*.png` | B-roll inserts |

**Output file (student-produced):** `CamTraffic-Demo-2026.mp4` — store locally or in `docs/final-year-project/video/` (gitignored if large)

---

## 2. Shot list (7 scenes — 10–15 min total)

| Scene | Duration | Visual | Narration key points |
|-------|----------|--------|----------------------|
| 1 Title + overview | 1:00 | Architecture diagram slide | Project title, problem, 3 roles |
| 2 Admin dashboard | 1:30 | Screen record :5174 | KPIs, live camera status |
| 3 Camera AI detect | 2:00 | Cameras page → detect click | Frame refresh, detection overlay |
| 4 AI upload demo | 2:00 | AI Detection upload | Sign class, confidence, Khmer label |
| 5 Violation + fine | 2:30 | Officer portal flow | Rule match, confirm, issue fine |
| 6 Driver portal | 2:00 | Driver login, fines, bell | Transparency, pay demo, notification |
| 7 Metrics + outro | 1:30 | PR curve PNG + slide 15 | mAP 0.908, thank you |

---

## 3. Recording settings

| Setting | Value |
|---------|-------|
| Resolution | 1920×1080 |
| Frame rate | 30 fps |
| Codec | H.264 (MP4) |
| Audio | External mic preferred; minimize keyboard noise |
| Browser | Chrome or Edge — zoom 100%, hide bookmarks bar |
| Cursor | Large pointer; pause before clicks |

**Tools:** OBS Studio, Windows Xbox Game Bar (Win+G), or Camtasia

---

## 4. Pre-recording checklist

- [ ] `LIVE-DEMO-SETUP-VALIDATION.md` all items PASS
- [ ] `python manage.py test tests.test_e2e_pipeline -v 2` passes
- [ ] Demo camera images in `frontend-admin/public/demo-cameras/` (if used)
- [ ] `AI_USE_MOCK=False` in backend `.env`
- [ ] Close unrelated tabs and notifications
- [ ] Seed data fresh — known violations/fines state
- [ ] Test image ready (NO_ENTRY or M_STOP sample)

---

## 5. Post-production

| Step | Action |
|------|--------|
| Trim | Remove long waits (>3s loading) |
| Titles | Add lower-third: "Scene 3 — AI Detection" |
| Inserts | PR curve, confusion matrix for Scene 7 |
| Audio | Normalize levels; add light background music (optional, low volume) |
| Export | MP4 H.264, ≤ 500 MB for upload |
| Backup | Copy to USB + cloud drive |

---

## 6. Backup usage at defense

| Scenario | Action |
|----------|--------|
| Live demo fails | Play full video from USB |
| Partial failure | Play Scenes 3–6 only |
| No projector | Offer video on laptop to panel after session |

---

## 7. Test credentials

Use seeded accounts from `python manage.py seed_data` — store passwords in local notes only. **Never commit credentials to git.**

---

## 8. Deliverable sign-off

| Item | Done | Date |
|------|:----:|------|
| Raw recording captured | ⬜ | |
| Edited MP4 exported | ⬜ | |
| Backup on USB | ⬜ | |
| Tested playback on defense laptop | ⬜ | |

---

*Demo video package — Phase 16 Task 409*
