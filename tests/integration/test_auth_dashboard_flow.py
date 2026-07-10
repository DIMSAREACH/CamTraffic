import pytest


@pytest.mark.django_db
def test_login_profile_and_dashboard_flow(api_client, admin_user):
    login_response = api_client.post(
        '/api/v1/auth/login/',
        {'email': 'admin@camtraffic.kh', 'password': 'admin1234'},
        format='json',
    )
    assert login_response.status_code == 200

    access_token = login_response.json()['data']['tokens']['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    profile_response = api_client.get('/api/v1/users/profile/me/')
    assert profile_response.status_code == 200
    assert profile_response.json()['data']['email'] == admin_user.email

    dashboard_response = api_client.get('/api/v1/dashboard/stats/')
    assert dashboard_response.status_code == 200
    stats = dashboard_response.json()['data']
    assert 'total_users' in stats
    assert 'total_violations' in stats
