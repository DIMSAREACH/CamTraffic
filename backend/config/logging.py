"""Centralized logging configuration for CamTraffic (Task 007)."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config.env import get_bool, get_int


class JsonFormatter(logging.Formatter):
    """Structured JSON log lines for production aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            'timestamp': datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'request_id': getattr(record, 'request_id', '-'),
        }
        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def _build_handlers(log_dir: Path | None) -> dict[str, dict[str, Any]]:
    log_format = os.environ.get('LOG_FORMAT', 'verbose').lower()
    formatter_name = 'json' if log_format == 'json' else 'verbose'

    handlers: dict[str, dict[str, Any]] = {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': formatter_name,
            'filters': ['request_id'],
        },
    }

    log_file = os.environ.get('LOG_FILE', '').strip()
    if log_file:
        log_path = Path(log_file)
        if not log_path.is_absolute() and log_dir is not None:
            log_path = log_dir / log_path
        log_path.parent.mkdir(parents=True, exist_ok=True)

        handlers['file'] = {
            'class': 'logging.handlers.RotatingFileHandler',
            'formatter': formatter_name,
            'filename': str(log_path),
            'maxBytes': get_int('LOG_MAX_BYTES', 10_485_760),
            'backupCount': get_int('LOG_BACKUP_COUNT', 5),
            'encoding': 'utf-8',
            'filters': ['request_id'],
        }

    return handlers


def get_logging_config(base_dir: Path) -> dict[str, Any]:
    """Build the Django LOGGING dict from environment variables."""
    handlers = _build_handlers(base_dir)
    handler_names = list(handlers.keys())
    root_level = os.environ.get('LOG_LEVEL', 'INFO')

    return {
        'version': 1,
        'disable_existing_loggers': False,
        'filters': {
            'request_id': {
                '()': 'apps.core.logging_context.RequestIdFilter',
            },
        },
        'formatters': {
            'verbose': {
                'format': '[{asctime}] {levelname} {name} [request_id={request_id}]: {message}',
                'style': '{',
            },
            'json': {
                '()': 'config.logging.JsonFormatter',
            },
        },
        'handlers': handlers,
        'root': {
            'handlers': handler_names,
            'level': root_level,
        },
        'loggers': {
            'django': {
                'handlers': handler_names,
                'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
                'propagate': False,
            },
            'django.request': {
                'handlers': handler_names,
                'level': os.environ.get('DJANGO_REQUEST_LOG_LEVEL', 'WARNING'),
                'propagate': False,
            },
            'apps': {
                'handlers': handler_names,
                'level': os.environ.get('APP_LOG_LEVEL', 'DEBUG'),
                'propagate': False,
            },
            'apps.request': {
                'handlers': handler_names,
                'level': os.environ.get('REQUEST_LOG_LEVEL', 'INFO'),
                'propagate': False,
            },
        },
    }
