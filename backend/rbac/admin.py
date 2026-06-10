from django.contrib import admin

from .models import Permission, Role, RolePermission, UserRole


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('role_name', 'status', 'created_at')
    search_fields = ('role_name',)


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('perm_name', 'action_type', 'resource')
    list_filter = ('resource', 'action_type')


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ('role', 'permission')
    list_filter = ('role',)


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role')
    list_filter = ('role',)
