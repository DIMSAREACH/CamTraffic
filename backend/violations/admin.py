from django.contrib import admin

from .models import TrafficViolation, ViolationRule


@admin.register(ViolationRule)
class ViolationRuleAdmin(admin.ModelAdmin):
    list_display = ('violation_type', 'sign_class_key', 'prohibited_action', 'default_fine_amount', 'is_active')
    list_filter = ('is_active', 'violation_type')
    search_fields = ('sign_class_key', 'prohibited_action', 'title')


@admin.register(TrafficViolation)
class TrafficViolationAdmin(admin.ModelAdmin):
    list_display = ('id', 'violation_type', 'driver', 'status', 'violation_date', 'location')
    list_filter = ('status', 'violation_type')
    search_fields = ('location', 'description', 'detected_sign_code')
