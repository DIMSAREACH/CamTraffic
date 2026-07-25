"""CamTraffic AI Vision Service — FastAPI microservice (Enterprise v2 Phase 1)."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import detect, health

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="CamTraffic AI Vision Service",
    version="2.0.0",
    description="YOLOv11 sign/vehicle detection and EasyOCR plate recognition",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(detect.router)


@app.get("/")
async def root():
    return {
        "service": "ai-vision-service",
        "version": "2.0.0",
        "docs": "/docs",
        "mock_mode": settings.ai_mock_mode,
    }
