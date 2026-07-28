# Gunicorn — CamTraffic production WSGI
import multiprocessing
import os

# Render sets PORT; WEB_CONCURRENCY overrides worker count on small instances.
_port = os.getenv('PORT')
if _port:
    bind = f'0.0.0.0:{_port}'
else:
    bind = os.getenv('GUNICORN_BIND', '0.0.0.0:8000')

_default_workers = max(2, multiprocessing.cpu_count())
if os.getenv('WEB_CONCURRENCY'):
    _default_workers = int(os.getenv('WEB_CONCURRENCY'))
elif os.getenv('GUNICORN_WORKERS'):
    _default_workers = int(os.getenv('GUNICORN_WORKERS'))

workers = _default_workers
threads = int(os.getenv('GUNICORN_THREADS', '2'))
timeout = int(os.getenv('GUNICORN_TIMEOUT', '120'))
keepalive = int(os.getenv('GUNICORN_KEEPALIVE', '5'))
accesslog = '-'
errorlog = '-'
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')
capture_output = True
wsgi_app = 'camtraffic.wsgi:application'
