"""Create and restore full CamTraffic system backups (database, media, optional AI weights)."""
from __future__ import annotations

import json
import logging
import os
import shutil
import sqlite3
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.db import connection

logger = logging.getLogger(__name__)

BACKUP_VERSION = '1.0'
MAX_STORED_BACKUPS = 10


def backup_root() -> Path:
    root = Path(getattr(settings, 'BACKUP_ROOT', settings.BASE_DIR / 'backups'))
    root.mkdir(parents=True, exist_ok=True)
    return root


def _timestamp_slug() -> str:
    return datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')


def _dir_size(path: Path) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    return sum(f.stat().st_size for f in path.rglob('*') if f.is_file())


def _count_files(path: Path) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return 1
    return sum(1 for f in path.rglob('*') if f.is_file())


def _add_tree_to_zip(zf: zipfile.ZipFile, source: Path, arc_prefix: str) -> int:
    if not source.exists():
        return 0
    count = 0
    if source.is_file():
        zf.write(source, arcname=f'{arc_prefix}/{source.name}')
        return 1
    for file_path in source.rglob('*'):
        if file_path.is_file():
            rel = file_path.relative_to(source)
            zf.write(file_path, arcname=f'{arc_prefix}/{rel.as_posix()}')
            count += 1
    return count


def _backup_sqlite(target: Path) -> None:
    db_path = Path(settings.DATABASES['default']['NAME'])
    target.parent.mkdir(parents=True, exist_ok=True)
    if not db_path.exists():
        raise FileNotFoundError(f'Database file not found: {db_path}')
    src = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    try:
        dst = sqlite3.connect(target)
        try:
            src.backup(dst)
        finally:
            dst.close()
    finally:
        src.close()


def _backup_postgres(target: Path) -> None:
    db = settings.DATABASES['default']
    env = os.environ.copy()
    if db.get('PASSWORD'):
        env['PGPASSWORD'] = str(db['PASSWORD'])
    cmd = [
        'pg_dump',
        '-h', str(db.get('HOST') or 'localhost'),
        '-p', str(db.get('PORT') or '5432'),
        '-U', str(db.get('USER') or 'postgres'),
        '-d', str(db.get('NAME')),
        '-f', str(target),
        '--no-owner',
        '--no-acl',
    ]
    subprocess.run(cmd, env=env, check=True, capture_output=True, text=True)


