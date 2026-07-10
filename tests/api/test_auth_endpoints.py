import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_login_returns_tokens_for_valid_credentials(api_client, admin_user):
    response = api_client.post(
        '/api/v1/auth/login/',
        {'email': 'admin@camtraffic.kh', 'password': 'admin1234'},
        format='json',
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['success'] is True
    assert payload['data']['tokens']['access']
    assert payload['data']['tokens']['refresh']
    assert payload['data']['user']['email'] == 'admin@camtraffic.kh'


@pytest.mark.django_db
def test_login_rejects_invalid_credentials(api_client, admin_user):
    response = api_client.post(
        '/api/v1/auth/login/',
        {'email': 'admin@camtraffic.kh', 'password': 'wrong-password'},
        format='json',
    )

    assert response.status_code == 400
    assert response.json()['success'] is False


@pytest.mark.django_db
def test_me_requires_authentication(api_client):
    response = api_client.get('/api/v1/auth/me/')

    assert response.status_code == 401


@pytest.mark.django_db
def test_me_returns_current_user(authenticated_admin_client, admin_user):
    response = authenticated_admin_client.get('/api/v1/auth/me/')

    assert response.status_code == 200
    assert response.json()['data']['email'] == admin_user.email
