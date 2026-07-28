from django.contrib import admin

from .models import AIModelVersion


@admin.register(AIModelVersion)
class AIModelVersionAdmin(admin.ModelAdmin):
    list_display = ('version', 'is_active', 'accuracy', 'uploaded_by', 'uploaded_at')
    list_filter = ('is_active',)
    search_fields = ('version', 'description')
    readonly_fields = ('uploaded_at',)
