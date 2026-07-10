"""Seed CamTraffic database with initial reference data."""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import User
from apps.ai_models.models import AIModel, AIModelVersion
from apps.audit.models import AuditLog
from apps.notifications.models import NotificationTemplate
from apps.officers.models import PoliceStation
from apps.rbac.models import Permission, Role
from apps.system.models import SystemSetting
from apps.traffic_signs.models import SignCategory, TrafficSign

UserModel = get_user_model()


class Command(BaseCommand):
    help = 'Seed reference data for CamTraffic (roles, signs, stations, settings)'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        roles = self._seed_roles()
        self._seed_permissions(roles)
        self._seed_sign_categories()
        self._seed_traffic_signs()
        self._seed_police_stations()
        self._seed_ai_models()
        self._seed_system_settings()
        self._seed_notification_templates()
        self._seed_super_admin()
        self._seed_audit_logs()

        self.stdout.write(self.style.SUCCESS('Database seeded successfully.'))

    def _seed_roles(self) -> dict[str, Role]:
        role_defs = [
            ('super_admin', 'Super Administrator', 'Full system access'),
            ('admin', 'Administrator', 'Admin portal access'),
            ('officer', 'Traffic Officer', 'Officer portal access'),
            ('driver', 'Driver', 'Driver portal access'),
        ]
        roles = {}
        for slug, name, description in role_defs:
            role, _ = Role.objects.update_or_create(
                slug=slug,
                defaults={'name': name, 'description': description},
            )
            roles[slug] = role
        return roles

    def _seed_permissions(self, roles: dict[str, Role]) -> None:
        permissions = [
            ('view_dashboard', 'View Dashboard', 'dashboard'),
            ('manage_users', 'Manage Users', 'users'),
            ('manage_officers', 'Manage Officers', 'officers'),
            ('manage_cameras', 'Manage Cameras', 'cameras'),
            ('review_violations', 'Review Violations', 'violations'),
            ('manage_fines', 'Manage Fines', 'fines'),
            ('view_reports', 'View Reports', 'reports'),
            ('manage_system', 'Manage System Settings', 'system'),
        ]
        for codename, name, module in permissions:
            perm, _ = Permission.objects.update_or_create(
                codename=codename,
                defaults={'name': name, 'module': module},
            )
            roles['super_admin'].permissions.add(perm)
            roles['admin'].permissions.add(perm)

        roles['officer'].permissions.add(
            Permission.objects.get(codename='view_dashboard'),
            Permission.objects.get(codename='review_violations'),
        )

    def _seed_sign_categories(self) -> None:
        categories = [
            ('REG', 'Regulatory Signs', 'ផ្លាកគោល'),
            ('WARN', 'Warning Signs', 'ផ្លាកព្រមាន'),
            ('INFO', 'Information Signs', 'ផ្លាកព័ត៌មាន'),
            ('PROH', 'Prohibition Signs', 'ផ្លាកហាមឃាត់'),
        ]
        for code, name_en, name_km in categories:
            SignCategory.objects.update_or_create(
                code=code,
                defaults={'name_en': name_en, 'name_km': name_km},
            )

    def _seed_traffic_signs(self) -> None:
        signs = [
            ('P-001', 'Stop', 'ឈប់', 'PROH', 40000),
            ('P-002', 'No Entry', 'ហាមចូល', 'PROH', 50000),
            ('R-001', 'Speed Limit 40', 'កំណត់ល្បឿន ៤០', 'REG', 30000),
            ('R-002', 'Speed Limit 60', 'កំណត់ល្បឿន ៦០', 'REG', 30000),
            ('W-001', 'Sharp Curve', 'ផ្លូវโค้ง', 'WARN', 25000),
        ]
        for code, name_en, name_km, cat_code, fine in signs:
            category = SignCategory.objects.get(code=cat_code)
            TrafficSign.objects.update_or_create(
                code=code,
                defaults={
                    'name_en': name_en,
                    'name_km': name_km,
                    'category': category,
                    'fine_amount': fine,
                },
            )

    def _seed_police_stations(self) -> None:
        stations = [
            ('PP-001', 'Phnom Penh Traffic Police HQ', 'ស្តង់ដាប៉ុលិសចរាចរណ៍ភ្នំពេញ', 'Phnom Penh', 'Chamkarmon'),
            ('SR-001', 'Siem Reap Traffic Police', 'ប៉ុលិសចរាចរណ៍សៀមរាប', 'Siem Reap', 'Siem Reap'),
        ]
        for code, name, address, province, district in stations:
            PoliceStation.objects.update_or_create(
                code=code,
                defaults={
                    'name': name,
                    'address': address,
                    'province': province,
                    'district': district,
                },
            )

    def _seed_ai_models(self) -> None:
        model, _ = AIModel.objects.update_or_create(
            slug='yolov11-traffic-signs',
            defaults={
                'name': 'YOLOv11 Traffic Signs',
                'model_type': AIModel.ModelType.YOLO,
                'description': 'Traffic sign detection model for Cambodia',
            },
        )
        AIModelVersion.objects.update_or_create(
            ai_model=model,
            version='1.0.0',
            defaults={
                'weights_path': 'models/yolov11_traffic_signs_v1.pt',
                'status': AIModelVersion.Status.READY,
                'accuracy': 0.92,
                'is_active': True,
            },
        )

    def _seed_system_settings(self) -> None:
        settings_data = [
            ('site_name', 'CamTraffic', 'string', 'Application name', True),
            ('default_currency', 'KHR', 'string', 'Default fine currency', True),
            ('fine_due_days', '30', 'integer', 'Days until fine is due', False),
            ('enable_appeals', 'true', 'boolean', 'Allow violation appeals', False),
        ]
        for key, value, value_type, description, is_public in settings_data:
            SystemSetting.objects.update_or_create(
                key=key,
                defaults={
                    'value': value,
                    'value_type': value_type,
                    'description': description,
                    'is_public': is_public,
                },
            )

    def _seed_notification_templates(self) -> None:
        templates = [
            (
                'violation_detected',
                'Violation Detected',
                NotificationTemplate.Channel.IN_APP,
                'New traffic violation detected',
                'ការបំពានចរាចរណ៍ថ្មីត្រូវបានរកឃើញ',
                'A new violation was detected at {{camera_name}}. Please review the evidence.',
                'ការបំពានថ្មីត្រូវបានរកឃើញនៅ {{camera_name}}។ សូមពិនិត្យភស្តុតាង។',
            ),
            (
                'fine_issued',
                'Fine Issued',
                NotificationTemplate.Channel.EMAIL,
                'Traffic fine issued',
                'ការពិន័យចរាចរណ៍ត្រូវបានចេញ',
                'A fine of {{amount}} {{currency}} has been issued for violation {{reference}}.',
                'ការពិន័យ {{amount}} {{currency}} ត្រូវបានចេញសម្រាប់ការបំពាន {{reference}}។',
            ),
            (
                'password_reset',
                'Password Reset',
                NotificationTemplate.Channel.EMAIL,
                'Reset your CamTraffic password',
                'កំណត់ពាក្យសម្ងាត់ CamTraffic របស់អ្នកឡើងវិញ',
                'Use the link below to reset your password: {{reset_link}}',
                'ប្រើតំណខាងក្រោមដើម្បីកំណត់ពាក្យសម្ងាត់របស់អ្នកឡើងវិញ៖ {{reset_link}}',
            ),
            (
                'appeal_submitted',
                'Appeal Submitted',
                NotificationTemplate.Channel.SMS,
                'Appeal received',
                'បានទទួលពាក្យអាយ្យការ',
                'Your appeal for violation {{reference}} has been submitted for review.',
                'ពាក្យអាយ្យការរបស់អ្នកសម្រាប់ការបំពាន {{reference}} ត្រូវបានដាក់ស្នើសម្រាប់ពិនិត្យ។',
            ),
        ]

        for code, name, channel, subject_en, subject_km, body_en, body_km in templates:
            NotificationTemplate.objects.update_or_create(
                code=code,
                defaults={
                    'name': name,
                    'channel': channel,
                    'subject_en': subject_en,
                    'subject_km': subject_km,
                    'body_en': body_en,
                    'body_km': body_km,
                    'is_active': True,
                },
            )

    def _seed_super_admin(self) -> None:
        if UserModel.objects.filter(username='admin').exists():
            return

        UserModel.objects.create_superuser(
            username='admin',
            email='admin@camtraffic.kh',
            password='admin1234',
            role=User.Role.SUPER_ADMIN,
            first_name='System',
            last_name='Administrator',
        )
        self.stdout.write('  Created superuser: admin / admin1234')

    def _seed_audit_logs(self) -> None:
        if AuditLog.objects.exists():
            return

        admin = UserModel.objects.filter(username='admin').first()
        if admin is None:
            return

        samples = [
            (AuditLog.Action.LOGIN, 'auth', 'User', str(admin.id), 'Administrator logged in', '127.0.0.1'),
            (AuditLog.Action.CREATE, 'users', 'User', '2', 'Created traffic officer account', '127.0.0.1'),
            (AuditLog.Action.UPDATE, 'cameras', 'Camera', '1', 'Updated camera stream URL', '127.0.0.1'),
            (AuditLog.Action.CREATE, 'traffic_signs', 'TrafficSign', 'P-001', 'Added stop sign to catalog', '127.0.0.1'),
            (AuditLog.Action.DELETE, 'roles', 'Role', 'guest', 'Removed unused guest role', '127.0.0.1'),
            (AuditLog.Action.UPDATE, 'system', 'SystemSetting', 'site_name', 'Updated application display name', '127.0.0.1'),
            (AuditLog.Action.OTHER, 'reports', 'ReportExport', '1', 'Generated violations CSV export', '127.0.0.1'),
            (AuditLog.Action.LOGOUT, 'auth', 'User', str(admin.id), 'Administrator logged out', '127.0.0.1'),
        ]

        for action, module, object_type, object_id, description, ip_address in samples:
            AuditLog.objects.create(
                user=admin,
                action=action,
                module=module,
                object_type=object_type,
                object_id=object_id,
                description=description,
                ip_address=ip_address,
                user_agent='CamTraffic-Seed/1.0',
            )

        self.stdout.write(f'  Seeded {len(samples)} audit log records')
