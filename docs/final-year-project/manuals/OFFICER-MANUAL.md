# Officer Manual

Task: 376
Last Updated: 2026-07-10

## 1. Access

- Portal: `https://app.camtraffic.kh`
- Role: `officer`

## 2. Core Workflows

1. Login and open officer dashboard.
2. Submit or review camera detections.
3. Open violation review queue.
4. Approve or reject violations with notes.
5. Track notifications and mark read.
6. Export station-specific reports.

## 3. Evidence and Visual References

- Workflow coverage: `docs/final-year-project/DEMO-SCRIPT.md`
- End-to-end validation: `docs/final-year-project/INTEGRATION-VALIDATION-REPORT.md`
- User-facing process details: `docs/USER-MANUAL.md` (Part 2)

## 4. Troubleshooting

- If no detections appear, verify AI service health `/health` and camera status.
- If a violation cannot be approved, verify required fields and evidence linkage.
- If notifications are delayed, verify Redis/Celery service health.

## 5. Related Docs

- `docs/final-year-project/UAT-REPORT.md`
- `docs/final-year-project/TESTING-QA-VALIDATION-REPORT.md`
