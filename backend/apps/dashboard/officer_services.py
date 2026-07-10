from __future__ import annotations

from django.shortcuts import get_object_or_404

from apps.cameras.models import Camera
from apps.detections.models import Detection
from apps.officers.models import Officer
from apps.violations.models import Violation


def get_officer_profile(user) -> Officer:
    return get_object_or_404(Officer.objects.select_related('station'), user=user)


def station_cameras(officer: Officer):
    return Camera.objects.filter(station_id=officer.station_id)


def station_violations(officer: Officer):
    return Violation.objects.filter(camera__station_id=officer.station_id)


def station_detections(officer: Officer):
    return Detection.objects.filter(camera__station_id=officer.station_id)
