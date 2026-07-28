from django.contrib import admin

from .models import Camera, Road, TrafficSignal


@admin.register(Road)
class RoadAdmin(admin.ModelAdmin):
    list_display = ('name', 'road_type', 'city', 'speed_limit', 'status')
    list_filter = ('road_type', 'status', 'city')


@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'road', 'camera_type', 'status', 'frame_source_url')
    list_filter = ('camera_type', 'status')
    search_fields = ('name', 'code', 'road__name')


@admin.register(TrafficSignal)
class TrafficSignalAdmin(admin.ModelAdmin):
    list_display = ('signal_code', 'road', 'cycle_duration', 'status')
    list_filter = ('status',)
