"""Tests for stream-gateway."""

import os
import time

from fastapi.testclient import TestClient

os.environ.setdefault("STREAM_MOCK_MODE", "true")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:6379/15")

from app.main import app  # noqa: E402

client = TestClient(app)


def test_liveness():
    response = client.get("/health/")
    assert response.status_code == 200


def test_start_stop_mock_stream():
    camera_id = "cam-test-001"
    start = client.post(
        f"/api/v1/streams/cameras/{camera_id}/start/",
        json={
            "camera_id": camera_id,
            "rtsp_url": "rtsp://mock/example",
            "fps": 5,
        },
    )
    assert start.status_code == 200
    assert start.json()["success"] is True

    time.sleep(0.3)
    status = client.get(f"/api/v1/streams/cameras/{camera_id}/status/")
    assert status.status_code == 200
    body = status.json()
    assert body["data"]["status"] in {"online", "starting"}

    snapshot = client.get(f"/api/v1/streams/cameras/{camera_id}/snapshot/")
    assert snapshot.status_code == 200
    assert snapshot.headers["content-type"] == "image/jpeg"
    assert len(snapshot.content) > 100

    stop = client.post(f"/api/v1/streams/cameras/{camera_id}/stop/")
    assert stop.status_code == 200
