# Redis & Celery

> Task **124** — Background task workers

## Components

| Path | Purpose |
|------|---------|
| `backend/config/celery.py` | Celery application |
| `backend/apps/core/tasks.py` | Shared tasks (`core.ping`) |
| `Dockerfile.worker` | Worker/beat container image |
| `worker-entrypoint.sh` | Waits for Redis before start |

## Production services

Defined in `deploy/docker/docker-compose.prod.yml`:

- `celery-worker` — `celery -A config worker`
- `celery-beat` — `celery -A config beat`

Both use Redis as broker (`CELERY_BROKER_URL` / `REDIS_URL`).

## Local smoke test

```bash
cd backend
celery -A config worker -l info
# another terminal
python manage.py shell -c "from apps.core.tasks import ping; print(ping.delay().get())"
```

## Status

- [x] Completed
