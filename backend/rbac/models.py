from django.conf import settings
from django.db import models


class Role(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    role_name = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rbac_roles'
        ordering = ['role_name']

    def __str__(self):
        return self.role_name


class Permission(models.Model):
    """Application permission (not django.contrib.auth.Permission)."""

    perm_name = models.CharField(max_length=100, unique=True)
    action_type = models.CharField(max_length=50)
    resource = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'rbac_permissions'
        ordering = ['resource', 'action_type']

    def __str__(self):
        return self.perm_name


class RolePermission(models.Model):
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
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_role',
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_roles')

    class Meta:
        db_table = 'rbac_user_roles'

    def __str__(self):
        return f'{self.user_id} -> {self.role.role_name}'
