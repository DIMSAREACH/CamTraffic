"""Lightweight catalog for each domain namespace."""
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.responses import success_response
from domains.permissions import IsAdminOnly, IsCitizenOnly, IsOfficerOnly

DOMAIN_PERMISSIONS = {
    'admin': [IsAuthenticated, IsAdminOnly],
    'officer': [IsAuthenticated, IsOfficerOnly],
    'citizen': [IsAuthenticated, IsCitizenOnly],
}

DOMAIN_ENDPOINTS = {
    'admin': [
        'GET /api/v1/admin/dashboard/',
        'GET|POST /api/v1/admin/users/',
        'GET|POST /api/v1/admin/rbac/roles/',
        'GET|POST /api/v1/admin/cameras/',
        'GET /api/v1/admin/audit/',
        'GET|POST /api/v1/admin/ai-models/',
        'GET /api/v1/admin/reports/',
        'GET|PATCH /api/v1/admin/settings/',
    ],
    'officer': [
        'GET /api/v1/officer/dashboard/',
        'GET /api/v1/officer/detection-queue/',
        'GET /api/v1/officer/live-cameras/',
        'POST /api/v1/officer/violations/{id}/approve/',
        'POST /api/v1/officer/violations/{id}/reject/',
        'POST /api/v1/officer/fines/issue/',
        'GET /api/v1/officer/evidence/',
        'GET /api/v1/officer/assigned-cases/',
    ],
    'citizen': [
        'GET /api/v1/citizen/dashboard/',
        'GET /api/v1/citizen/vehicles/',
        'GET /api/v1/citizen/violations/',
        'GET /api/v1/citizen/fines/',
        'POST /api/v1/citizen/appeals/',
        'GET /api/v1/citizen/notifications/',
    ],
}


class DomainCatalogView(APIView):
    """Lists endpoints available under a role domain namespace."""

    def get_permissions(self):
        domain = self.kwargs.get('domain', 'admin')
        return [perm() for perm in DOMAIN_PERMISSIONS.get(domain, [IsAuthenticated])]

    def get(self, request, *args, **kwargs):
        domain = kwargs.get('domain') or self.kwargs.get('domain', 'admin')
        return success_response({
            'domain': domain,
            'role': request.user.role,
            'endpoints': DOMAIN_ENDPOINTS.get(domain, []),
        })
