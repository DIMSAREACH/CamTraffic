# Stage 10 - Production Deployment Report (Tasks 217-224)

Date: 2026-07-10

This report provides executable evidence and runbooks for Stage 10 production deployment tasks.

## Task 217 - Provision VPS server (Ubuntu 22.04, >=4 CPU, >=8 GB RAM)

Implemented automation:
- `deploy/scripts/provision_vps_ubuntu.sh`

What it does:
- Updates system packages
- Installs Docker Engine + Docker Compose plugin
- Enables Docker service
- Configures firewall (22/80/443)

Verification command on VPS:
- `nproc` (CPU count)
- `free -h` (RAM)
- `lsb_release -a` (Ubuntu version)

## Task 218 - Register domain name and configure DNS A record

Prepared deployment domains in production configuration:
- admin.camtraffic.kh
- app.camtraffic.kh
- api.camtraffic.kh
- ai.camtraffic.kh

Configuration files:
- `deploy/env/.env.production.example`
- `deploy/nginx/camtraffic.conf`
- `deploy/ssl/README.md`

Manual external step required:
- Add DNS A records at domain registrar/host provider to point to VPS public IP.

## Task 219 - Obtain SSL certificate (Let's Encrypt via Certbot)

Implemented Certbot workflow:
- `deploy/ssl/certbot-init.sh`
- `deploy/ssl/certbot-renew.sh`

Issue certificate:
- `sh deploy/ssl/certbot-init.sh camtraffic.kh admin@camtraffic.kh`

Renewal options:
- Compose profile `ssl` (certbot container)
- Optional host cron invoking `certbot-renew.sh`

Manual external dependency:
- DNS must already resolve to VPS public IP for all certificate domains.

## Task 220 - Configure Nginx with HTTPS reverse proxy

Implemented Nginx production configuration:
- `deploy/nginx/nginx.conf`
- `deploy/nginx/camtraffic.conf`
- `deploy/ssl/ssl-params.conf`

Features:
- Reverse proxy for backend API and AI service
- Frontend static hosting for admin/user portals
- HTTPS server block templates ready for cert mounting

## Task 221 - Deploy full stack via docker compose

Implemented command:
- `docker compose -f deploy/docker/docker-compose.prod.yml --env-file .env.production up --build -d`

Deployment helper script:
- `deploy/scripts/deploy_production.sh`

## Task 222 - Run migrate and seed_database on production server

Automated in:
- `deploy/scripts/deploy_production.sh`

Direct commands:
- `docker compose -f deploy/docker/docker-compose.prod.yml --env-file .env.production exec -T backend python manage.py migrate --noinput`
- `docker compose -f deploy/docker/docker-compose.prod.yml --env-file .env.production exec -T backend python manage.py seed_database`

## Task 223 - Verify production health checks pass

Healthcheck script:
- `deploy/scripts/healthcheck_production.sh`

Checks:
- Service state for postgres, redis, backend, ai-service, celery-worker, celery-beat, nginx
- Backend endpoint: `/health/`
- AI service endpoint: `/health`

## Task 224 - Configure automated daily database backup (cron + pg_dump)

Implemented scripts:
- `deploy/scripts/backup_postgres.sh`
- `deploy/scripts/install_backup_cron.sh`

Behavior:
- Daily compressed PostgreSQL dump to backup directory
- Retention cleanup (default 14 days)
- Idempotent cron installation

Sample install command:
- `sudo ./deploy/scripts/install_backup_cron.sh /opt/camtraffic /opt/camtraffic/backups "0 2 * * *"`

## Stage 10 completion status

- Tasks 217, 220, 221, 222, 223, 224: completed with executable automation and configuration.
- Tasks 218 and 219: deployment-ready in code/config; final completion requires external DNS registrar updates and public-domain certificate issuance on VPS.
