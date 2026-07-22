import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
import django

django.setup()

from ai_detection.models import AIDetectionLog
from vehicles.models import Vehicle
from users.models import Driver
from violations.models import ViolationRule
from traffic_signs.models import TrafficSign

qs = AIDetectionLog.objects.filter(detected_sign__isnull=False).exclude(detected_sign__in=['ស្លាកមិនស្គាល់', '']).order_by('-created_at')
print('total non-unknown sign logs:', qs.count())
print('matched vehicle count:', qs.filter(matched_vehicle_id__isnull=False).count())
print('--- recent logs ---')
for log in qs[:20]:
    print('LOG', log.id, repr(log.detected_sign), 'plate=', repr(log.detected_plate), 'conf=', log.confidence, 'matched_vehicle=', log.matched_vehicle_id)
    if log.detected_plate:
        v = Vehicle.objects.filter(plate_number__iexact=log.detected_plate).first()
        print('   plate lookup vehicle:', v.id if v else None, 'driver', v.driver_id if v else None)
        if v and v.driver_id:
            d = Driver.objects.filter(pk=v.driver_id).first()
            print('      driver user:', d.user.full_name if d else None)

print('--- rules ---')
for rule in ViolationRule.objects.filter(is_active=True).order_by('sign_class_key'):
    print(rule.sign_class_key, rule.prohibited_action, rule.title)

print('--- traffic sign lookup for ឈប់ ---')
for sign in TrafficSign.objects.filter(sign_name_km__icontains='ឈប់')[:20]:
    print(sign.id, sign.sign_name_km, sign.sign_name, sign.sign_name_en, sign.sign_code)

print('--- ai logs with sign ឈប់ or ហាមចូល ---')
for log in AIDetectionLog.objects.filter(detected_sign__in=['ឈប់', 'ហាមចូល']).order_by('-created_at')[:20]:
    print('LOG', log.id, repr(log.detected_sign), 'plate=', repr(log.detected_plate), 'conf=', log.confidence, 'matched_vehicle=', log.matched_vehicle_id)
    if log.detected_plate:
        v = Vehicle.objects.filter(plate_number__iexact=log.detected_plate).first()
        print('   plate lookup vehicle:', v.id if v else None, 'driver', v.driver_id if v else None)
        if v and v.driver_id:
            d = Driver.objects.filter(pk=v.driver_id).first()
            print('      driver user:', d.user.full_name if d else None)
