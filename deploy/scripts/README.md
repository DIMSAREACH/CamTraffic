# Deployment Scripts (Stage 10)

These scripts automate production deployment tasks for CamTraffic.

## Scripts

- `provision_vps_ubuntu.sh`
  - Provisions Ubuntu 22.04 VPS with Docker + firewall setup.
- `deploy_production.sh`
  - Brings up production stack, runs migrations, seeds DB, and executes health checks.
- `healthcheck_production.sh`
  - Verifies service state and key health endpoints.
- `backup_postgres.sh`
  - Runs PostgreSQL backup (`pg_dump`) with retention cleanup.
- `install_backup_cron.sh`
  - Installs daily cron entry for `backup_postgres.sh`.

## Typical flow

1. Provision server:
   - `sudo ./deploy/scripts/provision_vps_ubuntu.sh`
2. Configure `.env.production` from template.
3. Deploy stack:
   - `./deploy/scripts/deploy_production.sh /opt/camtraffic`
4. Install backup cron:
   - `sudo ./deploy/scripts/install_backup_cron.sh /opt/camtraffic /opt/camtraffic/backups "0 2 * * *"`

## Notes

- These scripts target Linux production hosts.
- For local Windows validation, equivalent `docker compose` and `pg_dump` commands can be run directly in PowerShell.
