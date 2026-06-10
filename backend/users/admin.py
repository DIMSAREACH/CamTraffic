from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Driver, Officer, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'role', 'license_no', 'is_active', 'created_at')
    list_filter = ('role', 'is_active')
    search_fields = ('email', 'full_name', 'license_no')
    ordering = ('-created_at',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('full_name', 'role', 'phone', 'address', 'license_no', 'profile_image')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(Officer)
class OfficerAdmin(admin.ModelAdmin):
    list_display = ('badge_no', 'user', 'rank', 'department', 'status')
    search_fields = ('badge_no', 'user__email', 'user__full_name')


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('license_no', 'user', 'license_expiry', 'status')
    search_fields = ('license_no', 'user__email', 'user__full_name')
