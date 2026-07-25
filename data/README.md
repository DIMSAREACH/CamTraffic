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
# Load development data
npm run seed:demo

# Load production data
npm run seed:production
```

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
