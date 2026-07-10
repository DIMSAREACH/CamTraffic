#!/usr/bin/env python3
"""Scaffold minimal Django app files for CamTraffic backend apps."""

from pathlib import Path

APPS = [
    'rbac',
    'users',
    'officers',
    'drivers',
    'vehicles',
    'cameras',
    'traffic_signs',
    'ai_models',
    'detections',
    'ocr',
    'violations',
    'fines',
    'appeals',
    'reports',
    'notifications',
    'dashboard',
    'audit',
    'system',
]

ROOT = Path(__file__).resolve().parent.parent / 'apps'


def app_class_name(app_label: str) -> str:
    return ''.join(part.capitalize() for part in app_label.split('_'))


def write_app(app_label: str) -> None:
    app_dir = ROOT / app_label
    app_dir.mkdir(parents=True, exist_ok=True)
    (app_dir / 'migrations').mkdir(exist_ok=True)

    class_name = app_class_name(app_label)

    files = {
        '__init__.py': '',
        'apps.py': f'''from django.apps import AppConfig


class {class_name}Config(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.{app_label}'
    verbose_name = '{class_name.replace("TrafficSigns", "Traffic Signs")}'
''',
        'models.py': f'''from django.db import models

# Domain models for {app_label} — implemented in later tasks.
''',
        'admin.py': f'''from django.contrib import admin

# Register {app_label} models here.
''',
        'views.py': f'''from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def placeholder(request):
    return Response(
        {{'app': '{app_label}', 'status': 'not_implemented'}},
        status=status.HTTP_501_NOT_IMPLEMENTED,
    )
''',
        'urls.py': f'''from django.urls import path

from . import views

app_name = '{app_label}'

urlpatterns = [
    path('', views.placeholder, name='placeholder'),
]
''',
        'migrations/__init__.py': '',
    }

    for relative_path, content in files.items():
        target = app_dir / relative_path
        if target.exists() and relative_path == 'models.py':
            continue
        if target.name == 'README.md':
            continue
        if not target.exists() or relative_path in {'apps.py', 'models.py', 'admin.py', 'views.py', 'urls.py'}:
            target.write_text(content, encoding='utf-8')


def main() -> None:
    for app in APPS:
        write_app(app)
    print(f'Scaffolded {len(APPS)} Django apps.')


if __name__ == '__main__':
    main()
