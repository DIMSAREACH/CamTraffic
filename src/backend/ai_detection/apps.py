import logging
import os
import threading

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AiDetectionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_detection'

    def ready(self):
        # Preload YOLO in a background thread so runserver accepts HTTP
        # immediately (avoids ~40s "backend down" / Vite 503 on every reload).
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

            def _warm():
                try:
                    from .warmup import ensure_models_warm

                    result = ensure_models_warm(include_ocr=False)
                    if result.get('warm'):
                        logger.info(
                            'AI detection models warmed (%.2fs)',
                            float(result.get('elapsed_sec') or 0),
                        )
                    else:
                        logger.warning('AI model warmup incomplete: %s', result.get('error'))
                except Exception:
                    logger.warning('AI model warmup skipped', exc_info=True)

            threading.Thread(target=_warm, name='ai-warmup', daemon=True).start()
        except Exception:
            logger.warning('AI model warmup skipped', exc_info=True)
