from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.cameras.models import Camera
from apps.core.responses import success_response
from apps.drivers.models import Driver
from apps.detections.models import Detection
from apps.fines.models import Fine
from apps.officers.models import Officer
from apps.notifications.models import Notification
from apps.rbac.permissions import HasRBACRole
from apps.ai_models.models import AIModelVersion
from apps.appeals.models import Appeal
from apps.vehicles.models import Vehicle
from apps.violations.models import Violation
from apps.audit.models import LoginHistory

from .serializers import (
    AnalyticsDashboardSerializer,
    DashboardActivitiesSerializer,
    DashboardAiSummarySerializer,
    DashboardCameraStatusSerializer,
    DashboardNotificationCenterSerializer,
    DashboardChartsSerializer,
    DashboardStatsSerializer,
    DriverDashboardActivitiesSerializer,
    DriverDashboardChartsSerializer,
    DriverDashboardNotificationCenterSerializer,
    DriverDashboardStatsSerializer,
    OfficerDashboardActivitiesSerializer,
    OfficerDashboardCameraStatusSerializer,
    OfficerDashboardChartsSerializer,
    OfficerDashboardNotificationCenterSerializer,
    OfficerDashboardStatsSerializer,
)
from .driver_services import (
    driver_appeals,
    driver_fines,
    driver_violations,
    driver_vehicles,
    get_driver_profile,
)
from .officer_services import (
    get_officer_profile,
    station_cameras,
    station_detections,
    station_violations,
)

User = get_user_model()


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        payload = {
            'total_users': User.objects.count(),
            'total_drivers': Driver.objects.count(),
            'total_officers': Officer.objects.count(),
            'total_vehicles': Vehicle.objects.count(),
            'total_cameras': Camera.objects.count(),
            'cameras_online': Camera.objects.filter(status=Camera.Status.ONLINE).count(),
            'cameras_offline': Camera.objects.exclude(status=Camera.Status.ONLINE).count(),
            'total_violations': Violation.objects.count(),
            'violations_pending': Violation.objects.filter(status=Violation.Status.PENDING).count(),
            'violations_approved': Violation.objects.filter(status=Violation.Status.APPROVED).count(),
        }
        serializer = DashboardStatsSerializer(payload)
        return success_response(serializer.data)


class DashboardChartsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        today = timezone.localdate()
        start_date = today - timedelta(days=6)

        raw_by_day = (
            Violation.objects.filter(detected_at__date__gte=start_date, detected_at__date__lte=today)
            .annotate(day=TruncDate('detected_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        by_day_map = {row['day']: row['count'] for row in raw_by_day}
        violations_by_day = [
            {'label': (start_date + timedelta(days=i)).isoformat(), 'value': by_day_map.get(start_date + timedelta(days=i), 0)}
            for i in range(7)
        ]

        raw_by_status = (
            Violation.objects.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )
        status_labels = {
            Violation.Status.PENDING: 'Pending',
            Violation.Status.APPROVED: 'Approved',
            Violation.Status.REJECTED: 'Rejected',
            Violation.Status.APPEALED: 'Appealed',
        }
        violations_by_status = [
            {'label': status_labels.get(row['status'], row['status']), 'value': row['count']}
            for row in raw_by_status
        ]

        payload = {
            'violations_by_day': violations_by_day,
            'violations_by_status': violations_by_status,
        }
        serializer = DashboardChartsSerializer(payload)
        return success_response(serializer.data)


class DashboardActivitiesView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        login_items = list(
            LoginHistory.objects.select_related('user')
            .order_by('-created_at')[:5]
        )
        violation_items = list(
            Violation.objects.select_related('driver')
            .order_by('-detected_at')[:5]
        )

        items = [
            {
                'type': 'login',
                'title': f"{entry.user.email} login {'success' if entry.success else 'failure'}",
                'subtitle': entry.ip_address or 'Unknown IP',
                'timestamp': entry.created_at,
            }
            for entry in login_items
        ] + [
            {
                'type': 'violation',
                'title': f'Violation #{entry.id} ({entry.status})',
                'subtitle': getattr(entry.driver, 'email', 'Unknown driver'),
                'timestamp': entry.detected_at,
            }
            for entry in violation_items
        ]

        items.sort(key=lambda item: item['timestamp'], reverse=True)
        payload = {'items': items[:10]}
        serializer = DashboardActivitiesSerializer(payload)
        return success_response(serializer.data)


class DashboardAiSummaryView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        today = timezone.localdate()
        detections_qs = Detection.objects.all()
        confidence_avg = detections_qs.aggregate(avg=Avg('confidence'))['avg'] or 0.0
        active_model = AIModelVersion.objects.select_related('ai_model').filter(is_active=True).order_by('-created_at').first()

        top_sign_row = (
            detections_qs.exclude(traffic_sign__isnull=True)
            .values('traffic_sign__name')
            .annotate(count=Count('id'))
            .order_by('-count')
            .first()
        )

        payload = {
            'total_detections': detections_qs.count(),
            'detections_today': detections_qs.filter(detected_at__date=today).count(),
            'avg_confidence': round(float(confidence_avg), 4),
            'active_model': (
                f"{active_model.ai_model.name} v{active_model.version}" if active_model else ''
            ),
            'active_model_accuracy': round(float(active_model.accuracy or 0.0), 4) if active_model else 0.0,
            'top_detected_sign': top_sign_row['traffic_sign__name'] if top_sign_row else '',
        }
        serializer = DashboardAiSummarySerializer(payload)
        return success_response(serializer.data)


class DashboardCameraStatusView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        cameras_qs = Camera.objects.all()
        health_items = list(
            cameras_qs.exclude(status=Camera.Status.ONLINE)
            .order_by('-last_health_check', 'name')[:8]
            .values('code', 'name', 'status', 'location', 'last_health_check')
        )
        payload = {
            'total_cameras': cameras_qs.count(),
            'online': cameras_qs.filter(status=Camera.Status.ONLINE).count(),
            'offline': cameras_qs.filter(status=Camera.Status.OFFLINE).count(),
            'maintenance': cameras_qs.filter(status=Camera.Status.MAINTENANCE).count(),
            'error': cameras_qs.filter(status=Camera.Status.ERROR).count(),
            'health_items': health_items,
        }
        serializer = DashboardCameraStatusSerializer(payload)
        return success_response(serializer.data)


class DashboardNotificationCenterView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        notifications_qs = Notification.objects.order_by('-created_at')
        latest = list(
            notifications_qs.values('id', 'title', 'is_read', 'created_at')[:8],
        )
        payload = {
            'total': notifications_qs.count(),
            'unread': notifications_qs.filter(is_read=False).count(),
            'latest': [
                {
                    'id': str(item['id']),
                    'title': item['title'],
                    'is_read': item['is_read'],
                    'created_at': item['created_at'],
                }
                for item in latest
            ],
        }
        serializer = DashboardNotificationCenterSerializer(payload)
        return success_response(serializer.data)


class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('super_admin', 'admin')]

    def get(self, request):
        days_param = request.query_params.get('days', '30').strip()
        try:
            period_days = max(7, min(int(days_param), 90))
        except ValueError:
            period_days = 30

        today = timezone.localdate()
        start_date = today - timedelta(days=period_days - 1)
        start_dt = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))

        violations_qs = Violation.objects.filter(detected_at__gte=start_dt)
        detections_qs = Detection.objects.filter(detected_at__gte=start_dt)
        fines_qs = Fine.objects.filter(created_at__gte=start_dt)

        def build_daily_series(queryset, date_field: str):
            raw_by_day = (
                queryset.annotate(day=TruncDate(date_field))
                .values('day')
                .annotate(count=Count('id'))
                .order_by('day')
            )
            by_day_map = {row['day']: row['count'] for row in raw_by_day}
            return [
                {'label': (start_date + timedelta(days=i)).isoformat(), 'value': by_day_map.get(start_date + timedelta(days=i), 0)}
                for i in range(period_days)
            ]

        violation_status_labels = {
            Violation.Status.PENDING: 'Pending',
            Violation.Status.APPROVED: 'Approved',
            Violation.Status.REJECTED: 'Rejected',
            Violation.Status.APPEALED: 'Appealed',
        }
        violations_by_status = [
            {'label': violation_status_labels.get(row['status'], row['status']), 'value': row['count']}
            for row in violations_qs.values('status').annotate(count=Count('id')).order_by('status')
        ]

        fine_status_labels = {
            Fine.Status.UNPAID: 'Unpaid',
            Fine.Status.PAID: 'Paid',
            Fine.Status.OVERDUE: 'Overdue',
            Fine.Status.WAIVED: 'Waived',
        }
        fines_by_status = [
            {'label': fine_status_labels.get(row['status'], row['status']), 'value': row['count']}
            for row in fines_qs.values('status').annotate(count=Count('id')).order_by('status')
        ]

        camera_status_labels = {
            Camera.Status.ONLINE: 'Online',
            Camera.Status.OFFLINE: 'Offline',
            Camera.Status.MAINTENANCE: 'Maintenance',
            Camera.Status.ERROR: 'Error',
        }
        camera_status_breakdown = [
            {'label': camera_status_labels.get(row['status'], row['status']), 'value': row['count']}
            for row in Camera.objects.values('status').annotate(count=Count('id')).order_by('status')
        ]

        top_traffic_signs = [
            {'label': row['traffic_sign__name_en'] or 'Unknown sign', 'value': row['count']}
            for row in violations_qs.exclude(traffic_sign__isnull=True)
            .values('traffic_sign__name_en')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        ]

        top_cameras = [
            {'label': row['camera__name'] or row['camera__code'] or 'Unknown camera', 'value': row['count']}
            for row in detections_qs.values('camera__name', 'camera__code')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        ]

        fines_collected = fines_qs.filter(status=Fine.Status.PAID).aggregate(total=Sum('amount'))['total'] or 0
        fines_outstanding = fines_qs.filter(status__in=[Fine.Status.UNPAID, Fine.Status.OVERDUE]).aggregate(
            total=Sum('amount'),
        )['total'] or 0
        confidence_avg = detections_qs.aggregate(avg=Avg('confidence'))['avg'] or 0.0

        payload = {
            'period_days': period_days,
            'total_violations': violations_qs.count(),
            'total_detections': detections_qs.count(),
            'total_fines': fines_qs.count(),
            'fines_collected': int(fines_collected),
            'fines_outstanding': int(fines_outstanding),
            'average_detection_confidence': round(float(confidence_avg), 4),
            'violations_by_day': build_daily_series(violations_qs, 'detected_at'),
            'detections_by_day': build_daily_series(detections_qs, 'detected_at'),
            'violations_by_status': violations_by_status,
            'fines_by_status': fines_by_status,
            'camera_status_breakdown': camera_status_breakdown,
            'top_traffic_signs': top_traffic_signs,
            'top_cameras': top_cameras,
        }
        serializer = AnalyticsDashboardSerializer(payload)
        return success_response(serializer.data)


class OfficerDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        cameras_qs = station_cameras(officer)
        violations_qs = station_violations(officer)
        detections_qs = station_detections(officer)
        today = timezone.localdate()

        payload = {
            'station_name': officer.station.name,
            'badge_number': officer.badge_number,
            'rank': officer.rank,
            'total_cameras': cameras_qs.count(),
            'cameras_online': cameras_qs.filter(status=Camera.Status.ONLINE).count(),
            'cameras_offline': cameras_qs.exclude(status=Camera.Status.ONLINE).count(),
            'total_violations': violations_qs.count(),
            'violations_pending': violations_qs.filter(status=Violation.Status.PENDING).count(),
            'violations_approved': violations_qs.filter(status=Violation.Status.APPROVED).count(),
            'violations_rejected': violations_qs.filter(status=Violation.Status.REJECTED).count(),
            'detections_today': detections_qs.filter(detected_at__date=today).count(),
            'reviewed_by_me': violations_qs.filter(reviewed_by=request.user).count(),
        }
        serializer = OfficerDashboardStatsSerializer(payload)
        return success_response(serializer.data)


class OfficerDashboardChartsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        violations_qs = station_violations(officer)
        today = timezone.localdate()
        start_date = today - timedelta(days=6)

        raw_by_day = (
            violations_qs.filter(detected_at__date__gte=start_date, detected_at__date__lte=today)
            .annotate(day=TruncDate('detected_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        by_day_map = {row['day']: row['count'] for row in raw_by_day}
        violations_by_day = [
            {'label': (start_date + timedelta(days=i)).isoformat(), 'value': by_day_map.get(start_date + timedelta(days=i), 0)}
            for i in range(7)
        ]

        status_labels = {
            Violation.Status.PENDING: 'Pending',
            Violation.Status.APPROVED: 'Approved',
            Violation.Status.REJECTED: 'Rejected',
            Violation.Status.APPEALED: 'Appealed',
        }
        violations_by_status = [
            {'label': status_labels.get(row['status'], row['status']), 'value': row['count']}
            for row in violations_qs.values('status').annotate(count=Count('id')).order_by('status')
        ]

        payload = {
            'violations_by_day': violations_by_day,
            'violations_by_status': violations_by_status,
        }
        serializer = OfficerDashboardChartsSerializer(payload)
        return success_response(serializer.data)


class OfficerDashboardActivitiesView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        violations_qs = station_violations(officer)
        detections_qs = station_detections(officer)

        violation_items = list(
            violations_qs.select_related('driver', 'camera')
            .order_by('-detected_at')[:5]
        )
        detection_items = list(
            detections_qs.select_related('camera')
            .order_by('-detected_at')[:5]
        )

        items = [
            {
                'type': 'violation',
                'title': f'Violation #{entry.id} ({entry.status})',
                'subtitle': getattr(entry.driver, 'email', 'Unknown driver'),
                'timestamp': entry.detected_at,
            }
            for entry in violation_items
        ] + [
            {
                'type': 'detection',
                'title': f'Detection #{entry.id} @ {entry.camera.name}',
                'subtitle': entry.plate_number or 'No plate',
                'timestamp': entry.detected_at,
            }
            for entry in detection_items
        ]

        items.sort(key=lambda item: item['timestamp'], reverse=True)
        payload = {'items': items[:10]}
        serializer = OfficerDashboardActivitiesSerializer(payload)
        return success_response(serializer.data)


class OfficerDashboardCameraStatusView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        officer = get_officer_profile(request.user)
        cameras_qs = station_cameras(officer)
        health_items = list(
            cameras_qs.exclude(status=Camera.Status.ONLINE)
            .order_by('-last_health_check', 'name')[:8]
            .values('code', 'name', 'status', 'location', 'last_health_check')
        )
        payload = {
            'total_cameras': cameras_qs.count(),
            'online': cameras_qs.filter(status=Camera.Status.ONLINE).count(),
            'offline': cameras_qs.filter(status=Camera.Status.OFFLINE).count(),
            'maintenance': cameras_qs.filter(status=Camera.Status.MAINTENANCE).count(),
            'error': cameras_qs.filter(status=Camera.Status.ERROR).count(),
            'health_items': health_items,
        }
        serializer = OfficerDashboardCameraStatusSerializer(payload)
        return success_response(serializer.data)


class OfficerDashboardNotificationCenterView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('officer')]

    def get(self, request):
        notifications_qs = Notification.objects.filter(user=request.user).order_by('-created_at')
        latest = list(
            notifications_qs.values('id', 'title', 'is_read', 'created_at')[:8],
        )
        payload = {
            'total': notifications_qs.count(),
            'unread': notifications_qs.filter(is_read=False).count(),
            'latest': [
                {
                    'id': str(item['id']),
                    'title': item['title'],
                    'is_read': item['is_read'],
                    'created_at': item['created_at'],
                }
                for item in latest
            ],
        }
        serializer = OfficerDashboardNotificationCenterSerializer(payload)
        return success_response(serializer.data)


class DriverDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        driver = get_driver_profile(request.user)
        violations_qs = driver_violations(request.user)
        fines_qs = driver_fines(request.user)
        appeals_qs = driver_appeals(request.user)

        outstanding_amount = fines_qs.filter(
            status__in=[Fine.Status.UNPAID, Fine.Status.OVERDUE],
        ).aggregate(total=Sum('amount'))['total'] or 0

        payload = {
            'license_number': driver.license_number,
            'license_expiry': driver.license_expiry,
            'total_vehicles': driver_vehicles(request.user).count(),
            'total_violations': violations_qs.count(),
            'violations_pending': violations_qs.filter(status=Violation.Status.PENDING).count(),
            'violations_approved': violations_qs.filter(status=Violation.Status.APPROVED).count(),
            'violations_rejected': violations_qs.filter(status=Violation.Status.REJECTED).count(),
            'total_fines': fines_qs.count(),
            'fines_unpaid': fines_qs.filter(status=Fine.Status.UNPAID).count(),
            'fines_paid': fines_qs.filter(status=Fine.Status.PAID).count(),
            'fines_overdue': fines_qs.filter(status=Fine.Status.OVERDUE).count(),
            'outstanding_amount': int(outstanding_amount),
            'appeals_active': appeals_qs.filter(
                status__in=[Appeal.Status.SUBMITTED, Appeal.Status.UNDER_REVIEW],
            ).count(),
        }
        serializer = DriverDashboardStatsSerializer(payload)
        return success_response(serializer.data)


class DriverDashboardChartsView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        violations_qs = driver_violations(request.user)
        fines_qs = driver_fines(request.user)
        today = timezone.localdate()
        start_date = today - timedelta(days=6)

        raw_by_day = (
            violations_qs.filter(detected_at__date__gte=start_date, detected_at__date__lte=today)
            .annotate(day=TruncDate('detected_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        by_day_map = {row['day']: row['count'] for row in raw_by_day}
        violations_by_day = [
            {'label': (start_date + timedelta(days=i)).isoformat(), 'value': by_day_map.get(start_date + timedelta(days=i), 0)}
            for i in range(7)
        ]

        status_labels = {
            Violation.Status.PENDING: 'Pending',
            Violation.Status.APPROVED: 'Approved',
            Violation.Status.REJECTED: 'Rejected',
            Violation.Status.APPEALED: 'Appealed',
        }
        violations_by_status = [
            {'label': status_labels.get(row['status'], row['status']), 'value': row['count']}
            for row in violations_qs.values('status').annotate(count=Count('id')).order_by('status')
        ]

        fine_status_labels = {
            Fine.Status.UNPAID: 'Unpaid',
            Fine.Status.PAID: 'Paid',
            Fine.Status.OVERDUE: 'Overdue',
            Fine.Status.WAIVED: 'Waived',
        }
        fines_by_status = [
            {'label': fine_status_labels.get(row['status'], row['status']), 'value': row['count']}
            for row in fines_qs.values('status').annotate(count=Count('id')).order_by('status')
        ]

        payload = {
            'violations_by_day': violations_by_day,
            'violations_by_status': violations_by_status,
            'fines_by_status': fines_by_status,
        }
        serializer = DriverDashboardChartsSerializer(payload)
        return success_response(serializer.data)


class DriverDashboardActivitiesView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        violations_qs = driver_violations(request.user)
        fines_qs = driver_fines(request.user)

        violation_items = list(
            violations_qs.select_related('vehicle', 'traffic_sign')
            .order_by('-detected_at')[:5]
        )
        fine_items = list(
            fines_qs.select_related('violation', 'violation__vehicle')
            .order_by('-created_at')[:5]
        )

        items = [
            {
                'type': 'violation',
                'title': f'Violation #{entry.id} ({entry.status})',
                'subtitle': entry.vehicle.plate_number if entry.vehicle_id else 'Unknown vehicle',
                'timestamp': entry.detected_at,
            }
            for entry in violation_items
        ] + [
            {
                'type': 'fine',
                'title': f'Fine {entry.reference_number} ({entry.status})',
                'subtitle': f'{entry.amount} {entry.currency}',
                'timestamp': entry.created_at,
            }
            for entry in fine_items
        ]

        items.sort(key=lambda item: item['timestamp'], reverse=True)
        payload = {'items': items[:10]}
        serializer = DriverDashboardActivitiesSerializer(payload)
        return success_response(serializer.data)


class DriverDashboardNotificationCenterView(APIView):
    permission_classes = [IsAuthenticated, HasRBACRole('driver')]

    def get(self, request):
        notifications_qs = Notification.objects.filter(user=request.user).order_by('-created_at')
        latest = list(
            notifications_qs.values('id', 'title', 'is_read', 'created_at')[:8],
        )
        payload = {
            'total': notifications_qs.count(),
            'unread': notifications_qs.filter(is_read=False).count(),
            'latest': [
                {
                    'id': str(item['id']),
                    'title': item['title'],
                    'is_read': item['is_read'],
                    'created_at': item['created_at'],
                }
                for item in latest
            ],
        }
        serializer = DriverDashboardNotificationCenterSerializer(payload)
        return success_response(serializer.data)
