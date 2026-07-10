import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_user_str_uses_full_name():
    user = User.objects.create_user(
        username='jdoe',
        email='jdoe@camtraffic.kh',
        password='secret123',
        first_name='John',
        last_name='Doe',
        role=User.Role.DRIVER,
    )

    assert str(user) == 'John Doe'


@pytest.mark.django_db
def test_user_defaults_to_driver_role():
    user = User.objects.create_user(
        username='newuser',
        email='new@camtraffic.kh',
        password='secret123',
    )

    assert user.role == User.Role.DRIVER
    assert user.is_email_verified is False


@pytest.mark.django_db
def test_user_full_name_property(admin_user):
    admin_user.first_name = 'Admin'
    admin_user.last_name = 'User'
    admin_user.save(update_fields=['first_name', 'last_name'])

    assert admin_user.full_name == 'Admin User'
