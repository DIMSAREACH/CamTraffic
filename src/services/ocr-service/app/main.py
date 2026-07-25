"""CamTraffic OCR Service — ANPR / EasyOCR microservice."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, ocr

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="CamTraffic OCR Service",
    version="2.0.0",
    description="Cambodia license plate OCR with EasyOCR",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ocr.router)


@app.get("/")
async def root():
    return {
        "service": "ocr-service",
        "version": "2.0.0",
        "docs": "/docs",
        "mock_mode": settings.ocr_mock_mode,
    }
