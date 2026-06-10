# Hybrid Sign Detection Flow (reference)

This diagram describes how CamTraffic processes sign images. It is **documentation only** — not shown in the app UI.

## Flow

```
Webcam / Upload Image
        ↓
     YOLOv8
        ↓
   Known sign?
     /      \
   Yes       No
    ↓         ↓
Local DB   Gemini Vision
    ↓         ↓
 Sign Info  AI Explanation
      \      /
       ↓
  Final Result
```

## Decision rules

| Input | YOLO confidence | Path | `detection_engine` |
|-------|-----------------|------|-------------------|
| Upload | ≥ 70% (default) | Local DB + catalog | `yolo`, `hash`, `filename` |
| Upload | &lt; 70% | Gemini Vision (if configured) | `gemini` |
| Webcam | ≥ live floor (10%) | YOLO only (Gemini skipped) | `yolo` |
| Webcam | below floor | No sign | `none` |
| Any | exact image hash match | Catalog | `hash` |

## Settings

- `AI_HYBRID_CONFIDENCE_THRESHOLD` — upload threshold for “known sign” (default **70**)
- `AI_LIVE_YOLO_FLOOR` — minimum YOLO % for webcam (default **10**)
- `GEMINI_API_KEY` + `GEMINI_ENABLED` — enable Gemini fallback on upload

## Code

- `backend/ai_detection/services.py` — `_run_hybrid_detection()`, `detect_traffic_sign()`
- `backend/ai_detection/gemini_service.py` — Gemini fallback
- API field: `detection_engine` on detect response
