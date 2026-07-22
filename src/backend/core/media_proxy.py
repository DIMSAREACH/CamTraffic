"""Proxy remote media (e.g. Cloudflare R2) through the API to avoid browser CORS."""
from __future__ import annotations

import logging
import urllib.error
import urllib.request
from urllib.parse import urlparse

from django.conf import settings
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsPoliceOrAdmin
from core.responses import error_response

logger = logging.getLogger(__name__)


def _allowed_media_hosts() -> set[str]:
    hosts: set[str] = set()
    domain = (getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None) or '').strip().lower()
    if domain:
        hosts.add(domain.split('/')[0])
    for origin in getattr(settings, 'CORS_ALLOWED_ORIGINS', []) or []:
        try:
            host = urlparse(origin).hostname
            if host:
                hosts.add(host.lower())
        except Exception:
            continue
    hosts.update({'127.0.0.1', 'localhost'})
    return hosts


class MediaProxyView(APIView):
    """GET /api/media/proxy/?url=https://… — stream allowed remote media to the SPA."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        raw = (request.query_params.get('url') or '').strip()
        if not raw:
            return error_response('url is required')
        try:
            parsed = urlparse(raw)
        except Exception:
            return error_response('Invalid url', status_code=400)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname:
            return error_response('Only http(s) URLs are allowed', status_code=400)

        host = parsed.hostname.lower()
        allowed = _allowed_media_hosts()
        if host not in allowed and not host.endswith('.r2.dev'):
            return error_response('Host not allowed', status_code=403)

        try:
            req = urllib.request.Request(raw, headers={'User-Agent': 'CamTraffic/1.0'})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
                content_type = resp.headers.get('Content-Type') or 'application/octet-stream'
        except urllib.error.HTTPError as exc:
            logger.warning('Media proxy upstream %s → %s', raw, exc.code)
            return error_response(f'Upstream returned {exc.code}', status_code=502)
        except Exception as exc:
            logger.exception('Media proxy failed for %s', raw)
            return error_response(f'Proxy failed: {exc}', status_code=502)

        response = HttpResponse(data, content_type=content_type)
        response['Cache-Control'] = 'private, max-age=60'
        return response
