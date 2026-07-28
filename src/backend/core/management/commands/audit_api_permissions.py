"""List API views and their DRF permission classes (RBAC / role audit)."""
from django.core.management.base import BaseCommand
from django.urls import get_resolver
from rest_framework.views import APIView


def _iter_api_views(resolver, prefix=''):
    for pattern in resolver.url_patterns:
        if hasattr(pattern, 'url_patterns'):
            yield from _iter_api_views(pattern, prefix + str(pattern.pattern))
            continue
        callback = getattr(pattern, 'callback', None)
        if callback is None:
            continue
        view_cls = getattr(callback, 'cls', None) or getattr(callback, 'view_class', None)
        if view_cls is None and hasattr(callback, '__self__'):
            view_cls = type(callback.__self__)
        if view_cls is None or not issubclass(view_cls, APIView):
            continue
        path = prefix + str(pattern.pattern)
        perms = getattr(view_cls, 'permission_classes', ())
        perm_names = [getattr(p, '__name__', repr(p)) for p in perms]
        yield path, view_cls.__name__, perm_names


class Command(BaseCommand):
    help = 'Audit REST API endpoints and their permission_classes'

    def handle(self, *args, **options):
        resolver = get_resolver()
        rows = sorted(_iter_api_views(resolver), key=lambda r: r[0])
        open_views = []
        self.stdout.write(self.style.MIGRATE_HEADING('CamTraffic API permission audit'))
        self.stdout.write('')
        for path, view_name, perms in rows:
            if not path.startswith('api/'):
                continue
            label = ', '.join(perms) if perms else '(default IsAuthenticated)'
            self.stdout.write(f'  {path:<48} {view_name:<28} {label}')
            if 'AllowAny' in label and '/auth/' not in path and '/health' not in path:
                open_views.append(path)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Endpoints scanned: {len([r for r in rows if r[0].startswith("api/")])}'))
        if open_views:
            self.stdout.write(self.style.WARNING(f'AllowAny (review): {len(open_views)}'))
            for path in open_views:
                self.stdout.write(f'    - {path}')
