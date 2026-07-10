import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


def _create_user(*, username: str, email: str, password: str, role: str) -> User:
    return User.objects.create_user(
        username=username,
        email=email,
        password=password,
        role=role,
    )


@pytest.fixture
def admin_user(db):
    return _create_user(
        username='admin',
        email='admin@camtraffic.kh',
        password='admin1234',
        role=User.Role.ADMIN,
    )


@pytest.fixture
def driver_user(db):
    return _create_user(
        username='driver1',
        email='driver@camtraffic.kh',
        password='driver1234',
        role=User.Role.DRIVER,
    )


@pytest.fixture
def authenticated_admin_client(api_client, admin_user):
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def authenticated_driver_client(api_client, driver_user):
    refresh = RefreshToken.for_user(driver_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client
