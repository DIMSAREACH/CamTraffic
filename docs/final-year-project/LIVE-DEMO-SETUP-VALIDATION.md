# Live Demo Setup Validation

Task: 408
Date: 2026-07-10

## Objective

Confirm that the defense demo environment can be started reliably with seeded data and role-based accounts.

## Environment

- Workspace root: `CamTraffic`
- Runtime profile: Docker Compose full stack
- Port targets: 5173 (admin), 5174 (user), 8000 (backend), 8001 (ai-service)

## Validation Procedure

1. Start stack with `docker compose up -d`.
2. Verify containers with `docker compose ps`.
3. Check API health endpoints.
4. Seed demo data.
5. Open admin and user portals.
6. Validate demo account sign-in and core navigation.

## Evidence References

- Integration workflow: `docs/final-year-project/INTEGRATION-VALIDATION-REPORT.md`
- Testing/UAT outcomes: `docs/final-year-project/TESTING-QA-VALIDATION-REPORT.md`
- Demo narrative flow: `docs/final-year-project/DEMO-SCRIPT.md`

## Result

Demo setup checklist is documented, reproducible, and ready for defense execution.
