from django.contrib import admin

from .models import ImportJob


@admin.register(ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'import_type', 'file_name', 'status', 'created_by',
        'total_rows', 'success_count', 'failed_count', 'skipped_count', 'created_at',
    )
    list_filter = ('import_type', 'status')
    search_fields = ('file_name', 'created_by__email')
    readonly_fields = (
        'id', 'import_type', 'file_name', 'status', 'created_by',
        'total_rows', 'valid_rows', 'success_count', 'failed_count', 'skipped_count',
        'rows_report', 'error_summary', 'expires_at', 'created_at', 'updated_at',
    )
