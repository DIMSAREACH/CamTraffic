"""EasyOCR text and plate recognition module."""

from app.ocr.router import router
from app.ocr.service import OCRService, ocr_service

__all__ = ['router', 'OCRService', 'ocr_service']
