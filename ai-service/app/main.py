from fastapi import FastAPI

from app.api import router as history_router
from app.detection import router as detection_router
from app.health import router as health_router
from app.metrics import router as metrics_router
from app.ocr import router as ocr_router
from app.pipeline import router as pipeline_router
from app.processing import router as processing_router

app = FastAPI(
    title='CamTraffic AI Service',
    description='YOLOv11 + OpenCV + EasyOCR detection pipeline',
    version='0.1.0',
)

app.include_router(health_router)
app.include_router(detection_router)
app.include_router(processing_router)
app.include_router(ocr_router)
app.include_router(pipeline_router)
app.include_router(metrics_router)
app.include_router(history_router)
