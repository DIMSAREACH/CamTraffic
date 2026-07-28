"""Cap operational modules at ~100 records while keeping demo portal accounts."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src' / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.db import transaction  # noqa: E402

from ai_detection.models import AIDetectionLog  # noqa: E402
from appeals.models import ViolationAppeal  # noqa: E402
from audit.models import AuditLog  # noqa: E402
from fines.models import Fine  # noqa: E402
from infrastructure.models import Camera, Road  # noqa: E402
from notifications.models import Notification  # noqa: E402
from users.models import Driver, Officer  # noqa: E402
from vehicles.models import Vehicle  # noqa: E402
from violations.models import TrafficViolation  # noqa: E402

User = get_user_model()
LIMIT = 100
KEEP_EMAILS = {
    'admin@camtraffic.demo',
    'officer@camtraffic.demo',
    'driver@camtraffic.demo',
    'driver2@camtraffic.demo',
    'admin@camtraffic.gov.kh',
    'officer@camtraffic.gov.kh',
}


def order_for(model) -> str:
    names = {f.name for f in model._meta.get_fields() if hasattr(f, 'attname')}
    for candidate in ('created_at', 'submitted_at', 'timestamp', 'date_joined', 'updated_at', 'id'):
        if candidate in names:
            return f'-{candidate}'
    return '-pk'


def trim_qs(qs, *, limit: int = LIMIT, order_field: str | None = None) -> int:
    """Delete oldest extras beyond limit. Returns deleted count."""
    total = qs.count()
    if total <= limit:
        return 0
    field = order_field or order_for(qs.model)
    keep_ids = list(qs.order_by(field).values_list('pk', flat=True)[:limit])
    deleted, _ = qs.exclude(pk__in=keep_ids).delete()
    return deleted


def main() -> int:
    print(f'CamTraffic — trim operational modules to {LIMIT} records')

    with transaction.atomic():
        # Enforcement first (FKs): appeals → fines → violations → AI logs
        print(f'  appeals deleted: {trim_qs(ViolationAppeal.objects.all())}')
        print(f'  fines deleted: {trim_qs(Fine.objects.all())}')
        print(f'  violations deleted: {trim_qs(TrafficViolation.objects.all())}')
        print(f'  ai_logs deleted: {trim_qs(AIDetectionLog.objects.all())}')
        print(f'  notifications deleted: {trim_qs(Notification.objects.all())}')
        print(f'  audit_logs deleted: {trim_qs(AuditLog.objects.all())}')
        print(f'  vehicles deleted: {trim_qs(Vehicle.objects.all())}')

        # Drivers → exactly LIMIT (demo emails kept; cascade-delete extras)
        keep_driver_ids = set(
            User.objects.filter(role='driver', email__in=KEEP_EMAILS).values_list('pk', flat=True)
        )
        extra = list(
            User.objects.filter(role='driver')
            .exclude(pk__in=keep_driver_ids)
            .order_by('-date_joined')
            .values_list('pk', flat=True)[: max(0, LIMIT - len(keep_driver_ids))]
        )
        keep_driver_ids |= set(extra)
        drop_drivers = list(User.objects.filter(role='driver').exclude(pk__in=keep_driver_ids).values_list('pk', flat=True))
        drop_driver_profiles = list(Driver.objects.filter(user_id__in=drop_drivers).values_list('pk', flat=True))
        ViolationAppeal.objects.filter(driver_id__in=drop_drivers).delete()
        Fine.objects.filter(driver_id__in=drop_drivers).delete()
        TrafficViolation.objects.filter(driver_id__in=drop_driver_profiles).delete()
        Vehicle.objects.filter(owner_id__in=drop_drivers).delete()
        Driver.objects.filter(user_id__in=drop_drivers).delete()
        d_del, _ = User.objects.filter(pk__in=drop_drivers).delete()
        print(f'  extra drivers deleted: {d_del}')

        # Officers → up to 20 (under LIMIT)
        officer_limit = min(20, LIMIT)
        keep_officer_ids = set(
            User.objects.filter(role='police', email__in=KEEP_EMAILS).values_list('pk', flat=True)
        )
        extra_off = list(
            User.objects.filter(role='police')
            .exclude(pk__in=keep_officer_ids)
            .order_by('-date_joined')
            .values_list('pk', flat=True)[: max(0, officer_limit - len(keep_officer_ids))]
        )
        keep_officer_ids |= set(extra_off)
        drop_officers = list(User.objects.filter(role='police').exclude(pk__in=keep_officer_ids).values_list('pk', flat=True))
        drop_off_prof = list(Officer.objects.filter(user_id__in=drop_officers).values_list('pk', flat=True))
        Fine.objects.filter(police_id__in=drop_officers).update(police=None)
        TrafficViolation.objects.filter(officer_id__in=drop_off_prof).update(officer=None)
        Officer.objects.filter(user_id__in=drop_officers).delete()
        o_del, _ = User.objects.filter(pk__in=drop_officers).delete()
        print(f'  extra officers deleted: {o_del}')

        # Re-cap tables after cascade deletes
        for label, model in (
            ('violations', TrafficViolation),
            ('fines', Fine),
            ('appeals', ViolationAppeal),
            ('vehicles', Vehicle),
            ('ai_logs', AIDetectionLog),
            ('notifications', Notification),
            ('audit_logs', AuditLog),
        ):
            print(f'  {label} recap deleted: {trim_qs(model.objects.all())}')

        print('  roads/signs: left intact (infra + catalog)')
        # Cap cameras at 20 with matching live/offline KPI
        from django.utils import timezone as dj_tz
        cam_limit = 20
        cam_keep = list(
            Camera.objects.exclude(frame_source_url='')
            .order_by('code', 'name')
            .values_list('pk', flat=True)[:cam_limit]
        )
        if len(cam_keep) < cam_limit:
            cam_keep.extend(
                list(
                    Camera.objects.exclude(pk__in=cam_keep)
                    .order_by('code', 'name')
                    .values_list('pk', flat=True)[: cam_limit - len(cam_keep)]
                )
            )
        cam_keep = cam_keep[:cam_limit]
        cam_del, _ = Camera.objects.exclude(pk__in=cam_keep).delete()
        print(f'  cameras deleted: {cam_del}')
        for i, cam in enumerate(Camera.objects.order_by('code', 'name')):
            cam.status = 'active' if i < 18 else 'offline'
            cam.last_ping = dj_tz.now() if cam.status == 'active' else None
            cam.save(update_fields=['status', 'last_ping'])
        print(f'  cameras kept: {Camera.objects.count()} (18 active / 2 offline)')

    print('\nCurrent counts:')
    print(f'  drivers: {User.objects.filter(role="driver").count()}')
    print(f'  officers: {User.objects.filter(role="police").count()}')
    print(f'  vehicles: {Vehicle.objects.count()}')
    print(f'  violations: {TrafficViolation.objects.count()}')
    print(f'  fines: {Fine.objects.count()}')
    print(f'  appeals: {ViolationAppeal.objects.count()}')
    print(f'  ai_logs: {AIDetectionLog.objects.count()}')
    print(f'  notifications: {Notification.objects.count()}')
    print(f'  audit_logs: {AuditLog.objects.count()}')
    print(f'  cameras: {Camera.objects.count()}')
    print(f'  roads: {Road.objects.count()}')
    print('  (traffic signs catalog left intact — reference data)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
