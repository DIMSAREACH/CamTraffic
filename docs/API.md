# CamTraffic API Documentation

Base URL: `http://127.0.0.1:8000/api`

Authentication: `Authorization: Bearer <access_token>`

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login/` | No | Login `{ "email", "password" }` |
| POST | `/auth/register/` | No | Register driver account |
| POST | `/auth/logout/` | Yes | Blacklist refresh token `{ "refresh" }` |
| POST | `/auth/refresh/` | No | Refresh access `{ "refresh" }` |
| GET/PATCH | `/auth/profile/` | Yes | View/update profile |
| POST | `/auth/change-password/` | Yes | Change password |
| POST | `/auth/password-reset/` | No | Request reset email |
| POST | `/auth/password-reset/confirm/` | No | Confirm reset |
| GET | `/auth/oauth/status/` | No | Which providers are configured |
| GET | `/auth/oauth/google/authorize/?redirect_uri=` | No | Start Google OAuth (returns `authorization_url`) |
| GET | `/auth/oauth/github/authorize/?redirect_uri=` | No | Start GitHub OAuth |
| POST | `/auth/oauth/complete/` | No | Finish OAuth `{ "provider", "code", "state", "redirect_uri" }` |

### Login response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access": "<jwt>",
    "refresh": "<jwt>",
    "user": { "id": 1, "full_name": "...", "role": "driver", ... }
  }
}
```

## Users (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/users/` | List/create users |
| GET/PATCH/DELETE | `/users/{id}/` | User CRUD |
| POST | `/users/{id}/toggle-active/` | Toggle active status |
| GET | `/users/search/driver/?license=` | Search drivers |

## Vehicles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/vehicles/` | List/create vehicles |
| DELETE | `/vehicles/{id}/` | Remove vehicle |
| GET | `/vehicles/search/?plate=` | Search by plate (police) |

## Traffic Signs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/signs/` | List signs / admin create |
| POST | `/signs/chatbot/` | `{ "question": "..." }` |
| GET/PATCH/DELETE | `/signs/{id}/` | Admin manage sign |

## Fines

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/fines/` | List/issue fines |
| PATCH | `/fines/{id}/` | Update status |
| GET | `/fines/lookup/?license=` | Driver lookup |
| GET | `/fines/{id}/pdf/` | Export PDF receipt |

## AI Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/detect/` | Multipart `image` file |
| GET | `/ai/logs/` | Detection history |
| GET | `/ai/stats/` | Live model status, catalog counts, and page KPIs |

### Detection response

```json
{
  "success": true,
  "data": {
    "sign_name": "Stop Sign",
    "confidence": 98.4,
    "description": "Drivers must stop completely.",
    "guidance": "Reduce speed and stop before crossing line.",
    "processing_time": 0.82,
    "log_id": 12
  }
}
```

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications/` | User notifications |
| POST | `/notifications/{id}/read/` | Mark one read |
| POST | `/notifications/read/` | Mark all read |

## Dashboard

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/dashboard/admin/` | Admin analytics |
| GET | `/dashboard/police/` | Police stats |
| GET | `/dashboard/driver/` | Driver stats |
