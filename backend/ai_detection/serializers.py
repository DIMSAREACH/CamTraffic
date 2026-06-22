from rest_framework import serializers

from .models import AIDetectionLog
from .result_compose import compose_detection_payload


class AIDetectionLogSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_profile_image = serializers.SerializerMethodField()
    uploaded_image = serializers.SerializerMethodField()
    detection_mode = serializers.SerializerMethodField()
    display_label = serializers.SerializerMethodField()
    display_label_en = serializers.SerializerMethodField()
    display_label_km = serializers.SerializerMethodField()
    display_confidence = serializers.SerializerMethodField()
    display_description = serializers.SerializerMethodField()
    display_description_en = serializers.SerializerMethodField()
    matched_vehicle = serializers.SerializerMethodField()
    vehicle_snapshot = serializers.SerializerMethodField()
    plate_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = AIDetectionLog
        fields = (
            'id', 'user_id', 'user_name', 'user_profile_image', 'uploaded_image', 'detected_sign',
            'confidence', 'description', 'guidance', 'vehicle_count', 'detected_vehicles',
            'detected_plate', 'plate_confidence', 'plate_type', 'plate_ocr_details',
            'matched_vehicle_id', 'matched_vehicle', 'vehicle_snapshot', 'plate_snapshot',
            'detection_mode', 'display_label', 'display_label_en', 'display_label_km',
            'display_confidence', 'display_description', 'display_description_en',
            'created_at',
        )

    def _composed(self, obj: AIDetectionLog) -> dict:
        cache = getattr(self, '_compose_cache', None)
        if cache is None:
            cache = {}
            setattr(self, '_compose_cache', cache)
        if obj.pk not in cache:
            sign_en = ''
            sign_km = obj.detected_sign
            sign_code = ''
            class_key = ''
            if obj.detected_sign == 'ស្លាកមិនស្គាល់':
                sign_en = 'Unknown sign'
            else:
                from traffic_signs.models import TrafficSign

                sign = (
                    TrafficSign.objects.filter(sign_name_km=obj.detected_sign).first()
                    or TrafficSign.objects.filter(sign_name=obj.detected_sign).first()
                    or TrafficSign.objects.filter(sign_name_en__iexact=obj.detected_sign).first()
                )
                if sign:
                    sign_km = sign.sign_name_km or sign.sign_name or sign_km
                    sign_en = sign.sign_name_en or sign_en
                    sign_code = sign.sign_code or ''
                    class_key = (sign.sign_code or '').lower().replace('-', '_')
            plate_result = None
            if obj.detected_plate:
                plate_result = {
                    'plate_text': obj.detected_plate,
                    'plate_confidence': obj.plate_confidence,
                    'plate_type': obj.plate_type,
                    'raw_reads': obj.plate_ocr_details or [],
                }
                if obj.matched_vehicle_id:
                    vehicle = obj.matched_vehicle
                    if vehicle:
                        plate_result['matched_vehicle'] = {
                            'id': str(vehicle.id),
                            'plate_number': vehicle.plate_number,
                            'owner_name': vehicle.owner.full_name,
                            'vehicle_type': vehicle.vehicle_type,
                        }
            cache[obj.pk] = compose_detection_payload(
                {
                    'sign_name': sign_km,
                    'sign_name_en': sign_en,
                    'sign_name_km': sign_km,
                    'sign_code': sign_code,
                    'class_key': class_key,
                    'confidence': obj.confidence,
                    'description': obj.description,
                    'guidance': obj.guidance,
                },
                obj.detected_vehicles or [],
                plate_result,
            )
        return cache[obj.pk]

    def get_detection_mode(self, obj):
        return self._composed(obj).get('detection_mode', 'sign')

    def get_display_label(self, obj):
        c = self._composed(obj)
        return c.get('display_title_km') or c.get('display_title') or obj.detected_sign

    def get_display_label_en(self, obj):
        c = self._composed(obj)
        return c.get('display_title_en') or obj.detected_sign

    def get_display_label_km(self, obj):
        c = self._composed(obj)
        return c.get('display_title_km') or obj.detected_sign

    def get_display_confidence(self, obj):
        c = self._composed(obj)
        return float(c.get('display_confidence', obj.confidence))

    def get_display_description(self, obj):
        return self._composed(obj).get('description') or obj.description

    def get_display_description_en(self, obj):
        return self._composed(obj).get('description_en') or obj.description

    def get_matched_vehicle(self, obj):
        return self._composed(obj).get('matched_vehicle')

    def get_user_profile_image(self, obj):
        user = getattr(obj, 'user', None)
        if not user or not user.profile_image:
            return ''
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(user.profile_image.url)
        return user.profile_image.url

    def get_uploaded_image(self, obj):
        if obj.uploaded_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.uploaded_image.url)
            return obj.uploaded_image.url
        return ''

    def get_vehicle_snapshot(self, obj):
        if not obj.vehicle_snapshot:
            return ''
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.vehicle_snapshot.url)
        return obj.vehicle_snapshot.url

    def get_plate_snapshot(self, obj):
        if not obj.plate_snapshot:
            return ''
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.plate_snapshot.url)
        return obj.plate_snapshot.url
