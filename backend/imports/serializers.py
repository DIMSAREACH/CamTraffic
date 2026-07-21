from rest_framework import serializers

from .models import ImportJob


class ImportJobSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True, default=None)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)

    class Meta:
        model = ImportJob
        fields = (
            'id', 'import_type', 'file_name', 'status',
            'created_by', 'created_by_email', 'created_by_name',
            'total_rows', 'valid_rows', 'success_count', 'failed_count', 'skipped_count',
            'error_summary', 'created_at', 'updated_at', 'expires_at',
        )
        read_only_fields = fields


class ImportJobDetailSerializer(ImportJobSerializer):
    class Meta(ImportJobSerializer.Meta):
        fields = ImportJobSerializer.Meta.fields + ('rows_report',)
