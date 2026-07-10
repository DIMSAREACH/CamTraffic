"""Request-scoped logging context (Task 007)."""

from __future__ import annotations

import contextvars
import logging

request_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar('request_id', default=None)


class RequestIdFilter(logging.Filter):
    """Inject the current request ID into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get() or '-'
        return True


def get_request_id() -> str | None:
    return request_id_var.get()
