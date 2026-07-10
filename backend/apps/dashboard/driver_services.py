from __future__ import annotations

from django.shortcuts import get_object_or_404

from apps.appeals.models import Appeal
from apps.drivers.models import Driver
from apps.fines.models import Fine
from apps.vehicles.models import Vehicle
from apps.violations.models import Violation


def get_driver_profile(user) -> Driver:
    return get_object_or_404(Driver.objects.select_related('user'), user=user)


def driver_violations(user):
    return Violation.objects.filter(driver=user)


def driver_vehicles(user):
    return Vehicle.objects.filter(owner=user)


def driver_fines(user):
    return Fine.objects.filter(violation__driver=user)


def driver_appeals(user):
    return Appeal.objects.filter(driver=user)
