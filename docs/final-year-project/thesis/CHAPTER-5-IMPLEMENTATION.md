# Chapter 5 - Implementation

## 5.1 Implementation Overview

CamTraffic was implemented as a monorepo to coordinate frontend, backend, AI, shared packages, tests, and deployment scripts in one source of truth.

Top-level modules:
- `frontend-admin/`
- `frontend-user/`
- `backend/`
- `ai-service/`
- `packages/`
- `tests/`
- `deploy/`

## 5.2 Frontend Implementation

Two React portals were implemented:
- Admin portal (`frontend-admin`)
- Officer/Driver portal (`frontend-user`)

### 5.2.1 Route Guard and Portal Routing

`frontend-admin/src/routes/AdminRoutes.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import App from '../App';
import { getAccessToken } from '../lib/authStorage';
import { RouteGuard } from './RouteGuard';

export function AdminRoutes() {
  const hasToken = Boolean(getAccessToken());

  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/portal/*"
        element={
          <RouteGuard isAllowed={hasToken}>
            <App />
          </RouteGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

### 5.2.2 Dashboard Data Binding

`frontend-admin/src/features/dashboard/DashboardHome.tsx` loads summary widgets via API callbacks and renders live statistics.

```tsx
useEffect(() => {
  onLoadStats()
    .then((data) => {
      setStats(data);
      setErrorMessage(null);
    })
    .catch(() => setErrorMessage(t.errors.generic));
}, [onLoadStats, t.errors.generic]);
```

## 5.3 Backend Implementation (Django + DRF)

The backend is split into domain apps for users, officers, cameras, detections, violations, fines, appeals, notifications, reports, and integration.

### 5.3.1 Integration Endpoint for Frame Processing

`backend/apps/integration/views.py` supports asynchronous and synchronous modes:

```python
sync = request.query_params.get('sync', '').lower() in ('1', 'true', 'yes')
if sync:
    result = process_camera_frame(camera_id, image_b64)
    return success_response(result)

task = process_camera_frame.delay(camera_id, image_b64)
return success_response(
    {'task_id': task.id, 'camera_id': camera_id},
    message='Frame submitted for processing.',
    status=status.HTTP_202_ACCEPTED,
)
```

### 5.3.2 SSE Live Feed

The same module provides live detection streaming through SSE:

```python
response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
response['Cache-Control'] = 'no-cache'
response['X-Accel-Buffering'] = 'no'
```

## 5.4 AI Service Implementation (FastAPI)

The AI service orchestrates preprocessing, detection, OCR, and persistence hooks.

### 5.4.1 Pipeline API Endpoints

`ai-service/app/pipeline/router.py`:

```python
@router.get('/status', response_model=PipelineStatusResponse)
async def pipeline_status() -> PipelineStatusResponse:
    return pipeline_service.status()

@router.post('/run', response_model=PipelineRunResponse)
async def run_pipeline(
    image: UploadFile = File(...),
    camera_id: str | None = Form(default=None),
    store: bool = Form(default=True),
) -> PipelineRunResponse:
    ...
```

### 5.4.2 Input Validation and Error Handling

```python
if not image.content_type or not image.content_type.startswith('image/'):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='Upload must be an image file.',
    )
```

## 5.5 Database and Persistence

PostgreSQL stores operational data and legal workflow entities. All core events are persisted:
- Detection records
- OCR results
- Violation records
- Notification records

This ensures auditability and supports reporting/UAT workflows.

## 5.6 Deployment Implementation

Production stack is defined in:
- `deploy/docker/docker-compose.prod.yml`

Operational automation scripts:
- `deploy/scripts/deploy_production.sh`
- `deploy/scripts/healthcheck_production.sh`
- `deploy/scripts/backup_postgres.sh`

## 5.7 Implementation Screenshots

Captured from deployed portal:
- `docs/assets/screenshots/admin-login.png`
- `docs/assets/screenshots/admin-dashboard.png`
- `docs/assets/screenshots/admin-cameras.png`
- `docs/assets/screenshots/admin-reports.png`
- `docs/assets/screenshots/admin-monitoring.png`

## 5.8 Summary

Implementation delivered a complete and integrated traffic enforcement platform with modular frontends, robust API backend, AI microservice orchestration, and deployment automation. The resulting system supports real-time operational workflows and provides a strong foundation for future production hardening.
