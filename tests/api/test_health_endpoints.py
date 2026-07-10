import pytest


@pytest.mark.django_db
def test_root_health_endpoint(api_client):
    response = api_client.get('/health/')

    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


@pytest.mark.django_db
def test_api_health_endpoint(api_client):
    response = api_client.get('/api/v1/health/')

    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'ok'
    assert payload['service'] == 'backend'


@pytest.mark.django_db
def test_api_root_lists_core_routes(api_client):
    response = api_client.get('/api/v1/')

    assert response.status_code == 200
    payload = response.json()
    assert payload['service'] == 'camtraffic-api'
    assert payload['auth']['login'] == '/api/v1/auth/login/'
