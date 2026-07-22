"""Structured logging configuration for CamTraffic."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        if record.exc_info:
            payload['exc_info'] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def build_logging_config(base_dir: Path, *, use_json: bool = False) -> dict:
    logs_dir = base_dir / 'logs'
    logs_dir.mkdir(exist_ok=True)

    formatter_name = 'json' if use_json else 'verbose'
    formatters = {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'json': {
            '()': 'config.logging.JsonLogFormatter',
        },
    }

    return {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': formatters,
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': formatter_name,
            },
            'file': {
                'class': 'logging.FileHandler',
                'filename': logs_dir / 'camtraffic.log',
                'formatter': formatter_name,
            },
        },
        'root': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'loggers': {
            'django': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False,
            },
            'camtraffic.request': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False,
            },
            'camtraffic.rbac': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False,
            },
        },
    }
