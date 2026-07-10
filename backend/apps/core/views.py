from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from config.monitoring import get_liveness, get_readiness, get_system_status


def health(request):
    """Liveness probe — process is up."""
    return JsonResponse(get_liveness())


def readiness(request):
    """Readiness probe — dependencies are reachable."""
    payload = get_readiness()
    code = status.HTTP_200_OK if payload['status'] == 'ok' else status.HTTP_503_SERVICE_UNAVAILABLE
    return JsonResponse(payload, status=code)


@api_view(['GET'])
def api_root(request):
    return Response({
        'service': 'camtraffic-api',
        'version': 'v1',
        'docs': '/api/v1/',
        'health': '/api/v1/health/',
        'monitoring': '/api/v1/monitoring/status/',
        'locales': '/api/v1/system/locales/',
        'auth': {
            'login': '/api/v1/auth/login/',
            'refresh': '/api/v1/auth/refresh/',
            'logout': '/api/v1/auth/logout/',
            'me': '/api/v1/auth/me/',
        },
        'rbac': {
            'my_access': '/api/v1/rbac/my-access/',
            'roles': '/api/v1/rbac/roles/',
            'permissions': '/api/v1/rbac/permissions/',
            'permissions_manage': '/api/v1/rbac/permissions/manage/',
            'role_permissions_update': '/api/v1/rbac/roles/{role_id}/permissions/',
        },
    })


@api_view(['GET'])
def api_health(request):
    """API health check. Pass ?full=1 for dependency checks."""
    full = request.query_params.get('full', '').lower() in ('1', 'true', 'yes')
    if full:
        payload = get_readiness()
        code = status.HTTP_200_OK if payload['status'] == 'ok' else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(payload, status=code)
    return Response(get_liveness(), status=status.HTTP_200_OK)


@api_view(['GET'])
def monitoring_status(request):
    """Detailed system status for operators."""
    payload = get_system_status()
    code = status.HTTP_200_OK if payload['status'] == 'ok' else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(payload, status=code)
