# Gunicorn Configuration

> Task **123** — WSGI server for Django production

## File

`gunicorn.conf.py` — worker count, threading, timeouts, and logging.

## Usage

Production backend container runs:

```bash
gunicorn config.wsgi:application -c /app/gunicorn.conf.py
```

## Environment overrides

| Variable | Default |
|----------|---------|
| `GUNICORN_BIND` | `0.0.0.0:8000` |
| `GUNICORN_WORKERS` | `CPU * 2 + 1` |
| `GUNICORN_THREADS` | `2` |
| `GUNICORN_TIMEOUT` | `120` |
| `GUNICORN_LOG_LEVEL` | `info` |

Set in `.env.production` — see `deploy/env/.env.production.example`.

## Status

- [x] Completed
