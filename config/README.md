# Configuration Management

This directory contains all system configurations organized by environment and purpose.

## Structure

### `environments/`
Environment-specific configuration files:
- `development.env` - Development environment
- `staging.env` - Staging environment
- `production.env` - Production environment
- `testing.env` - Testing environment

### `services/`
Service-specific configurations:
- `backend.yml` - Backend service configuration
- `ai_service.yml` - AI service configuration
- `database.yml` - Database configuration
- `redis.yml` - Redis configuration

### `security/`
Security-related configurations:
- `cors.yml` - CORS settings
- `rate_limiting.yml` - Rate limiting rules
- `authentication.yml` - Authentication settings
- `ssl.yml` - SSL/TLS configuration

## Security Note

⚠️ **Never commit sensitive credentials to version control!**

- Use `.env.example` files as templates
- Store actual credentials in secure vaults
- Use environment variables in production

## Classification

- **Level**: Confidential
- **Access**: DevOps, System Administrators
- **Backup**: Daily
