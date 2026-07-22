# AI Vision Service (FastAPI)

Enterprise v2 microservice for YOLOv11 sign/vehicle detection and EasyOCR plate recognition.

Part of the [Enterprise v2 migration](../../docs/enterprise/IMPLEMENTATION-ROADMAP.md).

## Quick start

```bash
cd services/ai-vision-service
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env
set AI_MOCK_MODE=true          # No GPU/weights required
uvicorn app.main:app --reload --port 8080
```

Open http://localhost:8080/docs for Swagger UI.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health/` | Liveness |
| GET | `/health/ready/` | Readiness (model loaded) |
| POST | `/api/v1/ai/detect/` | Image detection |
| GET | `/api/v1/ai/health/` | AI-specific health |

## Docker

From repo root:

```bash
docker compose up ai-vision -d --build
curl http://localhost:8080/health/
```

## Environment

See `.env.example`. Key variables:

- `AI_MOCK_MODE=true` — demo responses without YOLO weights
- `AI_WEIGHTS_PATH` — path to `best.pt`
- `AI_OCR_ENABLED` — toggle EasyOCR

## Integration with Django

Set in `backend/.env`:

```
AI_VISION_SERVICE_URL=http://localhost:8080
```

When set, `run_detection_pipeline()` proxies to the FastAPI service (with automatic fallback to the embedded Django pipeline if the service is unreachable). The officer portal `/api/ai/detect/` endpoint works unchanged.

## Related

- [Enterprise OpenAPI](../../docs/enterprise/openapi.yaml)
- [System Architecture](../../docs/enterprise/03-SYSTEM-ARCHITECTURE.md)
