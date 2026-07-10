from rest_framework import serializers

from .models import Detection


class DetectionMonitorSerializer(serializers.ModelSerializer):
    camera_id = serializers.IntegerField(source='camera.id', read_only=True)
    camera_name = serializers.CharField(source='camera.name', read_only=True)
    camera_code = serializers.CharField(source='camera.code', read_only=True)
    model_version_id = serializers.IntegerField(source='model_version.id', read_only=True, allow_null=True)
    model_name = serializers.CharField(source='model_version.ai_model.name', read_only=True, allow_null=True)
    version_label = serializers.CharField(source='model_version.version', read_only=True, allow_null=True)
    traffic_sign_id = serializers.IntegerField(source='traffic_sign.id', read_only=True, allow_null=True)
    traffic_sign_code = serializers.CharField(source='traffic_sign.code', read_only=True, allow_null=True)
    traffic_sign_name = serializers.CharField(source='traffic_sign.name_en', read_only=True, allow_null=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Detection
        fields = (
            'id',
            'camera_id',
            'camera_name',
            'camera_code',
            'model_version_id',
            'model_name',
            'version_label',
            'traffic_sign_id',
            'traffic_sign_code',
            'traffic_sign_name',
            'confidence',
            'plate_number',
            'plate_confidence',
            'image_url',
            'detected_at',
            'created_at',
        )
        read_only_fields = fields

    def get_image_url(self, obj: Detection) -> str | None:
        if not obj.image:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class DetectionMonitorSummarySerializer(serializers.Serializer):
    total_detections = serializers.IntegerField()
    detections_today = serializers.IntegerField()
    average_confidence = serializers.FloatField()
    low_confidence_count = serializers.IntegerField()
    latest_detected_at = serializers.DateTimeField(allow_null=True)


class OfficerLiveDetectionCameraOptionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    code = serializers.CharField()
    status = serializers.CharField()


class DetectionOCRSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    raw_text = serializers.CharField()
    confidence = serializers.FloatField()
    language = serializers.CharField()


class DetectionDetailSerializer(DetectionMonitorSerializer):
    bounding_box = serializers.JSONField()
    metadata = serializers.JSONField()
    ocr_result = serializers.SerializerMethodField()

    class Meta(DetectionMonitorSerializer.Meta):
        fields = DetectionMonitorSerializer.Meta.fields + (
            'bounding_box',
            'metadata',
            'ocr_result',
        )

    def get_ocr_result(self, obj: Detection) -> dict | None:
        ocr_result = getattr(obj, 'ocr_result', None)
        if ocr_result is None:
            return None
        return DetectionOCRSummarySerializer(ocr_result).data
