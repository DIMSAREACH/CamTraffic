import logging
import os

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AiDetectionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_detection'

    def ready(self):
        # Preload YOLO weights so the first detection request is not slow.
        # Works with StatReloader (RUN_MAIN=true) and --noreload (no RUN_MAIN).
        import sys
        cmd = sys.argv[1] if len(sys.argv) > 1 else ''
        _skip_cmds = {
            'migrate', 'makemigrations', 'shell', 'test', 'collectstatic',
            'createsuperuser', 'sync_ai_training', 'evaluate_sign_accuracy',
            'import_cambodia_signs', 'seed_cameras', 'seed_violation_rules',
        }
        if cmd in _skip_cmds:
            return
        # With StatReloader: skip the reloader outer shell (no RUN_MAIN),
        # let the inner worker (RUN_MAIN=true) preload.
        # With --noreload: no RUN_MAIN either, but argv[1]=='runserver' so we proceed.
        if os.environ.get('RUN_MAIN') != 'true' and '--noreload' not in sys.argv:
            return
        try:
            from django.conf import settings

            if not getattr(settings, 'AI_WARMUP_MODELS', True):
                return
            from .services import _get_sign_model
            from .vehicle_detection import _get_vehicle_model, vehicle_detection_enabled

            if _get_sign_model() is not None:
                logger.info('AI sign model preloaded')
            if vehicle_detection_enabled():
                _get_vehicle_model()
                logger.info('Vehicle model preloaded')
            from .plate_ocr import plate_ocr_enabled, _get_reader

            if plate_ocr_enabled():
                _get_reader()
                logger.info('EasyOCR reader preloaded')
        except Exception:
            logger.debug('AI model warmup skipped', exc_info=True)
