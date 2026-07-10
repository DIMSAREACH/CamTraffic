import pytest


@pytest.mark.django_db
def test_users_list_requires_admin_role(authenticated_driver_client):
    response = authenticated_driver_client.get('/api/v1/users/management/')

    assert response.status_code == 403


@pytest.mark.django_db
def test_users_list_returns_paginated_results(authenticated_admin_client, admin_user):
    response = authenticated_admin_client.get('/api/v1/users/management/')

    assert response.status_code == 200
    payload = response.json()
    assert payload['success'] is True
    assert isinstance(payload['data'], list)
    assert len(payload['data']) >= 1


@pytest.mark.django_db
def test_profile_me_is_available_to_authenticated_users(authenticated_driver_client, driver_user):
    response = authenticated_driver_client.get('/api/v1/users/profile/me/')

    assert response.status_code == 200
    assert response.json()['data']['email'] == driver_user.email
