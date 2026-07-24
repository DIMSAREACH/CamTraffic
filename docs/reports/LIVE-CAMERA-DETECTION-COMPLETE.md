# Live Camera Detection — Production Ready

Live Camera (infrastructure CCTV) in **AI Detection** now runs the same **street full-frame** pipeline as Webcam Street / Video Upload: Cambodia vehicle YOLO → plate boxes → optional OCR → annotated preview.

## What was fixed

| Gap | Fix |
|-----|-----|
| Demo frame paths resolved under old `frontend-*/public` | `frame_capture.resolve_local_frame_path` → `src/web/admin|user/public` + `MEDIA_ROOT/demo-cameras` |
| Live loop forced `sign_only` (no vehicles/plates) | `ProcessFrameView` always sets `full_frame=true`; capture filename `webcam-street-camera-*` |
| Silent live scan returned no annotated still | Skip-persist path draws vehicle/plate/sign overlays as data-URL |
| Camera Feeds “AI Detect” used browser `detectFromImageUrl` | Uses `POST /api/detection/live/` via `camerasAPI.processFrame` (server capture) |
| Postgres `cameras` had extra NOT NULL columns | Model + migration `0007` aligned; DB defaults set |
| Empty camera seed | `python manage.py seed_cameras --fix` upserts CAM-PP-001 / CAM-KD-001 demos |
| Demo JPEGs were non-Cambodia stock | Replaced with **clean frames** from Phnom Penh `.webm` (Chaktomuk + riverside) — see `ai/datasets/samples/live_camera_frames/` |

## How to use

1. Seed / refresh demo CCTV:
   ```bash
   cd src/backend
   python manage.py seed_cameras --fix --sync-media
   ```
2. Open **AI Detection → Live Camera** → select **Monivong Intersection Cam A** → **Connect**.
3. Live loop: vehicles/plates boxes every 2–5s (OCR off for speed).
4. **Run Detection** / Auto-save: OCR on + log persist.
5. Or use **Camera Feeds** → **AI Detect** on a selected camera (same server capture API).

## Production CCTV

Set each camera’s `frame_source_url` to one of:

- **HTTP/HTTPS snapshot** (preferred): `https://cctv.example/snap.jpg`
- **RTSP**: `rtsp://user:pass@host:554/stream`  
  - Optional: set `STREAM_GATEWAY_URL` (see `.env.example`) for gateway snapshots  
  - Or OpenCV direct grab when gateway is empty
- **Local thesis fallback**: `/demo-cameras/monivong-intersection.jpg`

Legacy rows may store URL in `rtsp_url`; capture uses `Camera.effective_frame_url()`.

## Smoke test

```bash
cd src/backend
python scripts/test_live_camera_detection.py
```

Verified (2026-07-23):

- Path resolve: 3/3 demo JPEGs OK  
- **CAM-PP-001**: 8 vehicles (max conf ~74.8%)  
- **CAM-KD-001**: 1 vehicle  
- Annotated outputs: `ai/datasets/samples/live_camera_detect/`

## API

`POST /api/detection/live/`

- `camera_id` (required if no image file)
- `full_frame=true` (forced by server for camera_id)
- `live_scan=true` + `save_log=false` → preview only + annotated data-URL  
- `enable_ocr=true` on Scan & Save / auto-save

## Files touched

- `src/backend/ai_detection/frame_capture.py`
- `src/backend/ai_detection/views.py` (`ProcessFrameView`, live annotated preview)
- `src/backend/infrastructure/models.py` + `migrations/0007_…`
- `src/backend/infrastructure/management/commands/seed_cameras.py`
- `src/web/{admin,user}/shared/components/ai/center/LiveCameraDetectionPanel.tsx`
- `src/web/{admin,user}/shared/pages/CamerasPage.tsx`
- `src/backend/scripts/test_live_camera_detection.py`
