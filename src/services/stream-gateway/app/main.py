"""CamTraffic Stream Gateway — RTSP ingest and frame dispatch."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, streams

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="CamTraffic Stream Gateway",
    version="2.0.0",
    description="RTSP camera ingest, frame queue, and AI dispatch",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(streams.router)


@app.get("/")
async def root():
    return {
        "service": "stream-gateway",
        "version": "2.0.0",
        "docs": "/docs",
        "mock_mode": settings.stream_mock_mode,
    }
