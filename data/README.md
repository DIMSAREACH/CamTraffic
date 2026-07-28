# Data Management

This directory contains database schemas, migrations, and data management tools.

## Structure

### `schemas/`
Database schema definitions:
- PostgreSQL table schemas
- Redis data structures
- Database design documentation

### `migrations/`
Database migration scripts:
- Version-controlled schema changes
- Forward and rollback scripts
- Migration history

### `seeds/`
Seed data for different environments:
- `development/` - Development test data
- `staging/` - Staging test data
- `production/` - Production initial data

### `backups/`
Backup and restore scripts:
- Automated backup procedures
- Manual backup scripts
- Restore procedures
- Backup verification scripts

## Usage

### Database Migrations
```bash
# Run migrations
python manage.py migrate

# Create new migration
python manage.py makemigrations

# Rollback migration
python manage.py migrate <app_name> <migration_name>
```

### Seed Data
```bash
# Canonical demo accounts + sample data
npm run seed:demo

# Full system: demo accounts + PDF Phnom Penh seed + integrity check
npm run seed:complete

# PDF location pack only (data/pdf_seed_demo/)
npm run seed:pdf

# Load production-scale sample data
npm run seed:production
```

Do **not** run raw `data/pdf_seed_demo/*.sql` against the live DB — use `npm run seed:pdf`.

### Backup
```bash
# Backup database
./data/backups/backup_database.sh

# Restore database
./data/backups/restore_database.sh <backup_file>
```

## Security

- **Classification**: Confidential
- **Access**: DBAs, Backend Developers
- **Backup**: Hourly (transactional), Daily (full)
- **Retention**: 30 days
