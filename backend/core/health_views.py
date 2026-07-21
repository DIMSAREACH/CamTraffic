"""Lightweight health probes for Docker, CI, and uptime monitoring."""
from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsPoliceOrAdmin
from core.responses import error_response, success_response
from config.monitoring import get_system_status
from core.api_catalog import build_api_catalog


class ApiCatalogView(APIView):
    """Full API map (authenticated officers/admins)."""

    permission_classes = [IsAuthenticated, IsPoliceOrAdmin]

    def get(self, request):
        return success_response(build_api_catalog(request))


class ApiRootView(APIView):
    """Public root for load balancers and hosting probes (Render, etc.)."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        return success_response({
            'status': 'ok',
            'service': 'camtraffic-api',
            'health': '/health/',
            'api': '/api/',
            'detection': '/api/detection/',
            'catalog': '/api/catalog/',
        })


class HealthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        return success_response({
            'status': 'ok',
            'service': 'camtraffic-api',
        })


class HealthReadyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception as exc:
            return error_response(
                f'Database unavailable: {exc}',
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return success_response({
            'status': 'ready',
            'database': 'ok',
        })


class MonitoringStatusView(APIView):
    """Extended system status for ops dashboards."""
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        return success_response(get_system_status())
