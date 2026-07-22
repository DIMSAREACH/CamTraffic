"""Officer/driver profiles and RBAC assignment on user lifecycle."""
import uuid

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


def _profile_code(prefix: str, user_id: uuid.UUID | str) -> str:
    """Build a stable profile code from a UUID primary key."""
    token = str(user_id).replace('-', '')[:8].upper()
    return f'{prefix}-{token}'


def validate_unique_license_no(license_no: str, *, exclude_user_id: uuid.UUID | None = None) -> None:
    license_no = (license_no or '').strip()
    if not license_no:
        return
    qs = Driver.objects.filter(license_no__iexact=license_no)
    if exclude_user_id:
        qs = qs.exclude(user_id=exclude_user_id)
    if qs.exists():
        raise ProfileValidationError('license_no', 'This license number is already registered.')


def validate_unique_badge_no(badge_no: str, *, exclude_user_id: uuid.UUID | None = None) -> None:
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
    erd_role = (
        'super_admin'
        if user.role == 'admin' and getattr(user, 'is_superuser', False)
        else ROLE_TO_ERD.get(user.role, 'driver')
    )
    role, _ = Role.objects.get_or_create(
        role_name=erd_role,
        defaults={'description': f'{erd_role.replace("_", " ").title()} role', 'status': 'active'},
    )
    UserRole.objects.update_or_create(user=user, defaults={'role': role})

    profile_status = 'active' if user.is_active else 'inactive'

    if user.role == 'police':
        badge = (badge_no or '').strip() or _profile_code('BADGE', user.id)
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
        lic = (license_no or user.license_no or '').strip() or _profile_code('DRV', user.id)
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


def assert_admin_may_manage_account(actor: User, target: User, *, action: str = 'modify') -> None:
    """Admins manage drivers/officers; only super-admins may manage other admins."""
    if actor.role != 'admin':
        raise PermissionError('Only administrators can manage user accounts.')
    if target.pk == actor.pk:
        raise ValueError(f'You cannot {action} your own account.')
    if target.role == 'admin' and not getattr(actor, 'is_superuser', False):
        raise ValueError(
            'Only a super administrator can manage other administrator accounts. '
            'Keep at least one administrator for system access.',
        )


def soft_delete_user(user: User) -> User:
    """
    Soft-delete: disable sign-in and stamp deleted_at.
    Keeps FK history (fines, violations, audit) intact for enforcement.
    """
    from django.utils import timezone

    if not user.is_active and user.deleted_at:
        return user
    user.is_active = False
    if user.deleted_at is None:
        user.deleted_at = timezone.now()
    user.save(update_fields=['is_active', 'deleted_at', 'updated_at'])
    sync_profile_status(user)
    return user


def restore_user(user: User) -> User:
    """Re-enable a deactivated / soft-deleted account."""
    user.is_active = True
    user.deleted_at = None
    user.save(update_fields=['is_active', 'deleted_at', 'updated_at'])
    sync_profile_status(user)
    return user


def safe_delete_user(user: User, *, hard: bool = False) -> tuple[bool, User | None, str]:
    """
    Default: soft-delete (recommended for CamTraffic).

    hard=True attempts permanent removal; on PROTECT/RESTRICT FKs falls back to soft-delete.

    Returns (hard_deleted, user_or_none, message).
    """
    from django.db.models.deletion import ProtectedError, RestrictedError

    if not hard:
        soft_delete_user(user)
        return (
            False,
            user,
            'Account soft-deleted. Sign-in is disabled; linked fines and violations are preserved.',
        )

    try:
        user.delete()
        return True, None, 'User permanently deleted'
    except (ProtectedError, RestrictedError):
        soft_delete_user(user)
        return (
            False,
            user,
            'User has linked violations or records, so the account was soft-deleted '
            'instead of permanently deleted.',
        )
