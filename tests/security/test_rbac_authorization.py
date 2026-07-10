import pytest


@pytest.mark.django_db
def test_driver_cannot_access_admin_user_management(authenticated_driver_client):
    list_response = authenticated_driver_client.get('/api/v1/users/management/')
    detail_response = authenticated_driver_client.get('/api/v1/users/management/1/')

    assert list_response.status_code == 403
    assert detail_response.status_code in {403, 404}
