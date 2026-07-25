"""Realtime video upload streaming + live camera session services."""
from __future__ import annotations

import base64
import json
import logging
import os
import tempfile
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Callable

from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

logger = logging.getLogger(__name__)

# In-memory live sessions (single-process thesis runtime; Redis optional later)
_LIVE_SESSIONS: dict[str, dict[str, Any]] = {}
_LIVE_LOCK = threading.Lock()

# Video job event queues for SSE subscribers
_VIDEO_EVENTS: dict[str, list[dict[str, Any]]] = {}
_VIDEO_LOCK = threading.Lock()


def _box_color(kind: str) -> tuple[int, int, int]:
    # BGR for OpenCV
    return {
        'sign': (255, 128, 0),       # blue-ish
        'vehicle': (0, 200, 0),     # green
        'plate': (0, 255, 255),     # yellow
        'violation': (0, 0, 255),   # red
    }.get(kind, (255, 255, 255))


def annotate_frame_bgr(frame, payload: dict) -> Any:
    """Draw colored boxes for signs/vehicles/plates on a BGR frame."""
    import cv2

    out = frame.copy()
    h, w = out.shape[:2]

    def draw(bbox, label: str, kind: str):
        if not bbox:
            return
        if isinstance(bbox, dict):
            x1, y1, x2, y2 = bbox.get('x1'), bbox.get('y1'), bbox.get('x2'), bbox.get('y2')
            # normalized 0-1
            if x1 is not None and float(x1) <= 1.5 and float(x2) <= 1.5:
                x1, x2 = float(x1) * w, float(x2) * w
                y1, y2 = float(y1) * h, float(y2) * h
            x1, y1, x2, y2 = int(x1 or 0), int(y1 or 0), int(x2 or 0), int(y2 or 0)
        elif isinstance(bbox, (list, tuple)) and len(bbox) >= 4:
            x1, y1, x2, y2 = map(int, bbox[:4])
        else:
            return
        color = _box_color(kind)
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        if label:
            cv2.putText(
                out, label[:48], (x1, max(16, y1 - 6)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA,
            )

    sign_name = payload.get('sign_name_en') or payload.get('display_title_en') or payload.get('sign_name') or ''
    conf = payload.get('display_confidence') or payload.get('confidence') or 0
    if payload.get('sign_bbox') or sign_name:
        draw(payload.get('sign_bbox'), f'{sign_name} {float(conf):.0f}%'.strip(), 'sign')

    for v in payload.get('vehicles') or []:
        label = v.get('label') or v.get('vehicle_type') or 'Vehicle'
        vc = v.get('confidence') or 0
        draw(v.get('bbox'), f'{label} {float(vc):.0f}%', 'vehicle')

    plate = payload.get('detected_plate') or ''
    pc = payload.get('plate_confidence') or 0
    if plate or payload.get('plate_bbox'):
        draw(payload.get('plate_bbox'), f'Plate {plate} {float(pc):.0f}%'.strip(), 'plate')

    ve = payload.get('violation_evaluation') or {}
    if ve.get('is_violation'):
        draw(payload.get('sign_bbox') or payload.get('plate_bbox'), ve.get('title') or 'Violation', 'violation')

    return out


def frame_to_jpeg_b64(frame) -> str:
    import cv2

    ok, buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
    if not ok:
        return ''
    return base64.b64encode(buf.tobytes()).decode('ascii')


def push_video_event(video_id: str, event: dict) -> None:
    with _VIDEO_LOCK:
        _VIDEO_EVENTS.setdefault(str(video_id), []).append(event)
        # keep memory bounded
        if len(_VIDEO_EVENTS[str(video_id)]) > 400:
            _VIDEO_EVENTS[str(video_id)] = _VIDEO_EVENTS[str(video_id)][-200:]


def pop_video_events(video_id: str, after_index: int = 0) -> tuple[list[dict], int]:
    with _VIDEO_LOCK:
        events = _VIDEO_EVENTS.get(str(video_id), [])
        chunk = events[after_index:]
        return chunk, len(events)


def materialize_field_file(field_file, *, suffix: str = '', cleanup: list[str] | None = None) -> str:
    """Return a local filesystem path for OpenCV (supports S3 / non-path storages)."""
    try:
        path = field_file.path
        if path and os.path.isfile(path):
            return path
    except (NotImplementedError, ValueError, AttributeError, OSError):
        pass
    name = getattr(field_file, 'name', '') or ''
    ext = Path(name).suffix or suffix or '.bin'
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    with field_file.open('rb') as src:
        while True:
            chunk = src.read(1024 * 1024)
            if not chunk:
                break
            tmp.write(chunk)
    tmp.close()
    if cleanup is not None:
        cleanup.append(tmp.name)
    return tmp.name


def process_video_detection_job(
    video_detection_id: str,
    *,
    max_frames: int | None = None,
    confidence: float = 0.35,
    enable_ocr: bool = True,
    observed_action: str = '',
    user=None,
) -> None:
    """Background job: sample frames → YOLO/OCR → store VideoFrame + SSE events."""
    from ai_detection.models import VideoDetection, VideoEvidence, VideoFrame
    from ai_detection.pipeline import run_detection_pipeline
    from ai_detection.video_utils import build_annotated_preview_video

    try:
        job = VideoDetection.objects.get(pk=video_detection_id)
    except VideoDetection.DoesNotExist:
        return

    job.status = 'processing'
    job.save(update_fields=['status', 'updated_at'])
    push_video_event(str(job.id), {'type': 'status', 'status': 'processing'})

    started = time.perf_counter()
    temp_paths: list[str] = []
    annotated_paths: list[str] = []

    try:
        import cv2

        if not job.original_video:
            raise ValueError('No original video on job')
        video_path = materialize_field_file(job.original_video, suffix='.mp4', cleanup=temp_paths)
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError('Could not open video')

        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0) or 25.0
        limit = max_frames or int(os.getenv('AI_VIDEO_STREAM_MAX_FRAMES', '48'))
        limit = max(2, min(120, limit))

        if total <= 0:
            indices = list(range(0, limit * 5, 5))[:limit]
            total = max(indices[-1] + 1 if indices else limit, limit)
        else:
            count = min(limit, total)
            if count == 1:
                indices = [total // 2]
            else:
                indices = [
                    min(total - 1, int(round(i * (total - 1) / (count - 1))))
                    for i in range(count)
                ]

        job.fps_original = fps
        job.total_frames = len(indices)
        job.model_name = 'YOLOv8'
        job.model_version = str(getattr(settings, 'AI_MODEL_PATH', '') or '')[-80:]
        job.observed_action = observed_action or job.observed_action
        job.save(update_fields=[
            'fps_original', 'total_frames', 'model_name', 'model_version',
            'observed_action', 'updated_at',
        ])

        best_payload: dict = {}
        best_conf = -1.0
        confidences: list[float] = []
        plates: set[str] = set()

        for i, frame_idx in enumerate(indices):
            t0 = time.perf_counter()
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ok, frame = cap.read()
            if not ok or frame is None:
                continue

            tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            tmp_path = tmp.name
            tmp.close()
            cv2.imwrite(tmp_path, frame)
            temp_paths.append(tmp_path)

            try:
                pipeline_out = run_detection_pipeline(
                    tmp_path,
                    original_filename=f'video-stream-{i}.jpg',
                    sign_only=False,
                    live_fast=True,
                    enable_ocr=enable_ocr and (i == len(indices) // 2 or i == len(indices) - 1),
                    enable_plate=enable_ocr,
                )
                payload = dict(pipeline_out.get('payload') or {})
                sign_result = pipeline_out.get('sign_result') or {}
                if sign_result.get('sign_bbox') and not payload.get('sign_bbox'):
                    payload['sign_bbox'] = sign_result.get('sign_bbox')
                if sign_result.get('class_key'):
                    payload.setdefault('class_key', sign_result.get('class_key'))
                    payload.setdefault('sign_name_en', sign_result.get('sign_name_en') or sign_result.get('name'))
                payload.setdefault('vehicles', pipeline_out.get('vehicles') or [])
                plate_result = pipeline_out.get('plate_result') or {}
                if plate_result.get('plate_text'):
                    payload['detected_plate'] = plate_result.get('plate_text')
                    payload['plate_confidence'] = float(plate_result.get('plate_confidence') or plate_result.get('confidence') or 0) * (
                        100 if float(plate_result.get('plate_confidence') or 0) <= 1 else 1
                    )
                    payload['plate_bbox'] = plate_result.get('plate_bbox')
            except Exception as exc:
                logger.exception('Frame pipeline failed')
                payload = {'error': str(exc), 'confidence': 0, 'vehicles': []}

            slim = {
                k: v for k, v in payload.items()
                if k not in (
                    'processed_image', 'annotated_processed_image', 'uploaded_image',
                    'guide_frame_image', 'sign_crop_image', 'pipeline_trace',
                )
            }
            annotated = annotate_frame_bgr(frame, payload)
            ann_path = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg').name
            cv2.imwrite(ann_path, annotated)
            temp_paths.append(ann_path)
            annotated_paths.append(ann_path)

            conf = float(slim.get('display_confidence') or slim.get('confidence') or 0)
            confidences.append(conf)
            plate = str(slim.get('detected_plate') or '')
            if plate:
                plates.add(plate)
            vehicles = slim.get('vehicles') or []
            has_sign = bool(slim.get('sign_bbox') or slim.get('class_key') or slim.get('sign_name_en'))

            ts = frame_idx / fps
            vf = VideoFrame(
                video_detection=job,
                frame_index=i,
                timestamp_sec=ts,
                detections_json=slim,
                sign_count=1 if has_sign else 0,
                vehicle_count=len(vehicles) if isinstance(vehicles, list) else 0,
                plate_text=plate,
                plate_confidence=float(slim.get('plate_confidence') or 0),
                confidence=conf,
                processing_ms=(time.perf_counter() - t0) * 1000,
            )
            with open(ann_path, 'rb') as fh:
                vf.annotated_image.save(f'{job.id}_f{i:04d}.jpg', ContentFile(fh.read()), save=False)
            vf.save()

            job.processed_frames = i + 1
            job.current_frame = i
            job.detection_count = (job.detection_count or 0) + (1 if has_sign or vehicles or plate else 0)
            job.vehicle_count = max(job.vehicle_count, len(vehicles) if isinstance(vehicles, list) else 0)
            job.sign_count = max(job.sign_count, 1 if has_sign else 0)
            job.plate_count = len(plates)
            if plate:
                job.plate_text = plate
                job.plate_confidence = float(slim.get('plate_confidence') or 0)
            elapsed = time.perf_counter() - started
            job.fps_process = (i + 1) / elapsed if elapsed > 0 else 0
            job.avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            ve = slim.get('violation_evaluation') or {}
            if ve.get('is_violation'):
                job.violation_suggestion = ve
            job.status = 'streaming'
            job.save()

            if conf >= best_conf:
                best_conf = conf
                best_payload = slim

            push_video_event(str(job.id), {
                'type': 'frame',
                'frame_index': i,
                'timestamp_sec': ts,
                'total_frames': job.total_frames,
                'processed_frames': job.processed_frames,
                'progress_pct': job.progress_pct,
                'fps_original': job.fps_original,
                'fps_process': round(job.fps_process, 2),
                'detection_count': job.detection_count,
                'vehicle_count': len(vehicles) if isinstance(vehicles, list) else 0,
                'sign_count': 1 if has_sign else 0,
                'plate_text': plate,
                'plate_confidence': job.plate_confidence,
                'confidence': conf,
                'processing_ms': vf.processing_ms,
                'image_b64': frame_to_jpeg_b64(annotated),
                'detections': slim,
                'violation_suggestion': ve if ve.get('is_violation') else {},
            })

        cap.release()

        if annotated_paths:
            out_tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4').name
            if build_annotated_preview_video(annotated_paths, out_tmp, fps=min(4.0, max(1.0, fps / 6))):
                with open(out_tmp, 'rb') as fh:
                    job.annotated_video.save(f'{job.id}_annotated.mp4', ContentFile(fh.read()), save=False)
                VideoEvidence.objects.create(
                    video_detection=job,
                    evidence_type='annotated_video',
                    file=job.annotated_video,
                    label='Annotated preview',
                )
            Path(out_tmp).unlink(missing_ok=True)

        job.status = 'completed'
        job.processing_time_sec = time.perf_counter() - started
        job.detection_json = {
            'best': best_payload,
            'frames_processed': job.processed_frames,
            'plates': list(plates),
        }
        job.save()
        push_video_event(str(job.id), {
            'type': 'completed',
            'status': 'completed',
            'video_id': str(job.id),
            'progress_pct': 100,
            'fps_process': job.fps_process,
            'processing_time_sec': job.processing_time_sec,
            'annotated_video_url': job.annotated_video.url if job.annotated_video else '',
            'result': job.detection_json,
            'violation_suggestion': job.violation_suggestion,
            'plate_text': job.plate_text,
            'avg_confidence': job.avg_confidence,
        })
    except Exception as exc:
        logger.exception('VideoDetection job failed')
        job.status = 'failed'
        job.error_message = str(exc)[:500]
        job.save(update_fields=['status', 'error_message', 'updated_at'])
        push_video_event(str(job.id), {'type': 'error', 'message': str(exc)[:300]})
    finally:
        for p in temp_paths:
            Path(p).unlink(missing_ok=True)


def start_video_job_thread(video_id: str, **kwargs) -> None:
    t = threading.Thread(
        target=process_video_detection_job,
        args=(str(video_id),),
        kwargs=kwargs,
        daemon=True,
        name=f'video-job-{video_id}',
    )
    t.start()


# ── Live sessions ─────────────────────────────────────────────────


def live_start(*, user, camera_id: str | None = None, source: str = 'camera', observed_action: str = '') -> dict:
    session_id = str(uuid.uuid4())
    with _LIVE_LOCK:
        _LIVE_SESSIONS[session_id] = {
            'session_id': session_id,
            'user_id': str(user.id),
            'camera_id': camera_id,
            'source': source,
            'observed_action': observed_action,
            'status': 'connecting',
            'started_at': timezone.now().isoformat(),
            'fps': 0.0,
            'latency_ms': 0.0,
            'detection_count': 0,
            'vehicle_count': 0,
            'violation_count': 0,
            'recording': False,
            'last_frame_b64': '',
            'last_detections': {},
            'error': '',
            'frames': 0,
            't0': time.perf_counter(),
        }
    # Create DB job
    from ai_detection.models import VideoDetection

    job = VideoDetection.objects.create(
        user=user,
        camera_id=camera_id or None,
        source_type='live' if source != 'webcam' else 'webcam',
        status='streaming',
        title=f'Live session {session_id[:8]}',
        observed_action=observed_action,
        model_name='YOLOv8',
    )
    with _LIVE_LOCK:
        _LIVE_SESSIONS[session_id]['video_detection_id'] = str(job.id)
        _LIVE_SESSIONS[session_id]['status'] = 'online'
    return {'session_id': session_id, 'video_detection_id': str(job.id), 'status': 'online'}


def live_stop(session_id: str) -> dict:
    with _LIVE_LOCK:
        sess = _LIVE_SESSIONS.pop(session_id, None)
    if not sess:
        return {'status': 'stopped', 'message': 'session not found'}
    vid = sess.get('video_detection_id')
    if vid:
        from ai_detection.models import VideoDetection

        VideoDetection.objects.filter(pk=vid).update(status='completed', is_recording=False)
    return {'status': 'stopped', 'session_id': session_id}


def live_status(session_id: str | None = None) -> dict:
    with _LIVE_LOCK:
        if session_id:
            sess = _LIVE_SESSIONS.get(session_id)
            if not sess:
                return {'status': 'offline', 'session_id': session_id}
            return {k: v for k, v in sess.items() if k != 'last_frame_b64'} | {
                'has_frame': bool(sess.get('last_frame_b64')),
            }
        return {
            'sessions': [
                {k: v for k, v in s.items() if k != 'last_frame_b64'}
                for s in _LIVE_SESSIONS.values()
            ],
        }


def live_process_frame(
    session_id: str,
    *,
    image_file=None,
    camera_id: str | None = None,
    user=None,
) -> dict:
    """Run one live detection cycle; store annotated frame on session."""
    import cv2
    import numpy as np

    with _LIVE_LOCK:
        sess = _LIVE_SESSIONS.get(session_id)
        if not sess:
            return {'error': 'session_not_found', 'status': 'offline'}

    t0 = time.perf_counter()
    tmp_path = None
    try:
        from ai_detection.frame_capture import capture_camera_frame
        from ai_detection.pipeline import run_detection_pipeline

        cam_id = camera_id or sess.get('camera_id')
        frame_bgr = None

        if image_file is not None:
            raw = image_file.read()
            arr = np.frombuffer(raw, dtype=np.uint8)
            frame_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            tmp_path = tmp.name
            tmp.close()
            if frame_bgr is not None:
                cv2.imwrite(tmp_path, frame_bgr)
        elif cam_id:
            path = capture_camera_frame(cam_id)
            if path:
                frame_bgr = cv2.imread(path)
                tmp_path = path

        if not tmp_path or frame_bgr is None:
            with _LIVE_LOCK:
                if session_id in _LIVE_SESSIONS:
                    _LIVE_SESSIONS[session_id]['status'] = 'disconnected'
                    _LIVE_SESSIONS[session_id]['error'] = 'Camera offline or no frame'
            return {'error': 'camera_offline', 'status': 'disconnected'}

        pipeline_out = run_detection_pipeline(
            tmp_path,
            original_filename='live-frame.jpg',
            sign_only=False,
            live_fast=True,
            enable_ocr=True,
            enable_plate=True,
        )
        payload = dict(pipeline_out.get('payload') or {})
        sign_result = pipeline_out.get('sign_result') or {}
        if sign_result.get('sign_bbox') and not payload.get('sign_bbox'):
            payload['sign_bbox'] = sign_result.get('sign_bbox')
        payload.setdefault('vehicles', pipeline_out.get('vehicles') or [])
        plate_result = pipeline_out.get('plate_result') or {}
        if plate_result.get('plate_text'):
            payload['detected_plate'] = plate_result.get('plate_text')
            payload['plate_confidence'] = float(
                plate_result.get('plate_confidence') or plate_result.get('confidence') or 0
            )
            payload['plate_bbox'] = plate_result.get('plate_bbox')

        annotated = annotate_frame_bgr(frame_bgr, payload)
        b64 = frame_to_jpeg_b64(annotated)
        latency = (time.perf_counter() - t0) * 1000
        vehicles = payload.get('vehicles') or []
        ve = payload.get('violation_evaluation') or {}

        with _LIVE_LOCK:
            s = _LIVE_SESSIONS.get(session_id)
            if s:
                s['frames'] = s.get('frames', 0) + 1
                elapsed = time.perf_counter() - s.get('t0', time.perf_counter())
                s['fps'] = s['frames'] / elapsed if elapsed > 0 else 0
                s['latency_ms'] = latency
                s['last_frame_b64'] = b64
                s['last_detections'] = {
                    k: v for k, v in payload.items()
                    if k not in (
                        'processed_image', 'annotated_processed_image', 'uploaded_image',
                        'guide_frame_image', 'sign_crop_image',
                    )
                }
                s['detection_count'] = s.get('detection_count', 0) + 1
                s['vehicle_count'] = len(vehicles) if isinstance(vehicles, list) else 0
                if ve.get('is_violation'):
                    s['violation_count'] = s.get('violation_count', 0) + 1
                s['status'] = 'online'
                s['error'] = ''
                status = dict(s)
            else:
                status = {}

        return {
            'session_id': session_id,
            'status': 'online',
            'fps': status.get('fps', 0),
            'latency_ms': latency,
            'image_b64': b64,
            'detections': status.get('last_detections', {}),
            'detection_count': status.get('detection_count', 0),
            'vehicle_count': status.get('vehicle_count', 0),
            'violation_count': status.get('violation_count', 0),
            'recording': status.get('recording', False),
            'plate_text': payload.get('detected_plate') or '',
            'plate_confidence': payload.get('plate_confidence') or 0,
            'violation_suggestion': ve if ve.get('is_violation') else {},
        }
    except Exception as exc:
        logger.exception('live_process_frame failed')
        with _LIVE_LOCK:
            if session_id in _LIVE_SESSIONS:
                _LIVE_SESSIONS[session_id]['status'] = 'error'
                _LIVE_SESSIONS[session_id]['error'] = str(exc)[:200]
        return {'error': str(exc), 'status': 'error'}
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)

def live_set_recording(session_id: str, recording: bool) -> dict:
    with _LIVE_LOCK:
        sess = _LIVE_SESSIONS.get(session_id)
        if not sess:
            return {'error': 'session_not_found'}
        sess['recording'] = recording
        vid = sess.get('video_detection_id')
    if vid:
        from ai_detection.models import VideoDetection

        VideoDetection.objects.filter(pk=vid).update(is_recording=recording)
    return {'session_id': session_id, 'recording': recording}
