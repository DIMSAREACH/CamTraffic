import os
import sys

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

app = Celery('camtraffic')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# prefork/billiard multiprocessing is unreliable on Windows (Python 3.12+)
if sys.platform == 'win32':
    app.conf.update(worker_pool='solo', worker_concurrency=1)
