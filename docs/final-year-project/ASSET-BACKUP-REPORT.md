# Asset Backup Report

**Task 423** · CamTraffic Final Year Project  
**Date:** 2026-07-12

---

## 1. Backup scope

All project assets required to reproduce the thesis submission, defense demo, and production deployment.

---

## 2. Asset inventory

| Asset | Location | Size (est.) | Backed up |
|-------|----------|------------:|:---------:|
| Source code | Git repository | ~100 MB | ✅ GitHub |
| AI weights | `ai/weights/best_v2.pt` | ~6 MB | ⬜ Local + release |
| Training runs | `ai/runs/detect/dataset_10_train/` | ~50 MB | ⬜ Local ZIP |
| Dataset (10-class) | `ai/dataset_10/` | Variable | ⬜ External drive |
| Full dataset | `ai/dataset/` | Large | ⬜ External drive |
| SQLite dev DB | `backend/db.sqlite3` | ~5 MB | ⬜ Optional |
| Media uploads | `backend/media/` | Variable | ⬜ Admin backup API |
| Thesis Markdown | `docs/final-year-project/thesis/` | ~1 MB | ✅ Git |
| Thesis PDF | Student export | ~5 MB | ⬜ Faculty + cloud |
| Presentation PPTX | `CAMTRAFFIC-FINAL-PRESENTATION.pptx` | ~100 KB | ✅ Git |
| Demo video | Student recording | ~200 MB | ⬜ USB + cloud |
| Env templates | `*.env.example` | < 10 KB | ✅ Git |

---

## 3. Backup methods

### 3.1 Git (code + docs)

```bash
git push origin main
git push origin v1.0.0   # when tagged
```

### 3.2 Admin system backup (runtime data)

```bash
# Via API (admin token)
GET /api/dashboard/admin/backup/
```

Or Django command if available:

```bash
cd backend && python manage.py backup_system
```

### 3.3 PostgreSQL (production)

```bash
bash deploy/scripts/backup_postgres.sh
bash deploy/scripts/install_backup_cron.sh   # automated
```

See: `deploy/env/BACKUP.md`

### 3.4 Manual asset archive

```powershell
# Example: weights + training artifacts
Compress-Archive -Path ai/weights/best_v2.pt, ai/runs/detect/dataset_10_train `
  -DestinationPath CamTraffic-AI-Assets-2026.zip
```

---

## 4. Recommended backup locations

| Location | Contents | Retention |
|----------|----------|-----------|
| GitHub | Code, docs, PPTX | Permanent |
| External HDD | Weights, dataset, video | 5 years |
| Google Drive / OneDrive | Thesis PDF, demo video | 5 years |
| University portal | Official thesis submission | Permanent |
| USB (defense day) | Demo video + PPTX backup | Until graduation |

---

## 5. Recovery procedure

| Loss scenario | Restore from |
|---------------|--------------|
| Laptop failure | `git clone` + restore weights ZIP |
| Database corrupt | Admin backup ZIP or `seed_data` |
| Weights missing | Release asset `camtraffic-best_v2.pt.zip` |
| Full disaster | GitHub + external HDD archive |

---

## 6. Backup verification log

| Date | Action | Verified | By |
|------|--------|:--------:|-----|
| 2026-07-12 | Git repo push status checked | ⬜ | |
| 2026-07-12 | Weights ZIP created | ⬜ | |
| 2026-07-12 | Thesis PDF saved | ⬜ | |
| 2026-07-12 | Demo video copied to USB | ⬜ | |
| 2026-07-12 | Admin backup tested | ⬜ | |

---

## 7. Sign-off

| Item | Status |
|------|:------:|
| Backup inventory complete | ✅ |
| Procedures documented | ✅ |
| Student executed physical backups | ⬜ |

---

*Asset backup report — Phase 17 Task 423*
