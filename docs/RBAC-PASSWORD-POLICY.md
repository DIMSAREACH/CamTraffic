# RBAC + password management (CamTraffic)

## Roles

| App role (`User.role`) | Elevated flag | Meaning |
|------------------------|---------------|---------|
| `driver` | — | Citizen: own profile, optional self soft-delete |
| `police` | — | Officer: enforcement; no user admin |
| `admin` | `is_superuser=False` | Manage drivers/officers, reset their passwords, soft-delete, audit view |
| `admin` | `is_superuser=True` | **Super Admin**: also create/manage admins + edit Roles & Permissions |

Demo `admin@camtraffic.demo` is seeded as superuser. Promote others with Django admin or:

```bash
python manage.py shell -c "from users.models import User; u=User.objects.get(email='you@example.com'); u.is_superuser=True; u.save(); from users.profile_services import provision_user_account; provision_user_account(u)"
```

## Password rules

- Users change their own password (hashed; never stored plain).
- Forgot password → email reset link (token expires).
- Admin **Reset password** sends the same secure reset link (no temporary plaintext password shown in UI).
- Events are written to `audit_logs` (`resource=user_password`).

## API

- `POST /api/users/<id>/reset-password/` — admin (or super-admin for admin targets)
- RBAC write endpoints require super-admin; all admins may **read** roles/permissions
