"""Per-camera RTSP ingest workers."""

from __future__ import annotations

import logging
import tempfile
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np

from app.config import settings
from app.schemas import StreamStatus
from app.services.redis_queue import publish_frame_event
from app.services.vision_client import detect_frame

logger = logging.getLogger(__name__)


@dataclass
class StreamSession:
    camera_id: str
    rtsp_url: str
    fps_target: int
    status: str = "starting"
    frame_count: int = 0
    fps_actual: float = 0.0
    last_frame_at: datetime | None = None
    last_error: str | None = None
    mock_mode: bool = False
    _stop_event: threading.Event = field(default_factory=threading.Event)
    _thread: threading.Thread | None = None
    _latest_jpeg: bytes | None = None
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def to_status(self) -> StreamStatus:
        return StreamStatus(
            camera_id=self.camera_id,
            status=self.status,
            rtsp_url=self.rtsp_url,
            fps_target=self.fps_target,
            fps_actual=round(self.fps_actual, 2),
            frame_count=self.frame_count,
            last_frame_at=self.last_frame_at.isoformat() if self.last_frame_at else None,
            last_error=self.last_error,
            mock_mode=self.mock_mode,
        )

    def latest_jpeg(self) -> bytes | None:
        with self._lock:
            return self._latest_jpeg

    def _store_frame(self, frame: np.ndarray) -> None:
        ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if not ok:
            return
        with self._lock:
            self._latest_jpeg = encoded.tobytes()
        self.frame_count += 1
        self.last_frame_at = datetime.now(timezone.utc)

    def _run_mock_loop(self) -> None:
        self.status = "online"
        self.mock_mode = True
        interval = 1.0 / max(self.fps_target, 1)
        blank = np.zeros((720, 1280, 3), dtype=np.uint8)
        cv2.putText(
            blank,
            f"MOCK {self.camera_id}",
            (40, 80),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.2,
            (255, 255, 255),
            2,
        )
        started = time.perf_counter()
        while not self._stop_event.is_set():
            loop_start = time.perf_counter()
            self._store_frame(blank)
            elapsed = max(time.perf_counter() - started, 0.001)
            self.fps_actual = self.frame_count / elapsed
            publish_frame_event(self.camera_id, frame_count=self.frame_count, fps_actual=self.fps_actual)
            if (
                settings.stream_auto_detect
                and self.frame_count % max(settings.stream_process_every_n, 1) == 0
            ):
                self._maybe_detect()
            sleep_for = interval - (time.perf_counter() - loop_start)
            if sleep_for > 0:
                self._stop_event.wait(sleep_for)
        self.status = "stopped"

    def _run_rtsp_loop(self) -> None:
        cap = cv2.VideoCapture(self.rtsp_url)
        if not cap.isOpened():
            self.status = "error"
            self.last_error = f"Failed to open stream: {self.rtsp_url}"
            return

        self.status = "online"
        interval = 1.0 / max(self.fps_target, 1)
        started = time.perf_counter()
        while not self._stop_event.is_set():
            loop_start = time.perf_counter()
            ok, frame = cap.read()
            if not ok or frame is None:
                self.last_error = "Frame read failed"
                self._stop_event.wait(1.0)
                continue
            self.last_error = None
            self._store_frame(frame)
            elapsed = max(time.perf_counter() - started, 0.001)
            self.fps_actual = self.frame_count / elapsed
            publish_frame_event(self.camera_id, frame_count=self.frame_count, fps_actual=self.fps_actual)
            if (
                settings.stream_auto_detect
                and self.frame_count % max(settings.stream_process_every_n, 1) == 0
            ):
                self._maybe_detect()
            sleep_for = interval - (time.perf_counter() - loop_start)
            if sleep_for > 0:
                self._stop_event.wait(sleep_for)
        cap.release()
        self.status = "stopped"

    def _maybe_detect(self) -> None:
        jpeg = self.latest_jpeg()
        if not jpeg:
            return
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(jpeg)
            path = Path(tmp.name)
        try:
            detect_frame(path, self.camera_id)
        finally:
            path.unlink(missing_ok=True)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        target = self._run_mock_loop if settings.stream_mock_mode else self._run_rtsp_loop
        self._thread = threading.Thread(target=target, name=f"stream-{self.camera_id}", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
        self.status = "stopped"


class StreamManager:
    def __init__(self) -> None:
        self._sessions: dict[str, StreamSession] = {}
        self._lock = threading.Lock()

    def start_stream(self, camera_id: str, rtsp_url: str, fps: int | None = None) -> StreamSession:
        fps_target = fps or settings.stream_default_fps
        with self._lock:
            existing = self._sessions.get(camera_id)
            if existing and existing.status in {"online", "starting"}:
                existing.stop()
            session = StreamSession(camera_id=camera_id, rtsp_url=rtsp_url, fps_target=fps_target)
            self._sessions[camera_id] = session
            session.start()
            return session

    def stop_stream(self, camera_id: str) -> StreamStatus | None:
        with self._lock:
            session = self._sessions.get(camera_id)
            if not session:
                return None
            session.stop()
            return session.to_status()

    def get_status(self, camera_id: str) -> StreamStatus | None:
        session = self._sessions.get(camera_id)
        if not session:
            return None
        return session.to_status()

    def list_statuses(self) -> list[StreamStatus]:
        return [session.to_status() for session in self._sessions.values()]

    def capture_snapshot(self, camera_id: str, rtsp_url: str | None = None) -> bytes | None:
        session = self._sessions.get(camera_id)
        if session:
            jpeg = session.latest_jpeg()
            if jpeg:
                return jpeg

        url = (rtsp_url or "").strip()
        if not url:
            return None

        if settings.stream_mock_mode:
            blank = np.zeros((720, 1280, 3), dtype=np.uint8)
            cv2.putText(blank, f"SNAPSHOT {camera_id}", (40, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
            ok, encoded = cv2.imencode(".jpg", blank)
            return encoded.tobytes() if ok else None

        cap = cv2.VideoCapture(url)
        if not cap.isOpened():
            return None
        ok, frame = cap.read()
        cap.release()
        if not ok or frame is None:
            return None
        ok, encoded = cv2.imencode(".jpg", frame)
        return encoded.tobytes() if ok else None


stream_manager = StreamManager()
