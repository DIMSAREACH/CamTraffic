"""Attach a unique request ID to every HTTP request."""

from __future__ import annotations

import uuid

from apps.core.logging_context import request_id_var


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        token = request_id_var.set(request_id)
        request.request_id = request_id

        try:
            response = self.get_response(request)
            response['X-Request-ID'] = request_id
            return response
        finally:
            request_id_var.reset(token)
