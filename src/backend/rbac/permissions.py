"""RBAC permission factories — use alongside legacy `User.role` checks."""
from __future__ import annotations

from rest_framework.permissions import BasePermission

from rbac.models import RolePermission, UserRole

_LEGACY_ROLE_ALIASES = {
    'admin': 'admin',
    'police': 'police',
    'officer': 'police',
    'driver': 'driver',
    'citizen': 'driver',
}


def user_has_rbac_role(user, role_name: str) -> bool:
    if not user.is_authenticated:
        return False
    target = role_name.strip().lower()
    legacy = _LEGACY_ROLE_ALIASES.get(getattr(user, 'role', ''), getattr(user, 'role', ''))
    if legacy == target:
        return True
    try:
        assignment = user.assigned_role
    except UserRole.DoesNotExist:
        return False
    role = assignment.role
    return role.status == 'active' and role.role_name.strip().lower() == target


def user_has_rbac_permission(user, perm_name: str) -> bool:
    if not user.is_authenticated:
        return False
    if getattr(user, 'role', '') == 'admin':
        return True
    try:
        assignment = user.assigned_role
    except UserRole.DoesNotExist:
        return False
    role = assignment.role
    if role.status != 'active':
        return False
    return RolePermission.objects.filter(
        role=role,
        permission__perm_name=perm_name,
    ).exists()


def HasRBACRole(*role_names: str):
    """Factory: `permission_classes = [IsAuthenticated, HasRBACRole('admin')]`"""

    class _HasRBACRole(BasePermission):
        def has_permission(self, request, view):
            return any(user_has_rbac_role(request.user, name) for name in role_names)

    _HasRBACRole.__name__ = f"HasRBACRole_{'_'.join(role_names)}"
    _HasRBACRole.__qualname__ = _HasRBACRole.__name__
    return _HasRBACRole


def HasRBACPermission(*perm_names: str):
    """Factory: `permission_classes = [IsAuthenticated, HasRBACPermission('users.view')]`"""

    class _HasRBACPermission(BasePermission):
        def has_permission(self, request, view):
            return any(user_has_rbac_permission(request.user, name) for name in perm_names)

    _HasRBACPermission.__name__ = f"HasRBACPermission_{'_'.join(perm_names)}"
    _HasRBACPermission.__qualname__ = _HasRBACPermission.__name__
    return _HasRBACPermission
