"""Lazy EasyOCR reader loader."""

from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from typing import Any

from app.config import OCR_LANGUAGES, OCR_MODE


@dataclass(frozen=True)
class LoadedReader:
    reader: Any
    languages: tuple[str, ...]


_reader_lock = Lock()
_loaded_reader: LoadedReader | None = None
_easyocr_import_error: str | None = None


def easyocr_available() -> bool:
    global _easyocr_import_error
    try:
        import easyocr  # noqa: F401
    except ImportError as exc:
        _easyocr_import_error = str(exc)
        return False
    _easyocr_import_error = None
    return True


def easyocr_error() -> str | None:
    easyocr_available()
    return _easyocr_import_error


def should_use_mock() -> bool:
    if OCR_MODE == 'mock':
        return True
    if OCR_MODE == 'ocr':
        return False
    return not easyocr_available()


def get_reader() -> LoadedReader:
    global _loaded_reader

    if should_use_mock():
        raise RuntimeError('EasyOCR is unavailable; OCR is running in mock mode.')

    if _loaded_reader is not None:
        return _loaded_reader

    with _reader_lock:
        if _loaded_reader is not None:
            return _loaded_reader

        if not easyocr_available():
            raise RuntimeError(_easyocr_import_error or 'easyocr is not installed')

        import easyocr

        reader = easyocr.Reader(list(OCR_LANGUAGES), gpu=False, verbose=False)
        _loaded_reader = LoadedReader(reader=reader, languages=OCR_LANGUAGES)
        return _loaded_reader


def is_ready() -> bool:
    return True if should_use_mock() else easyocr_available()


def ocr_status_message() -> str:
    if should_use_mock():
        if OCR_MODE == 'mock':
            return 'Mock OCR mode is enabled.'
        if not easyocr_available():
            return 'easyocr is not installed; using mock OCR results.'
        return 'Mock OCR mode is active.'
    if not easyocr_available():
        return _easyocr_import_error or 'easyocr is not installed.'
    return 'EasyOCR reader is ready for inference.'
