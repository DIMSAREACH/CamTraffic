from rbac.models import Permission, RolePermission, UserRole


def user_has_permission(user, perm_name: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'role', None) == 'admin' or user.is_superuser:
        return True
    try:
        user_role = user.assigned_role
    except UserRole.DoesNotExist:
        return False
    return RolePermission.objects.filter(
        role_id=user_role.role_id,
        permission__perm_name=perm_name,
    ).exists()


def get_user_role_name(user) -> str | None:
    try:
        return user.assigned_role.role.role_name
    except UserRole.DoesNotExist:
        return getattr(user, 'role', None)
