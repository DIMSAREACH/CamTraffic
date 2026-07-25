"""
Management command for production database backup and restore operations.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection
from django.utils import timezone
import subprocess
import os
import json
from pathlib import Path


class Command(BaseCommand):
    help = 'Backup and restore production database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--backup',
            action='store_true',
            help='Create database backup',
        )
        parser.add_argument(
            '--restore',
            type=str,
            help='Restore from backup file path',
        )
        parser.add_argument(
            '--list-backups',
            action='store_true',
            help='List available backup files',
        )
        parser.add_argument(
            '--backup-dir',
            type=str,
            default='backups/database',
            help='Backup directory (default: backups/database)',
        )
        parser.add_argument(
            '--compress',
            action='store_true',
            help='Compress backup file with gzip',
        )
        parser.add_argument(
            '--verify',
            action='store_true',
            help='Verify backup integrity after creation',
        )

    def handle(self, *args, **options):
        """Handle database backup/restore operations."""
        
        self.backup_dir = Path(options['backup_dir'])
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        self.stdout.write('💾 CamTraffic Database Backup Manager')
        self.stdout.write('=' * 40)
        
        if options['backup']:
            self.create_backup(options['compress'], options['verify'])
        elif options['restore']:
            self.restore_backup(options['restore'])
        elif options['list_backups']:
            self.list_backups()
        else:
            self.stdout.write('Use --backup, --restore, or --list-backups')

    def create_backup(self, compress=False, verify=False):
        """Create database backup."""
        self.stdout.write('\n📦 Creating database backup...')
        
        # Get database connection info
        db_config = settings.DATABASES['default']
        
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'camtraffic_backup_{timestamp}'
        
        if compress:
            backup_file = self.backup_dir / f'{backup_name}.sql.gz'
            pg_dump_cmd = [
                'pg_dump',
                '-h', db_config['HOST'],
                '-p', str(db_config['PORT']),
                '-U', db_config['USER'],
                '-d', db_config['NAME'],
                '--verbose',
                '--no-password',
                '--format=custom',
                '--compress=6'
            ]
        else:
            backup_file = self.backup_dir / f'{backup_name}.sql'
            pg_dump_cmd = [
                'pg_dump',
                '-h', db_config['HOST'],
                '-p', str(db_config['PORT']),
                '-U', db_config['USER'],
                '-d', db_config['NAME'],
                '--verbose',
                '--no-password'
            ]
        
        try:
            # Set password via environment
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['PASSWORD']
            
            self.stdout.write(f'Running: {" ".join(pg_dump_cmd)}')
            
            with open(backup_file, 'wb') as f:
                result = subprocess.run(
                    pg_dump_cmd,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    env=env,
                    text=False
                )
            
            if result.returncode == 0:
                backup_size = backup_file.stat().st_size
                size_mb = backup_size / (1024 * 1024)
                
                self.stdout.write(self.style.SUCCESS(
                    f'✅ Backup created: {backup_file} ({size_mb:.1f} MB)'
                ))
                
                # Create backup metadata
                self.create_backup_metadata(backup_file, backup_size)
                
                if verify:
                    self.verify_backup(backup_file)
                
                return str(backup_file)
            else:
                error_msg = result.stderr.decode() if result.stderr else 'Unknown error'
                self.stdout.write(self.style.ERROR(f'❌ Backup failed: {error_msg}'))
                
                # Clean up failed backup file
                if backup_file.exists():
                    backup_file.unlink()
                
                return None
                
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(
                '❌ pg_dump not found. Install PostgreSQL client tools.'
            ))
            return None
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Backup error: {e}'))
            return None

    def restore_backup(self, backup_path):
        """Restore database from backup."""
        self.stdout.write(f'\n🔄 Restoring database from {backup_path}...')
        
        backup_file = Path(backup_path)
        if not backup_file.exists():
            self.stdout.write(self.style.ERROR(f'❌ Backup file not found: {backup_path}'))
            return
        
        # Confirm restoration
        response = input('⚠️  This will replace all data. Continue? (type "yes" to confirm): ')
        if response.lower() != 'yes':
            self.stdout.write('❌ Restoration cancelled')
            return
        
        db_config = settings.DATABASES['default']
        
        # Determine restore command based on file extension
        if backup_path.endswith('.sql.gz') or backup_path.endswith('.dump'):
            # Custom format backup
            pg_restore_cmd = [
                'pg_restore',
                '-h', db_config['HOST'],
                '-p', str(db_config['PORT']),
                '-U', db_config['USER'],
                '-d', db_config['NAME'],
                '--verbose',
                '--clean',
                '--no-password',
                str(backup_file)
            ]
        else:
            # Plain SQL backup
            psql_cmd = [
                'psql',
                '-h', db_config['HOST'],
                '-p', str(db_config['PORT']),
                '-U', db_config['USER'],
                '-d', db_config['NAME'],
                '--no-password',
                '-f', str(backup_file)
            ]
            pg_restore_cmd = psql_cmd
        
        try:
            # Set password via environment
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['PASSWORD']
            
            self.stdout.write(f'Running: {" ".join(pg_restore_cmd)}')
            
            result = subprocess.run(
                pg_restore_cmd,
                stderr=subprocess.PIPE,
                stdout=subprocess.PIPE,
                env=env,
                text=True
            )
            
            if result.returncode == 0:
                self.stdout.write(self.style.SUCCESS('✅ Database restored successfully'))
                
                # Run migrations to ensure schema is up to date
                from django.core.management import call_command
                call_command('migrate')
                
            else:
                error_msg = result.stderr if result.stderr else 'Unknown error'
                self.stdout.write(self.style.ERROR(f'❌ Restore failed: {error_msg}'))
                
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(
                '❌ PostgreSQL client tools not found. Install postgresql-client.'
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Restore error: {e}'))

    def list_backups(self):
        """List available backup files."""
        self.stdout.write('\n📋 Available Backups:')
        self.stdout.write('-' * 25)
        
        if not self.backup_dir.exists():
            self.stdout.write('No backup directory found')
            return
        
        # Find backup files
        backup_patterns = ['*.sql', '*.sql.gz', '*.dump']
        backup_files = []
        
        for pattern in backup_patterns:
            backup_files.extend(self.backup_dir.glob(pattern))
        
        if not backup_files:
            self.stdout.write('No backup files found')
            return
        
        # Sort by modification time (newest first)
        backup_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        
        for backup_file in backup_files:
            stat = backup_file.stat()
            size_mb = stat.st_size / (1024 * 1024)
            modified = timezone.datetime.fromtimestamp(stat.st_mtime)
            
            self.stdout.write(f'📄 {backup_file.name}')
            self.stdout.write(f'   Size: {size_mb:.1f} MB')
            self.stdout.write(f'   Modified: {modified.strftime("%Y-%m-%d %H:%M:%S")}')
            
            # Show metadata if available
            metadata_file = backup_file.with_suffix('.json')
            if metadata_file.exists():
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    self.stdout.write(f'   Records: {metadata.get("record_count", "Unknown")}')
                    self.stdout.write(f'   Database: {metadata.get("database_name", "Unknown")}')
                except:
                    pass
            
            self.stdout.write('')

    def verify_backup(self, backup_file):
        """Verify backup integrity."""
        self.stdout.write(f'\n🔍 Verifying backup integrity: {backup_file.name}')
        
        try:
            if str(backup_file).endswith('.sql.gz') or str(backup_file).endswith('.dump'):
                # For custom format, use pg_restore --list
                cmd = ['pg_restore', '--list', str(backup_file)]
            else:
                # For SQL files, check if it's valid SQL
                with open(backup_file, 'r') as f:
                    first_line = f.readline()
                    if 'PostgreSQL database dump' in first_line:
                        self.stdout.write('✅ Backup format appears valid')
                        return True
                    else:
                        self.stdout.write('⚠️  Unusual backup format')
                        return False
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Count objects in backup
                objects = result.stdout.count('\n')
                self.stdout.write(f'✅ Backup verified ({objects} objects)')
                return True
            else:
                self.stdout.write(f'❌ Backup verification failed: {result.stderr}')
                return False
                
        except Exception as e:
            self.stdout.write(f'❌ Verification error: {e}')
            return False

    def create_backup_metadata(self, backup_file, backup_size):
        """Create metadata file for backup."""
        try:
            # Get database statistics
            with connection.cursor() as cursor:
                cursor.execute('SELECT COUNT(*) FROM users')
                user_count = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM fines')  
                fine_count = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM cameras')
                camera_count = cursor.fetchone()[0]
            
            metadata = {
                'backup_file': backup_file.name,
                'created_at': timezone.now().isoformat(),
                'database_name': settings.DATABASES['default']['NAME'],
                'backup_size_bytes': backup_size,
                'record_count': {
                    'users': user_count,
                    'fines': fine_count,
                    'cameras': camera_count
                },
                'django_version': getattr(settings, 'DJANGO_VERSION', 'unknown'),
                'backup_type': 'full'
            }
            
            metadata_file = backup_file.with_suffix('.json')
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
                
        except Exception as e:
            self.stdout.write(f'⚠️  Could not create metadata: {e}')