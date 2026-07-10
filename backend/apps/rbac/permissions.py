from __future__ import annotations

from rest_framework.permissions import BasePermission

from .models import resolve_user_permissions, resolve_user_role_slugs


class HasRBACPermission(BasePermission):
    required_permission: str | None = None

    def __init__(self, required_permission: str | None = None):
        if required_permission is not None:
            self.required_permission = required_permission

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        required = getattr(view, 'required_permission', None) or self.required_permission
        if not required:
            return False
        return required in resolve_user_permissions(request.user)


def HasRBACRole(*allowed_roles: str) -> type[BasePermission]:
    """Return a DRF permission class for one or more role slugs."""
    role_set = set(allowed_roles)

    class _RolePermission(BasePermission):
        def has_permission(self, request, view) -> bool:
            if not request.user or not request.user.is_authenticated:
                return False

            view_allowed = set(getattr(view, 'allowed_roles', []))
            allowed = view_allowed or role_set
            if not allowed:
                return False

            return bool(resolve_user_role_slugs(request.user) & allowed)

    return _RolePermission
