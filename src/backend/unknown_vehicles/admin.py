from django.contrib import admin

from .models import UnknownVehicle


@admin.register(UnknownVehicle)
class UnknownVehicleAdmin(admin.ModelAdmin):
    list_display = ('id', 'plate_detected', 'camera', 'is_resolved', 'detected_at')
    list_filter = ('is_resolved',)
    search_fields = ('plate_detected',)
    readonly_fields = ('detected_at', 'resolved_at')
