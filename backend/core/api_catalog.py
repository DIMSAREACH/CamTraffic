"""Static API surface map (avoid fragile URL resolver walks)."""
from __future__ import annotations


def build_api_catalog(request) -> dict:
    def url(path: str) -> str:
        return request.build_absolute_uri(path)

    modules = {
        'auth': [
            'POST /api/auth/login/',
            'POST /api/auth/register/',
            'POST /api/auth/refresh/',
            'GET /api/auth/profile/',
        ],
        'ai_detection': [
            'POST /api/ai/detect/',
            'POST /api/ai/detect-video/',
            'POST /api/ai/process-frame/',
            'POST /api/ai/capture-webcam/',
            'GET /api/ai/stats/',
            'GET /api/ai/logs/',
        ],
        'detection_aliases': [
            'GET /api/detection/',
            'POST /api/detection/image/',
            'POST /api/detection/video/',
            'GET|POST /api/detection/webcam/',
            'POST /api/detection/live/',
        ],
        'violations': [
            'GET|POST /api/violations/',
            'POST /api/violations/evaluate/',
            'GET /api/violations/rules/',
        ],
        'infrastructure': [
            'GET|POST /api/cameras/',
            'GET|POST /api/roads/',
        ],
        'dashboard': [
            'GET /api/dashboard/admin/',
            'GET /api/dashboard/police/',
            'GET /api/dashboard/driver/',
        ],
    }

    return {
        'service': 'camtraffic-api',
        'version': 'v1',
        'base': url('/api/'),
        'health': url('/health/'),
        'detection': {
            'hub': url('/api/detection/'),
            'image': url('/api/detection/image/'),
            'video': url('/api/detection/video/'),
            'webcam': url('/api/detection/webcam/'),
            'live': url('/api/detection/live/'),
        },
        'modules': modules,
    }
