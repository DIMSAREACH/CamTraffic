"""OpenCV image preprocessing module."""

from app.processing.router import router
from app.processing.service import ImageProcessor, image_processor

__all__ = ['router', 'ImageProcessor', 'image_processor']