def _export_fixtures(target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    buf = StringIO()
    call_command(
        'dumpdata',
        '--natural-foreign',
        '--natural-primary',
        '--indent',
        2,
        stdout=buf,
        exclude=['contenttypes', 'auth.permission', 'admin.logentry', 'sessions.session'],
    )
    target.write_text(buf.getvalue(), encoding='utf-8')


def _collect_ai_paths(include_weights: bool) -> list[tuple[Path, str]]:
    if not include_weights:
        return []
    paths: list[tuple[Path, str]] = []
    candidates = [
        (Path(settings.AI_MODEL_PATH), 'ai/weights'),
        (settings.BASE_DIR.parent / 'ai' / 'weights', 'ai/weights'),
    ]
    seen: set[Path] = set()
    for folder, arc in candidates:
        if not folder.exists() or folder in seen:
            continue
        if folder.is_file():
            paths.append((folder, f'{arc}/{folder.name}'))
            seen.add(folder)
            continue
        seen.add(folder)
        for file_path in folder.glob('*.pt'):
            paths.append((file_path, f'{arc}/{file_path.name}'))
    vehicle_model = getattr(settings, 'AI_VEHICLE_MODEL', '')
    if vehicle_model and vehicle_model.endswith('.pt'):
        for base in (settings.BASE_DIR.parent / 'ai' / 'weights', Path(settings.AI_MODEL_PATH).parent):
            candidate = base / vehicle_model
            if candidate.exists():
                paths.append((candidate, f'ai/weights/{candidate.name}'))
    return paths


def _write_env_example(zf: zipfile.ZipFile) -> None:
    example = settings.BASE_DIR / '.env.example'
    if example.exists():
        zf.write(example, arcname='config/.env.example')


def create_system_backup(
    *,
    include_weights: bool = False,
    store_copy: bool = True,
    output_dir: Path | None = None,
) -> tuple[Path, dict]:
    """
    Build a ZIP backup. Returns (zip_path, manifest dict).
  """
    slug = _timestamp_slug()
    filename = f'camtraffic-backup-{slug}.zip'
    out_dir = output_dir or backup_root()
    out_dir.mkdir(parents=True, exist_ok=True)
    final_path = out_dir / filename

    engine = settings.DATABASES['default']['ENGINE']
    is_sqlite = 'sqlite' in engine
    components: list[str] = []
    counts: dict[str, int] = {}

    with tempfile.TemporaryDirectory(prefix='camtraffic-backup-') as tmp:
        work = Path(tmp)
        db_dir = work / 'database'
        db_dir.mkdir(parents=True, exist_ok=True)

        if is_sqlite:
            sqlite_target = db_dir / 'db.sqlite3'
            _backup_sqlite(sqlite_target)
            components.append('database_sqlite')
            counts['database_sqlite'] = 1
        else:
            sql_target = db_dir / 'dump.sql'
            _backup_postgres(sql_target)
            components.append('database_pg_dump')
            counts['database_pg_dump'] = 1

        fixture_path = db_dir / 'fixtures.json'
        _export_fixtures(fixture_path)
        components.append('fixtures_json')
        counts['fixtures_json'] = 1

        media_root = Path(settings.MEDIA_ROOT)
        media_count = _count_files(media_root)
        if media_count:
            components.append('media')
            counts['media'] = media_count

        ai_entries = _collect_ai_paths(include_weights)
        if ai_entries:
            components.append('ai_weights')
            counts['ai_weights'] = len(ai_entries)

        manifest = {
            'version': BACKUP_VERSION,
            'app': 'CamTraffic',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'database_engine': 'sqlite' if is_sqlite else 'postgresql',
            'include_weights': include_weights,
            'components': components,
            'file_counts': counts,
        }

        with zipfile.ZipFile(final_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
            if is_sqlite:
                zf.write(db_dir / 'db.sqlite3', arcname='database/db.sqlite3')
            else:
                zf.write(db_dir / 'dump.sql', arcname='database/dump.sql')
            zf.write(fixture_path, arcname='database/fixtures.json')
            counts['media'] = _add_tree_to_zip(zf, media_root, 'media')
            for file_path, arcname in ai_entries:
                zf.write(file_path, arcname=arcname)
            _write_env_example(zf)
            zf.writestr('manifest.json', json.dumps(manifest, indent=2))

        manifest['size_bytes'] = final_path.stat().st_size
        manifest['filename'] = filename

    if store_copy:
        _prune_old_backups(out_dir)

    logger.info('System backup created: %s (%s bytes)', final_path, manifest['size_bytes'])
    return final_path, manifest


def _prune_old_backups(directory: Path) -> None:
    archives = sorted(directory.glob('camtraffic-backup-*.zip'), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in archives[MAX_STORED_BACKUPS:]:
        try:
            old.unlink()
        except OSError:
            logger.warning('Could not delete old backup %s', old)


def list_backups() -> list[dict]:
    items = []
    for path in sorted(backup_root().glob('camtraffic-backup-*.zip'), key=lambda p: p.stat().st_mtime, reverse=True):
        items.append({
            'filename': path.name,
            'size_bytes': path.stat().st_size,
            'created_at': datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat(),
        })
    return items


def restore_system_backup(
    zip_path: Path,
    *,
    restore_media: bool = True,
    restore_database: bool = True,
) -> dict:
    """Restore from a backup ZIP. Use with caution — overwrites live data."""
    if not zip_path.exists():
        raise FileNotFoundError(str(zip_path))

    engine = settings.DATABASES['default']['ENGINE']
    is_sqlite = 'sqlite' in engine
    restored: list[str] = []

    with tempfile.TemporaryDirectory(prefix='camtraffic-restore-') as tmp:
        work = Path(tmp)
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(work)

        manifest_path = work / 'manifest.json'
        manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}

        if restore_database:
            if is_sqlite:
                src = work / 'database' / 'db.sqlite3'
                if not src.exists():
                    raise FileNotFoundError('Backup missing database/db.sqlite3')
                db_path = Path(settings.DATABASES['default']['NAME'])
                connection.close()
                shutil.copy2(src, db_path)
                restored.append('database_sqlite')
            else:
                dump = work / 'database' / 'dump.sql'
                if dump.exists():
                    db = settings.DATABASES['default']
                    env = os.environ.copy()
                    if db.get('PASSWORD'):
                        env['PGPASSWORD'] = str(db['PASSWORD'])
                    subprocess.run(
                        [
                            'psql',
                            '-h', str(db.get('HOST') or 'localhost'),
                            '-p', str(db.get('PORT') or '5432'),
                            '-U', str(db.get('USER') or 'postgres'),
                            '-d', str(db.get('NAME')),
                            '-f', str(dump),
                        ],
                        env=env,
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                    restored.append('database_pg_dump')

        if restore_media:
            media_src = work / 'media'
            if media_src.exists():
                media_root = Path(settings.MEDIA_ROOT)
                if media_root.exists():
                    shutil.rmtree(media_root)
                shutil.copytree(media_src, media_root)
                restored.append('media')

        weights_src = work / 'ai' / 'weights'
        if weights_src.exists():
            dest = Path(settings.AI_MODEL_PATH).parent
            dest.mkdir(parents=True, exist_ok=True)
            for pt in weights_src.glob('*.pt'):
                shutil.copy2(pt, dest / pt.name)
            restored.append('ai_weights')

    return {'restored': restored, 'manifest': manifest}
