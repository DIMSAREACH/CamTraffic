from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from ai_detection.models import AIDetectionLog

User = get_user_model()
admin = User.objects.filter(role='admin').first()
print('admin', admin.email if admin else None)
client = APIClient()
client.defaults['HTTP_HOST'] = 'localhost'

res = client.post('/api/auth/login/', {'email': admin.email, 'password': 'Test@12345'}, format='json')
print('login status', res.status_code, getattr(res, 'data', None))
if res.status_code != 200:
    raise SystemExit('login failed')

token = res.data['data']['access']
client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

log = AIDetectionLog.objects.filter(id='cb027c14-99d4-4aec-aad3-6763ae6dd715').first()
print('log id', log.id if log else None, 'plate', log.detected_plate if log else None)

violation_res = client.post('/api/violations/', {
    'class_key': 'NO_STOPPING',
    'observed_action': 'STOPPING',
    'location': 'Street 272',
    'ai_detection_log_id': str(log.id)
}, format='json')
print('violation status', violation_res.status_code, getattr(violation_res, 'data', None))
