# OCR Service (FastAPI)

Standalone ANPR/OCR microservice for Cambodian license plates.

## Quick start

```bash
cd services/ocr-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
set OCR_MOCK_MODE=true
uvicorn app.main:app --reload --port 8081
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ocr/read/` | OCR plate crop image |
| POST | `/api/v1/ocr/read-frame/` | OCR full frame + optional vehicle bboxes |
| GET | `/health/ready/` | Readiness probe |

## Docker

```bash
docker compose up ocr -d --build
curl http://localhost:8081/health/
```

## Integration

**ai-vision-service** — set `OCR_SERVICE_URL=http://localhost:8081`

**Django backend** — set `OCR_SERVICE_URL=http://localhost:8081` in `backend/.env`

When set, plate OCR is delegated to this service with automatic fallback to embedded EasyOCR.
