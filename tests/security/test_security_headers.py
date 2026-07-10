import pytest


@pytest.mark.django_db
def test_security_headers_are_applied(api_client):
    response = api_client.get('/health/')

    assert response['X-Content-Type-Options'] == 'nosniff'
    assert response['Referrer-Policy'] == 'strict-origin-when-cross-origin'
    assert 'Permissions-Policy' in response


@pytest.mark.django_db
def test_unauthenticated_users_cannot_list_managed_users(api_client):
    response = api_client.get('/api/v1/users/management/')

    assert response.status_code == 401
