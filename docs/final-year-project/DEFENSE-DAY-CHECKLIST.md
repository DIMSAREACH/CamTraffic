# Defense Day Checklist

**Task 414** · CamTraffic Final Year Project  
**Defense date:** _______________ · **Time:** _______________ · **Venue:** _______________

---

## T-1 day (day before)

### Environment

- [ ] Run full `LIVE-DEMO-SETUP-VALIDATION.md` checklist
- [ ] `npm run test:e2e` — all 4 tests PASS
- [ ] AI detect test with sample image — real inference (not mock)
- [ ] Demo accounts login verified (admin → `/admin`, officer → `/officer`, driver → `/citizen`)
- [ ] Laptop OS updates deferred (no restart surprises)

### Materials

- [ ] `CAMTRAFFIC-FINAL-PRESENTATION.pptx` copied to laptop
- [ ] Backup video on USB (`FINAL-DEMO-VIDEO-PACKAGE.md`)
- [ ] Printed `DEMO-SCRIPT.md` (optional)
- [ ] Printed `DEFENSE-PREPARATION.md` Q&A sheet (optional)
- [ ] Thesis PDF on laptop / USB
- [ ] Student ID / faculty forms

### Physical

- [ ] Charger packed
- [ ] HDMI / USB-C adapter packed
- [ ] USB hub if needed
- [ ] Phone on silent plan confirmed

---

## T-0 morning (defense day)

### Before leaving

- [ ] Laptop fully charged
- [ ] Close unnecessary apps (Slack, game launchers)
- [ ] Disable Windows notifications (Focus Assist)
- [ ] Browser bookmarks: localhost:5173, :5174, :8000/health/

### Arrive early (30 min before)

- [ ] Test projector connection
- [ ] Set display mirroring / extend mode
- [ ] Open presentation in slide show mode — test clicker
- [ ] Start backend: `python manage.py runserver`
- [ ] Start frontends: `npm run dev`
- [ ] Quick login test (one account each role)

---

## Presentation sequence

| # | Segment | Duration | Start time | Done |
|---|---------|----------|------------|:----:|
| 1 | Greeting + title slide | 1 min | | ⬜ |
| 2 | Slides 2–14 (content) | 14 min | | ⬜ |
| 3 | Live demo (7 scenes) | 12 min | | ⬜ |
| 4 | Closing slide + Q&A | 15+ min | | ⬜ |

**Timer set for:** 15 min presentation · 12 min demo

---

## Demo quick-reference

| Scene | URL | Account |
|-------|-----|---------|
| Admin | http://localhost:5174 | admin |
| Officer | http://localhost:5173 Officer tab | police |
| Driver | http://localhost:5173 Driver tab | driver |

**Emergency fallback:** Play backup video · Show PR curve PNG · Walk through slides 7–9

---

## During Q&A

- [ ] Listen fully before answering
- [ ] Say "I don't know, but here's how I'd find out" when appropriate
- [ ] Refer to thesis chapter / UAT report for evidence
- [ ] Stay calm if demo already finished successfully

---

## After defense

- [ ] Note all panel feedback immediately (`POST-DEFENSE-REVISIONS.md`)
- [ ] Thank supervisor and panel
- [ ] Stop dev servers to free resources
- [ ] Backup any panel-requested code changes

---

## Emergency contacts

| Role | Name | Contact |
|------|------|---------|
| Supervisor | | |
| Faculty admin | | |
| Technical support | | |

---

## Sign-off

| Item | Student | Time |
|------|:-------:|------|
| Pre-defense checklist complete | ⬜ | |
| Defense completed | ⬜ | |
| Feedback captured | ⬜ | |

---

*Defense day checklist — Phase 16 Task 414*
