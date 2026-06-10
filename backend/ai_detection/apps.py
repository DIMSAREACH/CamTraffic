import logging
import os

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AiDetectionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_detection'

    def ready(self):
        # Preload sign YOLO weights so the first webcam scan is not slow.
        if os.environ.get('RUN_MAIN') != 'true':
            return
        try:
            from django.conf import settings

            if not getattr(settings, 'AI_WARMUP_MODELS', True):
                return
            from .services import _get_sign_model

            if _get_sign_model() is not None:
                logger.info('AI sign model preloaded')
        except Exception:
            logger.debug('AI sign model warmup skipped', exc_info=True)
