from django.contrib import admin

from .models import ViolationAppeal


@admin.register(ViolationAppeal)
class ViolationAppealAdmin(admin.ModelAdmin):
    list_display = ('id', 'violation', 'driver', 'status', 'submitted_at')
    list_filter = ('status',)
    search_fields = ('driver__license_no', 'reason')
    readonly_fields = ('submitted_at', 'updated_at')
