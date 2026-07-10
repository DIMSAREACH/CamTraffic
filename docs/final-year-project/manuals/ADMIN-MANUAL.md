# Admin Manual

Task: 375
Last Updated: 2026-07-10

## 1. Access

- Portal: `https://admin.camtraffic.kh`
- Role: `super_admin` or `admin`

## 2. Core Workflows

1. Login with admin credentials.
2. Open dashboard and verify system cards (users, detections, cameras, violations).
3. Manage users and role assignments.
4. Manage cameras and run camera health checks.
5. Review AI model status and monitoring pages.
6. Export reports (CSV/PDF).
7. Review audit logs.

## 3. Real Screenshot References

- `docs/assets/screenshots/admin-login.png`
- `docs/assets/screenshots/admin-dashboard.png`
- `docs/assets/screenshots/admin-cameras.png`
- `docs/assets/screenshots/admin-reports.png`
- `docs/assets/screenshots/admin-monitoring.png`

## 4. Troubleshooting

- If dashboard stats do not load, verify backend health endpoint `/health/`.
- If camera status remains offline, verify RTSP URL and network connectivity.
- If report export fails, check date filters and user permissions.

## 5. Related Docs

- `docs/USER-MANUAL.md`
- `backend/docs/API.md`
- `docs/final-year-project/DEPLOYMENT-DEVOPS-VALIDATION-REPORT.md`
