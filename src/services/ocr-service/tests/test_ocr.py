"""Tests for ocr-service."""

import os

from fastapi.testclient import TestClient

os.environ.setdefault("OCR_MOCK_MODE", "true")

from app.main import app  # noqa: E402

client = TestClient(app)


def test_liveness():
    response = client.get("/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_read_frame_mock():
    jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9"
    response = client.post(
        "/api/v1/ocr/read-frame/",
        files={"image": ("test.jpg", jpeg, "image/jpeg")},
        data={"vehicles": "[]"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["plate_text"] == "2A-1234"
    assert body["data"]["mock_mode"] is True
