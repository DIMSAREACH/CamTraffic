from django.contrib import admin

from apps.ai_models.models import AIModel, AIModelVersion
from apps.appeals.models import Appeal
from apps.audit.models import AuditLog, LoginHistory
from apps.cameras.models import Camera
from apps.detections.models import Detection
from apps.drivers.models import Driver
from apps.fines.models import Fine, FinePayment
from apps.notifications.models import Notification, NotificationTemplate
from apps.officers.models import Officer, PoliceStation
from apps.ocr.models import OCRResult
from apps.reports.models import ReportExport
from apps.system.models import BackupRecord, SystemSetting
from apps.traffic_signs.models import SignCategory, TrafficSign
from apps.users.models import UserProfile
from apps.vehicles.models import Vehicle
from apps.violations.models import Violation

admin.site.register(UserProfile)
admin.site.register(PoliceStation)
admin.site.register(Officer)
admin.site.register(Driver)
admin.site.register(Vehicle)
admin.site.register(Camera)
admin.site.register(SignCategory)
admin.site.register(TrafficSign)
admin.site.register(AIModel)
admin.site.register(AIModelVersion)
admin.site.register(Detection)
admin.site.register(OCRResult)
admin.site.register(Violation)
admin.site.register(Fine)
admin.site.register(FinePayment)
admin.site.register(Appeal)
admin.site.register(NotificationTemplate)
admin.site.register(Notification)
admin.site.register(AuditLog)
admin.site.register(LoginHistory)
admin.site.register(SystemSetting)
admin.site.register(BackupRecord)
admin.site.register(ReportExport)
