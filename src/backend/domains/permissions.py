"""Domain permission helpers — officer-only operational actions."""
from rest_framework.permissions import BasePermission

from core.permissions import IsAdmin, IsCitizen, IsOfficer, IsPolice


class IsOfficerOnly(BasePermission):
    """Traffic Operations: issue fines, approve/reject violations (not admin)."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'police'


class IsCitizenOnly(BasePermission):
    """Citizen Service: self-service only."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'driver'


class IsAdminOnly(BasePermission):
    """Administration domain."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


# Re-export PRD aliases
__all__ = [
    'IsOfficerOnly',
    'IsCitizenOnly',
    'IsAdminOnly',
    'IsAdmin',
    'IsOfficer',
    'IsPolice',
    'IsCitizen',
]
