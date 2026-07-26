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
        'users': [
            'GET|POST /api/users/',
            'GET|PATCH|DELETE /api/users/<uuid>/',
            'POST /api/users/<uuid>/toggle-active/',
        ],
        'imports': [
            'GET /api/imports/types/',
            'GET /api/imports/template/?type=&file_format=csv|xlsx',
            'POST /api/imports/validate/',
            'POST /api/imports/commit/',
            'GET /api/imports/history/',
            'GET /api/imports/history/<uuid>/',
        ],
        'ai_detection': [
            'POST /api/ai/detect/',
            'POST /api/ai/image/',
            'POST /api/ai/detect-video/',
            'POST /api/ai/video/',
            'POST /api/ai/process-frame/',
            'POST /api/ai/live-camera/',
            'POST /api/ai/capture-webcam/',
            'POST /api/ai/webcam/',
            'GET /api/ai/stats/',
            'GET /api/ai/statistics/',
            'GET /api/ai/logs/',
            'GET /api/ai/history/',
            'DELETE /api/ai/history/<uuid>/',
            'GET /api/ai/models/',
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
        'fines': [
            'GET|POST /api/fines/',
            'GET|PATCH|DELETE /api/fines/<uuid>/',
        ],
        'vehicles': [
            'GET|POST /api/vehicles/',
            'GET|PATCH|DELETE /api/vehicles/<uuid>/',
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
            'master_build': {
                'image': url('/api/ai/image/'),
                'video': url('/api/ai/video/'),
                'webcam': url('/api/ai/webcam/'),
                'live_camera': url('/api/ai/live-camera/'),
                'process_frame': url('/api/ai/process-frame/'),
                'history': url('/api/ai/history/'),
                'statistics': url('/api/ai/statistics/'),
                'models': url('/api/ai/models/'),
                'logs': url('/api/ai/logs/'),
            },
        },
        'modules': modules,
    }
