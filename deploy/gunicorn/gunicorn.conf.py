# Gunicorn — CamTraffic production WSGI
import multiprocessing
import os

bind = os.getenv('GUNICORN_BIND', '0.0.0.0:8000')
workers = int(os.getenv('GUNICORN_WORKERS', max(2, multiprocessing.cpu_count())))
threads = int(os.getenv('GUNICORN_THREADS', '2'))
timeout = int(os.getenv('GUNICORN_TIMEOUT', '120'))
keepalive = int(os.getenv('GUNICORN_KEEPALIVE', '5'))
accesslog = '-'
errorlog = '-'
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')
capture_output = True
wsgi_app = 'camtraffic.wsgi:application'
