from django.conf import settings
from django.db import models

from core.models import TimeStampedUUIDModel, UUIDPrimaryKeyModel


class Role(UUIDPrimaryKeyModel):
    """Authorization level — PRD table `roles`."""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    role_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    assigned_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rbac_roles'
        ordering = ['role_name']
        indexes = [
            models.Index(fields=['status'], name='idx_role_status'),
        ]

    def __str__(self):
        return self.role_name


class Permission(UUIDPrimaryKeyModel):
    """Granular platform action — PRD table `permissions`."""

    perm_name = models.CharField(max_length=100, unique=True)
    action_type = models.CharField(max_length=50)
    resource = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rbac_permissions'
        ordering = ['resource', 'action_type']

    def __str__(self):
        return self.perm_name


class RolePermission(models.Model):
    """Many-to-many role ↔ permission — PRD table `role_permissions`."""

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')

    class Meta:
        db_table = 'rbac_role_permissions'
        constraints = [
            models.UniqueConstraint(fields=['role', 'permission'], name='uniq_role_permission'),
        ]

    def __str__(self):
        return f'{self.role.role_name}:{self.permission.perm_name}'


class UserRole(models.Model):
    """User ↔ role assignment — PRD table `user_roles`."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_role',
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_roles')

    class Meta:
        db_table = 'rbac_user_roles'
        indexes = [
            models.Index(fields=['role'], name='idx_user_role_role'),
        ]

    def __str__(self):
        return f'{self.user_id} -> {self.role.role_name}'
