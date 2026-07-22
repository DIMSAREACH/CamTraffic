from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'action', 'resource', 'resource_id', 'ip_address', 'timestamp')
    list_filter = ('action', 'resource')
    search_fields = ('resource', 'resource_id', 'user__email')
    readonly_fields = (
        'user', 'action', 'resource', 'resource_id', 'ip_address',
        'timestamp', 'old_value', 'new_value', 'extra_data',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
