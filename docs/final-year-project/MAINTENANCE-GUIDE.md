# Maintenance Guide

Task: 378
Last Updated: 2026-07-10

## 1. Daily Operations

1. Check service health:
   - Backend: `/health/` and `/health/ready/`
   - AI service: `/health`
2. Review logs for backend, nginx, and worker services.
3. Confirm scheduled backup execution status.

## 2. Deployment Maintenance

- Production compose file: `deploy/docker/docker-compose.prod.yml`
- Deploy script: `deploy/scripts/deploy_production.sh`
- Healthcheck script: `deploy/scripts/healthcheck_production.sh`

## 3. Backup and Restore

- Backup script: `deploy/scripts/backup_postgres.sh`
- Cron installer: `deploy/scripts/install_backup_cron.sh`
- Restore endpoint/workflow: backend system backup APIs and restore tasks

## 4. SSL and Domain Maintenance

- SSL setup: `deploy/ssl/certbot-init.sh`
- SSL renewal: `deploy/ssl/certbot-renew.sh`
- DNS and cert instructions: `deploy/ssl/README.md`

## 5. Model Update Procedure

1. Prepare new YOLO weights from validated training run.
2. Deploy/update AI service model path.
3. Run smoke inference checks and API health checks.
4. Update model version records in backend admin.

## 6. Incident Response Basics

- Service down: restart failed container, then verify health endpoints.
- DB issue: verify postgres availability, then recover from latest backup if needed.
- Queue delay: inspect Redis/Celery worker and retry failed tasks.

## 7. Reference Documents

- `docs/final-year-project/DEPLOYMENT-DEVOPS-VALIDATION-REPORT.md`
- `docs/final-year-project/INTEGRATION-VALIDATION-REPORT.md`
- `docs/final-year-project/TESTING-QA-VALIDATION-REPORT.md`
