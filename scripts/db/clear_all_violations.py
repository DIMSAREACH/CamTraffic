#!/usr/bin/env python3
"""
Clear ALL violations, drivers, and vehicles from the database.
This is a complete reset to allow fresh data generation.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
django.setup()

from django.db import connection
from violations.models import TrafficViolation
from vehicles.models import Vehicle
from users.models import Driver, User
from fines.models import Fine
from appeals.models import ViolationAppeal
from fines.installments import InstallmentPayment, InstallmentPlan

def clear_all():
    """Clear all violation-related data."""
    print("🗑️  Clearing ALL violations, vehicles, and drivers...")
    
    # Count before
    v_count = TrafficViolation.objects.count()
    ve_count = Vehicle.objects.count()
    d_count = Driver.objects.count()
    du_count = User.objects.filter(role='driver').count()
    f_count = Fine.objects.count()
    a_count = ViolationAppeal.objects.count()
    
    print(f"\nBefore deletion:")
    print(f"  - Violations: {v_count}")
    print(f"  - Vehicles: {ve_count}")
    print(f"  - Drivers: {d_count}")
    print(f"  - Driver Users: {du_count}")
    print(f"  - Fines: {f_count}")
    print(f"  - Appeals: {a_count}")
    
    # Delete in correct order using TRUNCATE CASCADE (handles all dependencies)
    print("\nDeleting using TRUNCATE CASCADE...")
    
    tables_to_clear = [
        'payment_receipts',
        'payment_logs',
        'payment_transactions',
        'installment_payments',
        'installment_plans',
        'violation_appeals',
        'fines',
        'ai_detection_logs',
        'traffic_violations',
        'vehicles',
        'drivers',
    ]
    
    try:
        with connection.cursor() as cursor:
            for table in tables_to_clear:
                try:
                    cursor.execute(f"TRUNCATE TABLE {table} CASCADE")
                    print(f"  ✓ {table} truncated")
                except Exception as e:
                    print(f"  - Could not truncate {table}: table may not exist")
    except Exception as e:
        print(f"  ! Error during truncation: {e}")
    
    # Delete driver users (role = 'driver')
    try:
        User.objects.filter(role='driver').delete()
        print("  ✓ Driver users deleted")
    except Exception as e:
        print(f"  ! Could not delete driver users: {e}")
    
    # Count after
    v_count = TrafficViolation.objects.count()
    ve_count = Vehicle.objects.count()
    d_count = Driver.objects.count()
    du_count = User.objects.filter(role='driver').count()
    
    print(f"\nAfter deletion:")
    print(f"  - Violations: {v_count}")
    print(f"  - Vehicles: {ve_count}")
    print(f"  - Drivers: {d_count}")
    print(f"  - Driver Users: {du_count}")
    
    print("\n✅ Database cleared successfully!")
    print("\nNext step:")
    print("  cd src/backend")
    print("  python manage.py populate_cambodia_violations --count 150")

if __name__ == '__main__':
    clear_all()
