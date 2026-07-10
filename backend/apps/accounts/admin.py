from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone')
    ordering = ('-date_joined',)

    fieldsets = UserAdmin.fieldsets + (
        ('CamTraffic Profile', {
            'fields': ('role', 'phone', 'avatar', 'is_email_verified'),
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('CamTraffic Profile', {
            'fields': ('email', 'role', 'phone'),
        }),
    )
