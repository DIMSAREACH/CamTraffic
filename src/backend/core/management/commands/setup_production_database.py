"""
Management command to set up production PostgreSQL database with real data.
Removes demo accounts, configures production settings, and sets up proper data.
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction, connection
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
import os

User = get_user_model()


class Command(BaseCommand):
    help = 'Set up production PostgreSQL database with real enforcement data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--remove-demo-data',
            action='store_true',
            help='Remove all demo and sample data',
        )
        parser.add_argument(
            '--create-admin',
            type=str,
            help='Create production admin user (email)',
        )
        parser.add_argument(
            '--admin-password',
            type=str,
            help='Password for production admin user',
        )
        parser.add_argument(
            '--seed-production',
            action='store_true',
            help='Seed with production-ready reference data',
        )
        parser.add_argument(
            '--optimize-db',
            action='store_true',
            help='Run database optimization and indexing',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        """Set up production database based on options."""
        
        # Verify we're not in SQLite mode
        if getattr(settings, 'USE_SQLITE', True):
            self.stdout.write(
                self.style.ERROR(
                    '❌ Cannot run production setup with USE_SQLITE=True. '
                    'Set USE_SQLITE=False in production settings.'
                )
            )
            return
        
        # Check database connection
        if not self.check_database_connection():
            return
        
        self.stdout.write('🗄️  CamTraffic Production Database Setup')
        self.stdout.write('=' * 45)
        
        if options['dry_run']:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Run setup steps
        if options['remove_demo_data']:
            self.remove_demo_data(options['dry_run'])
        
        if options['create_admin']:
            self.create_production_admin(
                options['create_admin'], 
                options['admin_password'],
                options['dry_run']
            )
        
        if options['seed_production']:
            self.seed_production_data(options['dry_run'])
        
        if options['optimize_db']:
            self.optimize_database(options['dry_run'])
        
        # Run migrations to ensure DB is up to date
        self.run_migrations(options['dry_run'])
        
        # Final database health check
        self.check_database_health()

    def check_database_connection(self) -> bool:
        """Check PostgreSQL database connection and configuration."""
        self.stdout.write('🔍 Checking database connection...')
        
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT version()')
                version = cursor.fetchone()[0]
                
                if 'PostgreSQL' in version:
                    self.stdout.write(f'✅ Connected to {version.split(",")[0]}')
                    return True
                else:
                    self.stdout.write(self.style.ERROR(f'❌ Not PostgreSQL: {version}'))
                    return False
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Database connection failed: {e}'))
            return False

    def remove_demo_data(self, dry_run=False):
        """Remove demo accounts and sample data."""
        self.stdout.write('\n🧹 Removing demo data...')
        
        # Demo users to remove (by email patterns)
        demo_patterns = [
            '@camtraffic.demo',
            '@example.com',
            '@test.com',
            'demo@',
            'test@',
            'sample@'
        ]
        
        # Find demo users
        demo_users = User.objects.none()
        for pattern in demo_patterns:
            demo_users = demo_users.union(
                User.objects.filter(email__icontains=pattern)
            )
        
        demo_count = demo_users.count()
        
        if demo_count > 0:
            self.stdout.write(f'📋 Found {demo_count} demo users to remove:')
            for user in demo_users[:10]:  # Show first 10
                self.stdout.write(f'   - {user.email} ({user.role})')
            
            if demo_count > 10:
                self.stdout.write(f'   ... and {demo_count - 10} more')
            
            if not dry_run:
                # Use soft delete to preserve audit trail
                demo_users.update(
                    is_active=False,
                    deleted_at=timezone.now()
                )
                self.stdout.write(self.style.SUCCESS(f'✅ Soft-deleted {demo_count} demo users'))
            else:
                self.stdout.write(f'Would soft-delete {demo_count} demo users')
        else:
            self.stdout.write('✅ No demo users found')
        
        # Remove sample violation rules with demo references
        if not dry_run:
            from violations.models import ViolationRule
            
            demo_rules = ViolationRule.objects.filter(
                description__icontains='demo'
            ).union(
                ViolationRule.objects.filter(
                    title__icontains='sample'
                )
            )
            
            demo_rules_count = demo_rules.count()
            if demo_rules_count > 0:
                demo_rules.delete()
                self.stdout.write(f'✅ Removed {demo_rules_count} demo violation rules')
        
        # Clean up demo fines and violations
        if not dry_run:
            self.clean_demo_enforcement_data()

    def clean_demo_enforcement_data(self):
        """Clean demo enforcement data (fines, violations)."""
        from fines.models import Fine
        from violations.models import TrafficViolation
        
        # Remove fines with demo references
        demo_fines = Fine.objects.filter(
            payment_reference__icontains='DEMO'
        ).union(
            Fine.objects.filter(
                reason__icontains='demo'
            )
        )
        
        demo_fines_count = demo_fines.count()
        if demo_fines_count > 0:
            demo_fines.delete()
            self.stdout.write(f'✅ Removed {demo_fines_count} demo fines')
        
        # Remove violations with demo descriptions
        demo_violations = TrafficViolation.objects.filter(
            description__icontains='demo'
        )
        
        demo_violations_count = demo_violations.count()
        if demo_violations_count > 0:
            demo_violations.delete()
            self.stdout.write(f'✅ Removed {demo_violations_count} demo violations')

    def create_production_admin(self, email, password=None, dry_run=False):
        """Create production admin user."""
        self.stdout.write(f'\n👤 Creating production admin user: {email}')
        
        if User.objects.filter(email=email).exists():
            self.stdout.write(f'⚠️  User {email} already exists')
            return
        
        if not password:
            password = input('Enter admin password: ')
        
        if not dry_run:
            admin_user = User.objects.create_user(
                email=email,
                password=password,
                first_name='System',
                last_name='Administrator',
                role='admin',
                is_staff=True,
                is_superuser=True,
                email_verified=True
            )
            
            self.stdout.write(self.style.SUCCESS(f'✅ Created admin user: {admin_user.email}'))
        else:
            self.stdout.write(f'Would create admin user: {email}')

    def seed_production_data(self, dry_run=False):
        """Seed production-ready reference data."""
        self.stdout.write('\n🌱 Seeding production reference data...')
        
        if not dry_run:
            try:
                # Run production seed command
                call_command('seed_production', verbosity=1)
                self.stdout.write('✅ Production data seeded successfully')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Seeding failed: {e}'))
        else:
            self.stdout.write('Would run seed_production command')

    def optimize_database(self, dry_run=False):
        """Run database optimization and create indexes."""
        self.stdout.write('\n⚡ Optimizing database performance...')
        
        optimizations = [
            # Analyze tables for query planner
            'ANALYZE;',
            # Update table statistics
            'VACUUM ANALYZE;',
            # Reindex if needed (commented out for safety)
            # 'REINDEX DATABASE;',
        ]
        
        if not dry_run:
            try:
                with connection.cursor() as cursor:
                    for sql in optimizations:
                        self.stdout.write(f'   Running: {sql}')
                        cursor.execute(sql)
                
                self.stdout.write('✅ Database optimization completed')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Optimization failed: {e}'))
        else:
            self.stdout.write(f'Would run {len(optimizations)} optimization commands')

    def run_migrations(self, dry_run=False):
        """Ensure database migrations are up to date."""
        self.stdout.write('\n🔄 Checking database migrations...')
        
        if not dry_run:
            try:
                call_command('migrate', verbosity=1)
                self.stdout.write('✅ Migrations up to date')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Migration failed: {e}'))
        else:
            self.stdout.write('Would run migrate command')

    def check_database_health(self):
        """Check database health and configuration."""
        self.stdout.write('\n🔍 Database Health Check:')
        self.stdout.write('-' * 25)
        
        try:
            with connection.cursor() as cursor:
                # Check database size
                cursor.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as size
                """)
                db_size = cursor.fetchone()[0]
                self.stdout.write(f'📊 Database size: {db_size}')
                
                # Check connection limits
                cursor.execute('SHOW max_connections')
                max_conn = cursor.fetchone()[0]
                self.stdout.write(f'🔗 Max connections: {max_conn}')
                
                # Check active connections
                cursor.execute("""
                    SELECT count(*) FROM pg_stat_activity 
                    WHERE state = 'active'
                """)
                active_conn = cursor.fetchone()[0]
                self.stdout.write(f'⚡ Active connections: {active_conn}')
                
                # Check table counts
                cursor.execute("""
                    SELECT schemaname, tablename, n_tup_ins as inserts, n_tup_upd as updates, n_tup_del as deletes
                    FROM pg_stat_user_tables 
                    WHERE schemaname = 'public'
                    ORDER BY n_tup_ins DESC
                    LIMIT 5
                """)
                
                self.stdout.write(f'📈 Top 5 active tables:')
                for row in cursor.fetchall():
                    schema, table, inserts, updates, deletes = row
                    self.stdout.write(f'   {table}: {inserts} inserts, {updates} updates, {deletes} deletes')
                
                # Check for production data
                cursor.execute('SELECT COUNT(*) FROM users')
                user_count = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM fines')
                fine_count = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM cameras')
                camera_count = cursor.fetchone()[0]
                
                self.stdout.write(f'\n📊 Data Overview:')
                self.stdout.write(f'   Users: {user_count}')
                self.stdout.write(f'   Fines: {fine_count}')
                self.stdout.write(f'   Cameras: {camera_count}')
                
                if user_count > 0 and camera_count > 0:
                    self.stdout.write(self.style.SUCCESS('✅ Database contains production data'))
                else:
                    self.stdout.write(self.style.WARNING('⚠️  Database appears empty - consider seeding'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Health check failed: {e}'))