"""Role-based access control permissions."""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsPolice(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'police'


class IsDriver(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'driver'


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
