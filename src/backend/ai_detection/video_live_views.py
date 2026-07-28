"""APIs for realtime Upload Video streaming + Live Camera sessions."""
from __future__ import annotations

import json
import time

from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsPoliceOrAdmin
from core.responses import error_response, success_response

from .models import VideoDetection, VideoEvidence, VideoFrame
from .video_stream_service import (
    live_process_frame,
    live_set_recording,
    live_start,
    live_status,
    live_stop,
    pop_video_events,
    push_video_event,
    start_video_job_thread,
)


class VideoUploadStreamView(APIView):
    """POST /api/ai/video/upload/ — save video and start frame-stream processing."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        video = request.FILES.get('video') or request.FILES.get('file')
        if not video:
            return error_response('video file is required', status_code=status.HTTP_400_BAD_REQUEST)

        name = (getattr(video, 'name', '') or '').lower()
        if not any(name.endswith(ext) for ext in ('.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v')):
            return error_response(
                'Unsupported format. Use MP4, AVI, MOV, MKV, or WEBM.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        observed = str(request.data.get('observed_action') or '').strip()
        try:
            confidence = float(request.data.get('confidence') or 0.35)
        except (TypeError, ValueError):
            confidence = 0.35
        enable_ocr = str(request.data.get('enable_ocr', 'true')).lower() in ('1', 'true', 'yes')
        try:
            max_frames = int(request.data.get('max_frames') or 48)
        except (TypeError, ValueError):
            max_frames = 48

        job = VideoDetection(
            user=request.user,
            source_type='upload',
            status='queued',
            title=getattr(video, 'name', '')[:200],
            observed_action=observed,
            model_name='YOLOv8',
        )
        job.original_video.save(video.name, video, save=False)
        job.save()
        VideoEvidence.objects.create(
            video_detection=job,
            evidence_type='original_video',
            file=job.original_video,
            label='Original upload',
        )
        push_video_event(str(job.id), {'type': 'queued', 'video_id': str(job.id)})
        start_video_job_thread(
            str(job.id),
            max_frames=max_frames,
            confidence=confidence,
            enable_ocr=enable_ocr,
            observed_action=observed,
            user=request.user,
        )
        return success_response(
            {
                'video_id': str(job.id),
                'status': job.status,
                'stream_url': f'/api/ai/video/{job.id}/stream/',
                'result_url': f'/api/ai/video/result/{job.id}/',
            },
            message='Video queued for realtime detection',
            status_code=status.HTTP_201_CREATED,
        )


class VideoStreamEventsView(APIView):
    """GET /api/ai/video/<id>/stream/ — SSE frame events (JWT via query token or header)."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request, pk):
        try:
            job = VideoDetection.objects.get(pk=pk)
        except VideoDetection.DoesNotExist:
            return error_response('VideoDetection not found', status_code=status.HTTP_404_NOT_FOUND)
        if request.user.role not in ('admin', 'police') and job.user_id != request.user.id:
            return error_response('Forbidden', status_code=status.HTTP_403_FORBIDDEN)

        def event_stream():
            cursor = 0
            idle = 0
            yield f"data: {json.dumps({'type': 'hello', 'video_id': str(pk)})}\n\n"
            while idle < 120:
                chunk, cursor = pop_video_events(str(pk), cursor)
                if chunk:
                    idle = 0
                    for ev in chunk:
                        yield f'data: {json.dumps(ev, default=str)}\n\n'
                        if ev.get('type') in ('completed', 'error'):
                            return
                else:
                    idle += 1
                    yield f"data: {json.dumps({'type': 'ping', 't': time.time()})}\n\n"
                    time.sleep(0.35)
                # also stop if DB already completed and no more events
                job.refresh_from_db(fields=['status'])
                if job.status in ('completed', 'failed', 'cancelled') and not chunk:
                    idle += 2

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


class VideoResultView(APIView):
    """GET /api/ai/video/result/<id>/"""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request, pk):
        try:
            job = VideoDetection.objects.prefetch_related('frames', 'evidence_items').get(pk=pk)
        except VideoDetection.DoesNotExist:
            return error_response('Not found', status_code=status.HTTP_404_NOT_FOUND)

        frames = [
            {
                'frame_index': f.frame_index,
                'timestamp_sec': f.timestamp_sec,
                'image_url': request.build_absolute_uri(f.annotated_image.url) if f.annotated_image else '',
                'detections': f.detections_json,
                'confidence': f.confidence,
                'plate_text': f.plate_text,
                'processing_ms': f.processing_ms,
            }
            for f in job.frames.all()[:120]
        ]
        return success_response({
            'id': str(job.id),
            'status': job.status,
            'review_status': job.review_status,
            'progress_pct': job.progress_pct,
            'fps_original': job.fps_original,
            'fps_process': job.fps_process,
            'total_frames': job.total_frames,
            'processed_frames': job.processed_frames,
            'current_frame': job.current_frame,
            'detection_count': job.detection_count,
            'vehicle_count': job.vehicle_count,
            'sign_count': job.sign_count,
            'plate_count': job.plate_count,
            'plate_text': job.plate_text,
            'plate_confidence': job.plate_confidence,
            'avg_confidence': job.avg_confidence,
            'processing_time_sec': job.processing_time_sec,
            'model_name': job.model_name,
            'model_version': job.model_version,
            'violation_suggestion': job.violation_suggestion,
            'detection_json': job.detection_json,
            'original_video_url': request.build_absolute_uri(job.original_video.url) if job.original_video else '',
            'annotated_video_url': request.build_absolute_uri(job.annotated_video.url) if job.annotated_video else '',
            'frames': frames,
            'error_message': job.error_message,
        })


