"""Tests for ai-vision-service."""

import os
from pathlib import Path

from fastapi.testclient import TestClient

os.environ.setdefault("AI_MOCK_MODE", "true")

from app.main import app  # noqa: E402

client = TestClient(app)


def test_liveness():
    response = client.get("/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_mock_mode():
    response = client.get("/health/ready/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"


def test_detect_mock():
    # Minimal valid JPEG header bytes
    jpeg = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xd9"
    )
    response = client.post(
        "/api/v1/ai/detect/",
        files={"image": ("test.jpg", jpeg, "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["mock_mode"] is True
    assert len(body["data"]["signs"]) >= 1
