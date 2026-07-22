# Stream Gateway (FastAPI)

RTSP camera ingest, Redis frame events, and optional AI vision dispatch.

## Quick start

```bash
cd services/stream-gateway
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
set STREAM_MOCK_MODE=true
set REDIS_URL=redis://127.0.0.1:6379/2
uvicorn app.main:app --reload --port 8082
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/streams/cameras/{id}/start/` | Start RTSP ingest |
| POST | `/api/v1/streams/cameras/{id}/stop/` | Stop ingest |
| GET | `/api/v1/streams/cameras/{id}/status/` | Stream health/FPS |
| GET | `/api/v1/streams/cameras/{id}/snapshot/` | Latest JPEG frame |
| GET | `/health/ready/` | Readiness (Redis) |

## Docker

```bash
docker compose up stream-gateway redis -d --build
curl http://localhost:8082/health/
```

## Django integration

Set in `backend/.env`:

```
STREAM_GATEWAY_URL=http://localhost:8082
```

Frame capture and `ProcessFrameView` will use the gateway snapshot API when configured.

## Auto AI dispatch

Set `STREAM_AUTO_DETECT=true` and `AI_VISION_SERVICE_URL` to forward every Nth frame to ai-vision-service.
