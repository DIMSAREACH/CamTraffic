from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        from django.conf import settings
        if settings.DATABASES.get('default', {}).get('ENGINE', '').endswith('sqlite3'):
            from django.db.backends.signals import connection_created

            def _set_wal_mode(sender, connection, **kwargs):
                if connection.vendor == 'sqlite':
                    cursor = connection.cursor()
                    cursor.execute('PRAGMA journal_mode=WAL;')
                    cursor.execute('PRAGMA synchronous=NORMAL;')
                    cursor.execute('PRAGMA busy_timeout=20000;')

            connection_created.connect(_set_wal_mode)
