from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.permissions import IsAdmin
from core.responses import success_response

from .services import get_admin_stats, get_driver_stats, get_police_stats


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return success_response(get_admin_stats(request))


class PoliceDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('police', 'admin'):
            return success_response(get_driver_stats(request.user))
        return success_response(get_police_stats(request.user, request))


class DriverDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success_response(get_driver_stats(request.user, request))
