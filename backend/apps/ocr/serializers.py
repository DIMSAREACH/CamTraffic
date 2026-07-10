from rest_framework import serializers

from apps.detections.models import Detection

from .models import OCRResult


class OCRResultSerializer(serializers.ModelSerializer):
    detection_id = serializers.IntegerField(source='detection.id', read_only=True)
    plate_number = serializers.CharField(source='detection.plate_number', read_only=True)

    class Meta:
        model = OCRResult
        fields = (
            'id',
            'detection_id',
            'plate_number',
            'raw_text',
            'confidence',
            'language',
            'bounding_box',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class OCRResultCreateSerializer(serializers.Serializer):
    detection_id = serializers.IntegerField(min_value=1)
    raw_text = serializers.CharField(max_length=100)
    confidence = serializers.FloatField(min_value=0, max_value=1)
    language = serializers.CharField(max_length=10, default='en')
    bounding_box = serializers.JSONField(required=False)

    def validate_detection_id(self, value: int) -> int:
        if not Detection.objects.filter(id=value).exists():
            raise serializers.ValidationError('Detection not found.')
        if OCRResult.objects.filter(detection_id=value).exists():
            raise serializers.ValidationError('OCR result already exists for this detection.')
        return value

    def create(self, validated_data):
        detection = Detection.objects.get(id=validated_data['detection_id'])
        ocr_result = OCRResult.objects.create(
            detection=detection,
            raw_text=validated_data['raw_text'].strip(),
            confidence=validated_data['confidence'],
            language=validated_data.get('language', 'en'),
            bounding_box=validated_data.get('bounding_box') or {},
        )
        if validated_data['raw_text'].strip():
            detection.plate_number = validated_data['raw_text'].strip()[:20]
            detection.plate_confidence = validated_data['confidence']
            detection.save(update_fields=['plate_number', 'plate_confidence', 'updated_at'])
        return ocr_result
