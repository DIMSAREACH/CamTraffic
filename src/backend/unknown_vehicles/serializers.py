from rest_framework import serializers

from .models import UnknownVehicle


class UnknownVehicleSerializer(serializers.ModelSerializer):
    camera_id = serializers.UUIDField(source='camera.id', read_only=True, allow_null=True)
    camera_name = serializers.CharField(source='camera.name', read_only=True, allow_null=True)
    resolved_by_name = serializers.CharField(source='resolved_by.full_name', read_only=True, allow_null=True)
    linked_vehicle_plate = serializers.CharField(source='linked_vehicle.plate_number', read_only=True, allow_null=True)
    evidence_photo = serializers.SerializerMethodField()

    class Meta:
        model = UnknownVehicle
        fields = (
            'id', 'plate_detected', 'camera_id', 'camera_name', 'violation_type',
            'evidence_photo', 'ai_confidence_score', 'is_resolved', 'resolved_by',
            'resolved_by_name', 'linked_vehicle', 'linked_vehicle_plate',
            'linked_violation', 'officer_note', 'detected_at', 'resolved_at',
        )
        read_only_fields = (
            'id', 'detected_at', 'resolved_at', 'resolved_by', 'resolved_by_name',
        )

    def get_evidence_photo(self, obj):
        if not obj.evidence_photo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.evidence_photo.url)
        return obj.evidence_photo.url
