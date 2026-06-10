"""Officer/driver profiles and RBAC assignment on user lifecycle."""
from django.db import transaction

from rbac.models import Role, UserRole

from .models import Driver, Officer, User

ROLE_TO_ERD = {
    'admin': 'admin',
    'police': 'officer',
    'driver': 'driver',
}


class ProfileValidationError(Exception):
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(message)


def validate_unique_license_no(license_no: str, *, exclude_user_id: int | None = None) -> None:
    license_no = (license_no or '').strip()
    if not license_no:
        return
    qs = Driver.objects.filter(license_no__iexact=license_no)
    if exclude_user_id:
        qs = qs.exclude(user_id=exclude_user_id)
    if qs.exists():
        raise ProfileValidationError('license_no', 'This license number is already registered.')


def validate_unique_badge_no(badge_no: str, *, exclude_user_id: int | None = None) -> None:
    badge_no = (badge_no or '').strip()
    if not badge_no:
        return
    qs = Officer.objects.filter(badge_no__iexact=badge_no)
    if exclude_user_id:
        qs = qs.exclude(user_id=exclude_user_id)
    if qs.exists():
        raise ProfileValidationError('badge_no', 'This badge number is already in use.')


@transaction.atomic
def provision_user_account(
    user: User,
    *,
    badge_no: str | None = None,
    license_no: str | None = None,
) -> None:
    """Assign RBAC role and create role-specific profile after user save."""
    erd_role = ROLE_TO_ERD.get(user.role, 'driver')
    role, _ = Role.objects.get_or_create(
        role_name=erd_role,
        defaults={'description': f'{erd_role.title()} role', 'status': 'active'},
    )
    UserRole.objects.update_or_create(user=user, defaults={'role': role})

    profile_status = 'active' if user.is_active else 'inactive'

    if user.role == 'police':
        badge = (badge_no or '').strip() or f'BADGE-{user.id:05d}'
        validate_unique_badge_no(badge, exclude_user_id=user.id)
        Officer.objects.update_or_create(
            user=user,
            defaults={
                'badge_no': badge,
                'rank': 'Officer',
                'department': 'Traffic Police',
                'status': profile_status,
            },
        )
        Driver.objects.filter(user=user).delete()
    elif user.role == 'driver':
        lic = (license_no or user.license_no or '').strip() or f'DRV-{user.id:05d}'
        validate_unique_license_no(lic, exclude_user_id=user.id)
        if user.license_no != lic:
            user.license_no = lic
            user.save(update_fields=['license_no', 'updated_at'])
        Driver.objects.update_or_create(
            user=user,
            defaults={'license_no': lic, 'status': profile_status},
        )
        Officer.objects.filter(user=user).delete()
    else:
        Officer.objects.filter(user=user).delete()
        Driver.objects.filter(user=user).delete()


def sync_profile_status(user: User) -> None:
    """Keep officer/driver profile status aligned with User.is_active."""
    status = 'active' if user.is_active else 'inactive'
    Officer.objects.filter(user=user).update(status=status)
    Driver.objects.filter(user=user).update(status=status)
