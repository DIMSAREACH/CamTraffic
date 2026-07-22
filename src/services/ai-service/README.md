# CamTraffic AI Service

Standalone FastAPI inference microservice for the thesis architecture (`ai_service/`).

## Modules

| File | Role |
|------|------|
| `model_loader.py` | Lazy YOLOv8 weight loading |
| `detector.py` | Traffic signs + vehicles |
| `plate_detector.py` | Plate ROI detection |
| `ocr_engine.py` | EasyOCR plate text |
| `violation_engine.py` | Rule → violation suggestions |
| `stream_processor.py` | Image / video / webcam / IP camera |
| `api.py` | FastAPI HTTP endpoints |

## Classes (Cambodia thesis)

**Signs:** stop, speed_limit_20/40/60/80, no_entry, no_parking, turn_left, turn_right, u_turn, pedestrian_crossing, traffic_light, school_zone, one_way

**Vehicles:** motorcycle, car, bus, truck, tuk_tuk

## Run locally

```bash
cd ai_service
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# For CI / no GPU weights:
set AI_MOCK_MODE=true
uvicorn api:app --host 0.0.0.0 --port 8090
```

Docs: http://localhost:8090/docs

## Test

```bash
cd ai_service
set AI_MOCK_MODE=true
python -m pytest tests/ -q
```

## Example requests

```bash
curl http://localhost:8090/health

curl -X POST http://localhost:8090/detect/image \
  -F "file=@sample.jpg"

curl -X POST http://localhost:8090/detect/live \
  -H "Content-Type: application/json" \
  -d "{\"stream_url\":\"rtsp://user:pass@192.168.1.10:554/stream\",\"frames\":3}"
```

## Django integration

Set in `backend/.env`:

```
AI_SERVICE_URL=http://127.0.0.1:8090
```

Django remains the system of record (violations, fines, audit). This service only returns detections + suggestions. Officers must approve before fines are issued.
