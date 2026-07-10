# Docker — CamTraffic

> Tasks **002** (development) · **121** (production)

## Development quick start

```bash
cp .env.example .env
npm run docker:up
```

| Service | URL |
|---------|-----|
| Frontend Admin | http://localhost:5173 |
| Frontend User | http://localhost:5174 |
| Backend API | http://localhost:8000 |
| AI Service | http://localhost:8001 |
| PostgreSQL | localhost:5434 |
| Redis | localhost:6379 |

### Dev NPM scripts

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Build and start all services |
| `npm run docker:up:detached` | Start in background |
| `npm run docker:down` | Stop all services |
| `npm run docker:logs` | Tail service logs |
| `npm run docker:reset` | Stop and remove volumes |

### Dev Dockerfiles

| File | Service |
|------|---------|
| `Dockerfile.backend` | Django dev server |
| `Dockerfile.ai-service` | FastAPI with reload |
| `Dockerfile.frontend` | Vite dev server (build-arg `APP_DIR`) |
| `entrypoint-backend.sh` | Wait for Postgres + migrate |

Root compose: `docker-compose.yml`

## Production (Task 121)

```bash
cp deploy/env/.env.production.example .env.production
# Edit secrets, then:
npm run docker:prod:up
```

### Production images

| Dockerfile | Service |
|------------|---------|
| `Dockerfile.backend.prod` | Django + Gunicorn + collectstatic |
| `Dockerfile.ai-service.prod` | FastAPI + full ML stack |
| `Dockerfile.nginx.prod` | Built frontends + Nginx |
| `entrypoint-backend.prod.sh` | Migrate + collectstatic |
| `docker-compose.prod.yml` | Full production stack |

### Production NPM scripts

| Command | Description |
|---------|-------------|
| `npm run docker:prod:up` | Build and start production stack |
| `npm run docker:prod:down` | Stop production stack |
| `npm run docker:prod:logs` | Tail production logs |

## Status

- [x] Development compose and Dockerfiles
- [x] Production compose and Dockerfiles
- [x] Health checks and entrypoints
