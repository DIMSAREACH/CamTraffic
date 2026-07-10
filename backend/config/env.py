"""Centralized environment configuration for CamTraffic."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

MONOREPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_ROOT = MONOREPO_ROOT / 'backend'

DOCKER_SERVICE_HOSTS = {
    'POSTGRES_HOST': 'postgres',
    'REDIS_HOST': 'redis',
}

REQUIRED_DEVELOPMENT = (
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'DJANGO_SECRET_KEY',
)

REQUIRED_PRODUCTION = REQUIRED_DEVELOPMENT + (
    'DJANGO_ALLOWED_HOSTS',
    'CORS_ALLOWED_ORIGINS',
)


def load_environment() -> None:
    """Load .env files from monorepo root (later files override earlier)."""
    load_dotenv(MONOREPO_ROOT / '.env')
    load_dotenv(MONOREPO_ROOT / '.env.local', override=True)

    env_name = os.environ.get('CAMTRAFFIC_ENV', 'development')
    load_dotenv(MONOREPO_ROOT / f'.env.{env_name}', override=True)
    load_dotenv(MONOREPO_ROOT / f'.env.{env_name}.local', override=True)


def get_env(key: str, default: str | None = None) -> str:
    value = os.environ.get(key, default)
    if value is None:
        raise ValueError(f'Missing required environment variable: {key}')
    return value


def get_bool(key: str, default: bool = False) -> bool:
    raw = os.environ.get(key)
    if raw is None:
        return default
    return raw.lower() in ('true', '1', 'yes', 'on')


def get_int(key: str, default: int) -> int:
    raw = os.environ.get(key)
    if raw is None:
        return default
    return int(raw)


def running_in_docker() -> bool:
    return Path('/.dockerenv').exists() or get_bool('CAMTRAFFIC_DOCKER', False)


def resolve_host(env_key: str, local_default: str = 'localhost') -> str:
    """Map Docker service hostnames to localhost when running outside containers."""
    host = os.environ.get(env_key, local_default)
    docker_host = DOCKER_SERVICE_HOSTS.get(env_key)

    if docker_host and host == docker_host and not running_in_docker():
        return local_default

    return host


def resolve_postgres_port() -> str:
    """Use the container-internal Postgres port when running inside Docker."""
    if running_in_docker():
        return os.environ.get('POSTGRES_INTERNAL_PORT', '5432')
    return os.environ.get('POSTGRES_PORT', '5434')


def resolve_redis_url() -> str:
    explicit = os.environ.get('REDIS_URL')
    if explicit:
        if 'redis://redis:' in explicit and not running_in_docker():
            return explicit.replace('redis://redis:', 'redis://localhost:')
        return explicit

    host = resolve_host('REDIS_HOST')
    port = os.environ.get('REDIS_PORT', '6379')
    db = os.environ.get('REDIS_DB', '0')
    return f'redis://{host}:{port}/{db}'


def validate_environment() -> list[str]:
    """Return list of missing required variables."""
    env_name = os.environ.get('CAMTRAFFIC_ENV', 'development')
    required = REQUIRED_PRODUCTION if env_name == 'production' else REQUIRED_DEVELOPMENT
    return [key for key in required if not os.environ.get(key)]


def environment_name() -> str:
    return os.environ.get('CAMTRAFFIC_ENV', 'development')
