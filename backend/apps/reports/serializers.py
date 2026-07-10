from rest_framework import serializers

from .models import ReportExport
from .services import SUPPORTED_REPORT_TYPES


class ReportCatalogItemSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    supported_formats = serializers.ListField(child=serializers.CharField())


class ReportExportSerializer(serializers.ModelSerializer):
    requested_by_email = serializers.EmailField(source='requested_by.email', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ReportExport
        fields = (
            'id',
            'report_type',
            'format',
            'status',
            'file_url',
            'parameters',
            'error_message',
            'requested_by_email',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields

    def get_file_url(self, obj: ReportExport) -> str | None:
        if not obj.file:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class ReportExportCreateSerializer(serializers.Serializer):
    report_type = serializers.CharField(max_length=50)
    format = serializers.ChoiceField(choices=ReportExport.Format.choices, default=ReportExport.Format.CSV)
    parameters = serializers.JSONField(required=False, default=dict)

    def validate_report_type(self, value: str) -> str:
        report_type = value.strip().lower()
        if report_type not in SUPPORTED_REPORT_TYPES:
            raise serializers.ValidationError('Unsupported report type.')
        return report_type