class VideoReviewView(APIView):
    """POST approve/reject for a VideoDetection job."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def post(self, request, pk):
        action = str(request.data.get('action') or request.data.get('review_status') or '').lower()
        if action not in ('approve', 'approved', 'reject', 'rejected'):
            return error_response('action must be approve or reject')
        try:
            job = VideoDetection.objects.get(pk=pk)
        except VideoDetection.DoesNotExist:
            return error_response('Not found', status_code=status.HTTP_404_NOT_FOUND)
        job.review_status = 'approved' if action.startswith('approve') else 'rejected'
        job.save(update_fields=['review_status', 'updated_at'])
        if job.ai_detection_log_id:
            from ai_detection.models import AIDetectionLog

            AIDetectionLog.objects.filter(pk=job.ai_detection_log_id).update(review_status=job.review_status)
        return success_response({'id': str(job.id), 'review_status': job.review_status})


class LiveStartView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def post(self, request):
        camera_id = request.data.get('camera_id') or None
        source = str(request.data.get('source') or 'camera')
        observed = str(request.data.get('observed_action') or '').strip()
        data = live_start(
            user=request.user,
            camera_id=str(camera_id) if camera_id else None,
            source=source,
            observed_action=observed,
        )
        return success_response(data, message='Live session started')


class LiveStopView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return error_response('session_id required')
        return success_response(live_stop(str(session_id)))


class LiveStatusView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        session_id = request.query_params.get('session_id')
        return success_response(live_status(session_id))


class LiveFrameView(APIView):
    """GET last annotated frame, or POST multipart to process next frame."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return error_response('session_id required')
        from .video_stream_service import _LIVE_LOCK, _LIVE_SESSIONS

        with _LIVE_LOCK:
            sess = _LIVE_SESSIONS.get(session_id)
            if not sess:
                return error_response('session offline', status_code=status.HTTP_404_NOT_FOUND)
            return success_response({
                'session_id': session_id,
                'status': sess.get('status'),
                'fps': sess.get('fps'),
                'latency_ms': sess.get('latency_ms'),
                'image_b64': sess.get('last_frame_b64') or '',
                'detections': sess.get('last_detections') or {},
                'detection_count': sess.get('detection_count'),
                'vehicle_count': sess.get('vehicle_count'),
                'violation_count': sess.get('violation_count'),
                'recording': sess.get('recording'),
                'error': sess.get('error') or '',
            })

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return error_response('session_id required')
        image = request.FILES.get('image') or request.FILES.get('frame')
        camera_id = request.data.get('camera_id')
        result = live_process_frame(
            str(session_id),
            image_file=image,
            camera_id=str(camera_id) if camera_id else None,
            user=request.user,
        )
        if result.get('error') and result.get('status') in ('offline', 'disconnected', 'error', None):
            code = status.HTTP_400_BAD_REQUEST
            if result.get('error') == 'session_not_found':
                code = status.HTTP_404_NOT_FOUND
            return error_response(result.get('error') or 'Live frame failed', status_code=code)
        return success_response(result)


class LiveSnapshotView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return error_response('session_id required')
        # Process one frame and persist as evidence
        result = live_process_frame(
            str(session_id),
            image_file=request.FILES.get('image'),
            camera_id=request.data.get('camera_id'),
            user=request.user,
        )
        from .video_stream_service import _LIVE_LOCK, _LIVE_SESSIONS
        import base64

        with _LIVE_LOCK:
            sess = _LIVE_SESSIONS.get(session_id) or {}
            vid = sess.get('video_detection_id')
            b64 = sess.get('last_frame_b64') or result.get('image_b64') or ''
        if vid and b64:
            from django.core.files.base import ContentFile

            raw = base64.b64decode(b64)
            ev = VideoEvidence(video_detection_id=vid, evidence_type='frame', label='Live snapshot')
            ev.file.save(f'snap_{session_id[:8]}.jpg', ContentFile(raw), save=True)
            result['evidence_id'] = str(ev.id)
        return success_response(result, message='Snapshot saved')


class LiveRecordStartView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return error_response('session_id required')
        return success_response(live_set_recording(str(session_id), True), message='Recording started')


class LiveRecordStopView(APIView):
    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return error_response('session_id required')
        return success_response(live_set_recording(str(session_id), False), message='Recording stopped')
