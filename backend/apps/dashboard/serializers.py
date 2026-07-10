from rest_framework import serializers


class DashboardStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    total_drivers = serializers.IntegerField()
    total_officers = serializers.IntegerField()
    total_vehicles = serializers.IntegerField()
    total_cameras = serializers.IntegerField()
    cameras_online = serializers.IntegerField()
    cameras_offline = serializers.IntegerField()
    total_violations = serializers.IntegerField()
    violations_pending = serializers.IntegerField()
    violations_approved = serializers.IntegerField()


class ChartPointSerializer(serializers.Serializer):
    label = serializers.CharField()
    value = serializers.IntegerField()


class DashboardChartsSerializer(serializers.Serializer):
    violations_by_day = ChartPointSerializer(many=True)
    violations_by_status = ChartPointSerializer(many=True)


class DashboardActivityItemSerializer(serializers.Serializer):
    type = serializers.CharField()
    title = serializers.CharField()
    subtitle = serializers.CharField()
    timestamp = serializers.DateTimeField()


class DashboardActivitiesSerializer(serializers.Serializer):
    items = DashboardActivityItemSerializer(many=True)


class DashboardAiSummarySerializer(serializers.Serializer):
    total_detections = serializers.IntegerField()
    detections_today = serializers.IntegerField()
    avg_confidence = serializers.FloatField()
    active_model = serializers.CharField(allow_blank=True)
    active_model_accuracy = serializers.FloatField()
    top_detected_sign = serializers.CharField(allow_blank=True)


class CameraHealthItemSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    status = serializers.CharField()
    location = serializers.CharField()
    last_health_check = serializers.DateTimeField(allow_null=True)


class DashboardCameraStatusSerializer(serializers.Serializer):
    total_cameras = serializers.IntegerField()
    online = serializers.IntegerField()
    offline = serializers.IntegerField()
    maintenance = serializers.IntegerField()
    error = serializers.IntegerField()
    health_items = CameraHealthItemSerializer(many=True)


class DashboardNotificationItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    is_read = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class DashboardNotificationCenterSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    unread = serializers.IntegerField()
    latest = DashboardNotificationItemSerializer(many=True)


class AnalyticsRankedItemSerializer(serializers.Serializer):
    label = serializers.CharField()
    value = serializers.IntegerField()


class AnalyticsDashboardSerializer(serializers.Serializer):
    period_days = serializers.IntegerField()
    total_violations = serializers.IntegerField()
    total_detections = serializers.IntegerField()
    total_fines = serializers.IntegerField()
    fines_collected = serializers.IntegerField()
    fines_outstanding = serializers.IntegerField()
    average_detection_confidence = serializers.FloatField()
    violations_by_day = ChartPointSerializer(many=True)
    detections_by_day = ChartPointSerializer(many=True)
    violations_by_status = ChartPointSerializer(many=True)
    fines_by_status = ChartPointSerializer(many=True)
    camera_status_breakdown = ChartPointSerializer(many=True)
    top_traffic_signs = AnalyticsRankedItemSerializer(many=True)
    top_cameras = AnalyticsRankedItemSerializer(many=True)


class OfficerDashboardStatsSerializer(serializers.Serializer):
    station_name = serializers.CharField()
    badge_number = serializers.CharField()
    rank = serializers.CharField(allow_blank=True)
    total_cameras = serializers.IntegerField()
    cameras_online = serializers.IntegerField()
    cameras_offline = serializers.IntegerField()
    total_violations = serializers.IntegerField()
    violations_pending = serializers.IntegerField()
    violations_approved = serializers.IntegerField()
    violations_rejected = serializers.IntegerField()
    detections_today = serializers.IntegerField()
    reviewed_by_me = serializers.IntegerField()


class OfficerDashboardChartsSerializer(serializers.Serializer):
    violations_by_day = ChartPointSerializer(many=True)
    violations_by_status = ChartPointSerializer(many=True)


class OfficerDashboardActivitiesSerializer(serializers.Serializer):
    items = DashboardActivityItemSerializer(many=True)


class OfficerDashboardCameraStatusSerializer(serializers.Serializer):
    total_cameras = serializers.IntegerField()
    online = serializers.IntegerField()
    offline = serializers.IntegerField()
    maintenance = serializers.IntegerField()
    error = serializers.IntegerField()
    health_items = CameraHealthItemSerializer(many=True)


class OfficerDashboardNotificationCenterSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    unread = serializers.IntegerField()
    latest = DashboardNotificationItemSerializer(many=True)


class DriverDashboardStatsSerializer(serializers.Serializer):
    license_number = serializers.CharField()
    license_expiry = serializers.DateField(allow_null=True)
    total_vehicles = serializers.IntegerField()
    total_violations = serializers.IntegerField()
    violations_pending = serializers.IntegerField()
    violations_approved = serializers.IntegerField()
    violations_rejected = serializers.IntegerField()
    total_fines = serializers.IntegerField()
    fines_unpaid = serializers.IntegerField()
    fines_paid = serializers.IntegerField()
    fines_overdue = serializers.IntegerField()
    outstanding_amount = serializers.IntegerField()
    appeals_active = serializers.IntegerField()


class DriverDashboardChartsSerializer(serializers.Serializer):
    violations_by_day = ChartPointSerializer(many=True)
    violations_by_status = ChartPointSerializer(many=True)
    fines_by_status = ChartPointSerializer(many=True)


class DriverDashboardActivitiesSerializer(serializers.Serializer):
    items = DashboardActivityItemSerializer(many=True)


class DriverDashboardNotificationCenterSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    unread = serializers.IntegerField()
    latest = DashboardNotificationItemSerializer(many=True)
