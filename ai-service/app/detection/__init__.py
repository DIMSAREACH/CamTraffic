"""YOLOv11 traffic sign detection module."""

from app.detection.router import router
from app.detection.service import YOLODetectionService, detection_service

__all__ = ['router', 'YOLODetectionService', 'detection_service']
