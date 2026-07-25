# Administrator Manual — CamTraffic

**Role:** System Administrator (Administration domain)  
**Portal:** http://localhost:5174 → `/admin` (dev) · `admin.<domain>` (production)  
**API namespace:** `/api/v1/admin/`  
**Task:** 375

---

## 1. Login

1. Open the admin portal URL (http://localhost:5174).
2. Enter admin email and password (demo: `admin@camtraffic.demo`).
3. You land on **`/admin/dashboard`** with KPI widgets (auto-refresh every 30 seconds).

If OAuth is enabled, Google/GitHub buttons appear on the login page.

**Scope:** Admins configure users, RBAC, cameras, AI models, reports, and audit logs.  
**Admins do not** approve AI detections or issue fines — that is the Officer domain (`/officer`).

---

## 2. Dashboard

| Widget | Shows |
|--------|-------|
| Total users | By role breakdown |
| Violations today | Count + trend |
| Fines outstanding | Amount + count |
| AI detections | Recent activity |
| Camera health | Online/offline status |

**Export:** Use **Reports** for PDF; **Analytics** for charts.

---

## 3. User management

**Navigation:** Users

| Action | Steps |
|--------|-------|
| Create user | Click **Add User** → fill email, name, role, password |
| Deactivate | User row → **Toggle Active** |
| Search | Filter by role or search email |
| Driver lookup | Users → search by license (police feature also available) |

---

## 4. Officers & stations

**Navigation:** Officers

- Create officer accounts linked to police station.
- Assign badge number and station.
- **Stations** tab: manage station name, address, contact.

---

## 5. Infrastructure

### Cameras

**Navigation:** Cameras

| Action | Steps |
|--------|-------|
| Add camera | Code, road, frame URL (RTSP snapshot or static URL) |
| Live grid | Dashboard panel or Cameras page — 5s refresh |
| Run AI detect | Select camera → **Detect** on latest frame |
| Health | Green = responding; red = timeout |

### Roads

**Navigation:** Roads — name, speed limit, district.

---

## 6. Traffic sign catalog

**Navigation:** Traffic Signs

- View 10-class Cambodian sign registry (Khmer + English).
- Add/edit sign metadata: code, category, default penalty.
- **Sign Categories** panel for grouping.

---

## 7. AI detection

**Navigation:** AI Detection

1. Upload image or select test sample.
2. Review detected class, confidence, bounding boxes.
3. Optional: enable **auto-create violation** for demo.
4. View history in **Detection Logs**.

**Model versions:** AI Models page — register weights, activate production model.

---

## 8. Violations & fines

| Page | Admin capabilities |
|------|-------------------|
| Violations | View all, filter by status, export |
| Fines | View all, override status, download PDF |
| Appeals | Review pending appeals (same as officer) |
| Unknown Vehicles | Resolve unregistered plate sightings |

---

## 9. RBAC

**Navigation:** Roles

1. Create role with descriptive name.
2. Assign permissions (read/write per module).
3. Assign roles to users via Users page.

---

## 10. System settings & backup

**Navigation:** System Settings

| Feature | Description |
|---------|-------------|
| System settings | Key-value config (demo mode, thresholds) |
| Backup | Download full ZIP backup |
| Restore | Upload backup file or select from list |
| Audit logs | All admin mutations with timestamp + actor |

**Cron backup (production):** `deploy/scripts/install_backup_cron.sh`

---

## 11. Reports & analytics

| Export | Format | Path |
|--------|--------|------|
| Admin report | PDF | Dashboard → Reports |
| Enforcement | Excel | Dashboard → Export |
| Detection logs | CSV | AI Detection → Export |

---

## 12. Troubleshooting

| Issue | Action |
|-------|--------|
| Camera offline | Verify frame URL; check nginx proxy |
| AI returns mock data | Confirm `AI_USE_MOCK=False` and weights mounted |
| Backup fails | Check disk space on `backups/` volume |
| User cannot login | Verify `is_active`; check email verified flag |

See: `docs/final-year-project/MAINTENANCE-GUIDE.md`
