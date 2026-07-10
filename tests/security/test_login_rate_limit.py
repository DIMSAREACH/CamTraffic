import pytest
from django.test import override_settings


@pytest.mark.django_db
@override_settings(
    SECURITY_LOGIN_RATE_LIMIT_ENABLED=True,
    SECURITY_LOGIN_RATE_LIMIT_ATTEMPTS=3,
    SECURITY_LOGIN_RATE_LIMIT_WINDOW_SECONDS=300,
)
def test_login_rate_limit_blocks_excessive_attempts(api_client, admin_user):
    payload = {'email': 'admin@camtraffic.kh', 'password': 'wrong-password'}

    for _ in range(3):
        response = api_client.post('/api/v1/auth/login/', payload, format='json')
        assert response.status_code == 400

    blocked = api_client.post('/api/v1/auth/login/', payload, format='json')
    assert blocked.status_code == 429
    assert blocked.json()['success'] is False
