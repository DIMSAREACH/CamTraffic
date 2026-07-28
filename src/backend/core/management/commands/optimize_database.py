"""Add critical missing indexes for production performance."""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Add missing database indexes for optimal performance'

    def handle(self, *args, **options):
        queries = [
            # Traffic Violations - High Traffic Queries
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violation_driver_date_v2
            ON traffic_violations(driver_id, violation_date DESC);
            ''',
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violation_status_driver_v2
            ON traffic_violations(status, driver_id);
            ''',
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violation_created_status
            ON traffic_violations(created_at DESC, status);
            ''',
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violation_officer_status
            ON traffic_violations(officer_id, status)
            WHERE officer_id IS NOT NULL;
            ''',
            
            # Fines - Payment Queries
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fine_status_driver
            ON fines(status, driver_id);
            ''',
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fine_due_date_status
            ON fines(due_date, status)
            WHERE status IN ('pending', 'overdue');
            ''',
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fine_driver_status_amount
            ON fines(driver_id, status, amount_paid);
            ''',
            
            # AI Detection Logs - Heavy Read Queries
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detection_user_confidence
            ON ai_detection_logs(user_id, confidence DESC)
            WHERE confidence >= 0.7;
            ''',
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detection_plate_created
            ON ai_detection_logs(detected_plate, created_at DESC)
            WHERE detected_plate != '';
            ''',
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detection_review_status
            ON ai_detection_logs(review_status, created_at DESC);
            ''',
            
            # Vehicles - Optimized Queries
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_owner_type_status
            ON vehicles(owner_id, vehicle_type, status);
            ''',
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_plate_trgm
            ON vehicles USING gin(plate_number gin_trgm_ops);
            ''',
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_driver_owner
            ON vehicles(driver_id, owner_id)
            WHERE driver_id IS NOT NULL;
            ''',
            
            # Notifications - User Inbox
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_read_created
            ON notifications(user_id, is_read, created_at DESC);
            ''',
            
            # Users - Active User Queries
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_active_created
            ON users(role, is_active, created_at DESC)
            WHERE deleted_at IS NULL;
            ''',
            
            # Drivers - KYC and Status Queries
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_kyc_status
            ON drivers(kyc_status, status, created_at DESC);
            ''',
            
            # Officers - Station Queries
            '''
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_officer_station_status
            ON officers(station_id, status)
            WHERE station_id IS NOT NULL;
            ''',
        ]
        
        self.stdout.write(self.style.WARNING('Creating indexes (this may take a few minutes)...'))
        
        with connection.cursor() as cursor:
            # Enable pg_trgm for fuzzy search (if not already enabled)
            try:
                cursor.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
                self.stdout.write(self.style.SUCCESS('✓ pg_trgm extension enabled'))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'⚠ Could not enable pg_trgm: {e}'))
            
            for i, query in enumerate(queries, 1):
                try:
                    cursor.execute(query)
                    index_name = query.split('idx_')[1].split('\n')[0].strip()
                    self.stdout.write(self.style.SUCCESS(f'✓ [{i}/{len(queries)}] Created index: idx_{index_name}'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'✗ [{i}/{len(queries)}] Failed: {e}'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Database optimization complete!'))
        self.stdout.write(self.style.WARNING('\nRun ANALYZE to update statistics:'))
        self.stdout.write('python manage.py dbshell -c "ANALYZE;"')
