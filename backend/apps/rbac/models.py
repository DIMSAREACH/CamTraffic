from django.conf import settings
from django.db import models

from apps.core.models import ActiveModel, TimeStampedModel


class Permission(TimeStampedModel):
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=150)
    module = models.CharField(max_length=50, help_text='App or feature module name')
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'rbac_permission'
        ordering = ['module', 'codename']

    def __str__(self) -> str:
        return f'{self.module}.{self.codename}'


class Role(TimeStampedModel, ActiveModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(Permission, blank=True, related_name='roles')

    class Meta:
        db_table = 'rbac_role'
        ordering = ['name']

    def __str__(self) -> str:
        return self.name


class UserRole(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_roles',
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_roles')
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_roles',
    )

    class Meta:
        db_table = 'rbac_user_role'
        unique_together = [('user', 'role')]

    def __str__(self) -> str:
        return f'{self.user} → {self.role}'


def resolve_user_role_slugs(user) -> set[str]:
    """
    Resolve role slugs from both legacy `accounts.User.role`
    and RBAC `UserRole` assignments.
    """
    slugs: set[str] = set()

    base_role = getattr(user, 'role', None)
    if base_role:
        slugs.add(str(base_role))

    if getattr(user, 'is_superuser', False):
        slugs.add('super_admin')

    assigned_roles = Role.objects.filter(
        is_active=True,
        user_roles__user=user,
    ).values_list('slug', flat=True)
    slugs.update(assigned_roles)
    return slugs


def resolve_user_permissions(user) -> set[str]:
    role_slugs = resolve_user_role_slugs(user)
    if not role_slugs:
        return set()

    return set(
        Permission.objects.filter(
            roles__slug__in=role_slugs,
            roles__is_active=True,
        ).values_list('codename', flat=True),
    )
