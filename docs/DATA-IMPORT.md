# CamTraffic — Admin Data Import

Bulk CSV / Excel import for master data. **Admin only.**

## Where

- Admin portal: **Settings → Import Data** (`/admin/import-data`)
- API prefix: `/api/imports/`

## Workflow

1. Choose type (Users, Vehicles, Traffic Signs, Cameras, Violations)
2. Download CSV or Excel template
3. Upload filled file → **Validate**
4. Preview row statuses (`ok` / `skip` / `error`)
5. **Import** valid rows only
6. Review **Import history**

## Duplicate policy

Existing unique keys are **skipped** (not overwritten):

| Type | Unique key |
|------|------------|
| Users | Email |
| Vehicles | Plate Number |
| Signs | Code |
| Cameras | Camera ID |
| Violations | Plate + date + violation type |

## RBAC

| Feature | Driver | Police | Admin |
|---------|:------:|:------:|:-----:|
| Download template | — | — | Yes |
| Validate / Import | — | — | Yes |
| View history | — | — | Yes |
| Import `role=admin` users | — | — | Super Admin only |

## API

- `GET /api/imports/types/`
- `GET /api/imports/template/?type=users&file_format=csv|xlsx`
- `POST /api/imports/validate/` — multipart `type` + `file`
- `POST /api/imports/commit/` — `{ "job_id": "..." }`
- `GET /api/imports/history/`
- `GET /api/imports/history/<id>/`

Validated jobs expire after **24 hours**.

## Notes

- Imported users without a password get a generated temporary password; use **Reset password** from Users if needed.
- Camera `Road Name` is find-or-create.
- Violations require a registered plate; optional Fine amount creates a pending fine.
- AI detections and live camera events are **not** imported here.

## Template columns

See downloaded templates. Examples:

```text
Name,Email,Phone,Role,Password
Plate Number,Vehicle Type,Owner Email,Model,Color,Year
Code,Name,Category,Description
Camera ID,Location,Road Name,RTSP URL,Status
Plate Number,Violation,Date,Fine
```
