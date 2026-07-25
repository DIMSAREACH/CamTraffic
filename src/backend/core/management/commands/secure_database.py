"""
Management command to configure database security settings for production.
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
import os


class Command(BaseCommand):
    help = 'Configure PostgreSQL security settings for production'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-only',
            action='store_true',
            help='Only check current security settings without making changes',
        )
        parser.add_argument(
            '--apply-settings',
            action='store_true', 
            help='Apply recommended security settings',
        )

    def handle(self, *args, **options):
        """Configure database security settings."""
        
        self.stdout.write('🔐 CamTraffic Database Security Configuration')
        self.stdout.write('=' * 45)
        
        if not self.check_postgresql_connection():
            return
        
        if options['check_only'] or not options['apply_settings']:
            self.check_security_settings()
        
        if options['apply_settings']:
            self.apply_security_settings()

    def check_postgresql_connection(self) -> bool:
        """Check PostgreSQL connection."""
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT version()')
                version = cursor.fetchone()[0]
                
                if 'PostgreSQL' not in version:
                    self.stdout.write(self.style.ERROR('❌ Not connected to PostgreSQL'))
                    return False
                
                self.stdout.write(f'✅ Connected to {version.split(",")[0]}')
                return True
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Database connection failed: {e}'))
            return False

    def check_security_settings(self):
        """Check current database security configuration."""
        self.stdout.write('\n🔍 Current Security Settings:')
        self.stdout.write('-' * 30)
        
        with connection.cursor() as cursor:
            # Check SSL configuration
            try:
                cursor.execute('SHOW ssl')
                ssl_enabled = cursor.fetchone()[0]
                if ssl_enabled == 'on':
                    self.stdout.write('✅ SSL: Enabled')
                else:
                    self.stdout.write('⚠️  SSL: Disabled (recommended: enabled)')
            except Exception:
                self.stdout.write('❓ SSL: Unable to check')
            
            # Check log settings
            security_settings = [
                ('log_statement', 'all', 'Statement logging'),
                ('log_connections', 'on', 'Connection logging'),
                ('log_disconnections', 'on', 'Disconnection logging'),
                ('log_duration', 'on', 'Query duration logging'),
                ('shared_preload_libraries', 'pg_stat_statements', 'Query statistics'),
            ]
            
            for setting, recommended, description in security_settings:
                try:
                    cursor.execute(f'SHOW {setting}')
                    current_value = cursor.fetchone()[0]
                    
                    if recommended in current_value:
                        self.stdout.write(f'✅ {description}: {current_value}')
                    else:
                        self.stdout.write(f'⚠️  {description}: {current_value} (recommended: {recommended})')
                except Exception:
                    self.stdout.write(f'❓ {description}: Unable to check')
            
            # Check user permissions
            self.check_user_permissions()
            
            # Check database access rules
            self.check_access_rules()

    def check_user_permissions(self):
        """Check database user permissions."""
        self.stdout.write('\n👤 User Permissions:')
        
        with connection.cursor() as cursor:
            # Get current database user
            cursor.execute('SELECT current_user')
            current_user = cursor.fetchone()[0]
            self.stdout.write(f'Current user: {current_user}')
            
            # Check if user is superuser
            cursor.execute("""
                SELECT usesuper FROM pg_user WHERE usename = current_user
            """)
            is_superuser = cursor.fetchone()[0]
            
            if is_superuser:
                self.stdout.write('⚠️  Current user has SUPERUSER privileges (not recommended for production)')
            else:
                self.stdout.write('✅ Current user does not have SUPERUSER privileges')
            
            # Check database privileges
            cursor.execute("""
                SELECT has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
                       has_database_privilege(current_user, current_database(), 'CONNECT') as can_connect
            """)
            can_create, can_connect = cursor.fetchone()
            
            self.stdout.write(f'Database privileges: CREATE={can_create}, CONNECT={can_connect}')

    def check_access_rules(self):
        """Check database access control rules."""
        self.stdout.write('\n🚪 Access Control:')
        
        # Check environment variables for connection security
        db_settings = {
            'DB_HOST': os.getenv('DB_HOST', 'localhost'),
            'DB_PORT': os.getenv('DB_PORT', '5432'),
            'DB_NAME': os.getenv('DB_NAME', ''),
            'DB_USER': os.getenv('DB_USER', ''),
        }
        
        # Security recommendations
        if db_settings['DB_HOST'] == 'localhost':
            self.stdout.write('⚠️  Database on localhost (consider dedicated server)')
        else:
            self.stdout.write(f'✅ Database host: {db_settings["DB_HOST"]}')
        
        if db_settings['DB_PORT'] == '5432':
            self.stdout.write('⚠️  Using default PostgreSQL port (consider changing)')
        else:
            self.stdout.write(f'✅ Custom port: {db_settings["DB_PORT"]}')
        
        # Check password policy (Django side)
        self.check_password_policy()

    def check_password_policy(self):
        """Check password policy configuration."""
        self.stdout.write('\n🔑 Password Policy:')
        
        # Check Django password validators
        password_validators = getattr(settings, 'AUTH_PASSWORD_VALIDATORS', [])
        
        if password_validators:
            self.stdout.write(f'✅ {len(password_validators)} password validators configured')
            for validator in password_validators:
                name = validator['NAME'].split('.')[-1]
                self.stdout.write(f'   - {name}')
        else:
            self.stdout.write('⚠️  No password validators configured')

    def apply_security_settings(self):
        """Apply recommended security settings."""
        self.stdout.write('\n🔧 Applying Security Settings:')
        self.stdout.write('-' * 30)
        
        self.stdout.write('⚠️  Database security settings require PostgreSQL configuration file changes.')
        self.stdout.write('Add these settings to postgresql.conf:')
        self.stdout.write('')
        
        recommended_settings = [
            "# Security Settings for CamTraffic Production",
            "ssl = on",
            "log_connections = on", 
            "log_disconnections = on",
            "log_statement = 'all'",
            "log_duration = on",
            "shared_preload_libraries = 'pg_stat_statements'",
            "",
            "# Performance & Security",
            "max_connections = 100",
            "shared_buffers = 256MB",
            "effective_cache_size = 1GB",
            "work_mem = 4MB",
            "",
            "# Add to pg_hba.conf:",
            "# host all camtraffic_user 192.168.1.0/24 md5",
            "# hostssl all camtraffic_user 0.0.0.0/0 md5",
        ]
        
        for setting in recommended_settings:
            self.stdout.write(f'  {setting}')
        
        self.stdout.write('\n💡 Additional Security Recommendations:')
        self.stdout.write('  1. Create dedicated database user (not postgres superuser)')
        self.stdout.write('  2. Use SSL certificates for database connections')
        self.stdout.write('  3. Configure firewall to restrict database access')
        self.stdout.write('  4. Enable regular database backups')
        self.stdout.write('  5. Monitor database logs for suspicious activity')
        
        # Create SQL script for database user creation
        self.create_user_script()

    def create_user_script(self):
        """Create SQL script for production database user."""
        
        db_name = os.getenv('DB_NAME', 'camtraffic_production')
        db_user = os.getenv('DB_USER', 'camtraffic_user')
        
        sql_script = f"""
-- CamTraffic Production Database User Setup
-- Run as PostgreSQL superuser

-- Create database and user
CREATE DATABASE {db_name};
CREATE USER {db_user} WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Grant necessary privileges
GRANT CONNECT ON DATABASE {db_name} TO {db_user};
GRANT USAGE ON SCHEMA public TO {db_user};
GRANT CREATE ON SCHEMA public TO {db_user};

-- Connect to the database and grant table privileges
\\c {db_name};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {db_user};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {db_user};

-- Grant privileges on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {db_user};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {db_user};

-- Create backup user (read-only)
CREATE USER {db_user}_backup WITH ENCRYPTED PASSWORD 'backup_password_here';
GRANT CONNECT ON DATABASE {db_name} TO {db_user}_backup;
GRANT USAGE ON SCHEMA public TO {db_user}_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO {db_user}_backup;
"""
        
        script_path = 'setup_database_user.sql'
        with open(script_path, 'w') as f:
            f.write(sql_script)
        
        self.stdout.write(f'\n📄 Database user setup script created: {script_path}')
        self.stdout.write('   Review and run as PostgreSQL superuser')