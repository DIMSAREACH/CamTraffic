"""Role-based access control permissions.

PRD role mapping:
  Admin   → User.role == 'admin'
  Officer → User.role == 'police'
  Citizen → User.role == 'driver'
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsPolice(BasePermission):
    """Traffic officer (PRD: Officer)."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'police'


class IsDriver(BasePermission):
    """Citizen driver (PRD: Citizen)."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'driver'


# PRD naming aliases
IsOfficer = IsPolice
IsCitizen = IsDriver


class IsPoliceOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('police', 'admin')


class IsOwnerOrAdmin(BasePermission):
    """Object-level: owner or admin."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        owner_id = getattr(obj, 'owner_id', None) or getattr(obj, 'user_id', None) or getattr(obj, 'driver_id', None)
        return owner_id == request.user.id


# RBAC factories (database roles + permissions)
from rbac.permissions import (  # noqa: E402
    HasRBACPermission,
    HasRBACRole,
    user_has_rbac_permission,
    user_has_rbac_role,
)

__all__ = [
    'IsAdmin',
    'IsPolice',
    'IsDriver',
    'IsOfficer',
    'IsCitizen',
    'IsPoliceOrAdmin',
    'IsOwnerOrAdmin',
    'HasRBACRole',
    'HasRBACPermission',
    'user_has_rbac_role',
    'user_has_rbac_permission',
]
