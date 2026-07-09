"""Task 137 / 139 — Camera process-frame endpoint + SSE live detection feed."""

from __future__ import annotations

import base64
import json
import time

from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.cameras.models import Camera
from apps.core.responses import error_response, success_response
from apps.detections.models import Detection
from apps.detections.serializers import DetectionMonitorSerializer
from apps.rbac.permissions import HasRBACRole

from .tasks import process_camera_frame


class CameraProcessFrameView(APIView):
    """
    Task 137 — POST /integration/cameras/{camera_id}/process-frame/

    Accepts a multipart image upload, dispatches the full AI pipeline as a
    Celery task, and returns the task ID for async polling.

    For small/dev setups pass ?sync=1 to run inline and get the result directly.
    """

    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin', 'officer')]

    def post(self, request, camera_id: int):
        try:
            camera = Camera.objects.get(pk=camera_id, is_active=True)
        except Camera.DoesNotExist:
            return error_response('Camera not found or inactive.', status=status.HTTP_404_NOT_FOUND)

        image_file = request.FILES.get('image')
        if not image_file:
            return error_response('image file is required.', status=status.HTTP_400_BAD_REQUEST)
        if not image_file.content_type.startswith('image/'):
            return error_response('Upload must be an image.', status=status.HTTP_400_BAD_REQUEST)

        image_bytes = image_file.read()
        image_b64 = base64.b64encode(image_bytes).decode()

        sync = request.query_params.get('sync', '').lower() in ('1', 'true', 'yes')
        if sync:
            result = process_camera_frame(camera_id, image_b64)
            return success_response(result)

        task = process_camera_frame.delay(camera_id, image_b64)
        return success_response(
            {'task_id': task.id, 'camera_id': camera_id},
            message='Frame submitted for processing.',
            status=status.HTTP_202_ACCEPTED,
        )


class AIServiceStatusView(APIView):
    """Task 137 — GET /integration/ai-status/ — proxy AI service /pipeline/status."""

    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        from .ai_client import get_pipeline_status
        data = get_pipeline_status()
        return success_response(data)


def _detection_sse_event(detection: Detection, request) -> str:
    serializer = DetectionMonitorSerializer(detection, context={'request': request})
    payload = json.dumps(serializer.data)
    return f'data: {payload}\n\n'


class DetectionLiveFeedSSEView(APIView):
    """
    Task 139 — GET /integration/detections/live-feed/

    Server-Sent Events stream.  Polls the DB every 3 s and emits any
    detections created since the connection was opened.

    Use ?camera_id=N to filter to a specific camera.
    Clients disconnect after ?max_events=N events (default 200, safety cap).

    NOTE: For production, replace the DB polling loop with a Django Channels
    consumer driven by a Redis pub/sub channel.
    """

    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin', 'officer')]

    def get(self, request):
        camera_id = request.query_params.get('camera_id', '').strip()
        try:
            max_events = min(int(request.query_params.get('max_events', '200')), 500)
        except ValueError:
            max_events = 200

        since = timezone.now()

        def event_stream():
            nonlocal since
            events_sent = 0
            poll_interval = 3.0

            yield 'event: connected\ndata: {"status":"ok"}\n\n'

            while events_sent < max_events:
                qs = (
                    Detection.objects.select_related(
                        'camera',
                        'model_version__ai_model',
                        'traffic_sign',
                    )
                    .filter(detected_at__gt=since)
                    .order_by('detected_at')
                )
                if camera_id:
                    qs = qs.filter(camera_id=camera_id)

                for detection in qs:
                    yield _detection_sse_event(detection, request)
                    since = detection.detected_at
                    events_sent += 1
                    if events_sent >= max_events:
                        break

                time.sleep(poll_interval)

            yield 'event: end\ndata: {"reason":"max_events_reached"}\n\n'

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
