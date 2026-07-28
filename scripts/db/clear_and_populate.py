#!/usr/bin/env python3
"""
Clear database and populate with violations in a single script to avoid connection issues.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
django.setup()

from django.db import connection
from users.models import User

print("🗑️  Clearing database...")

# Use raw SQL TRUNCATE CASCADE to clear everything
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
    'officers',
]

with connection.cursor() as cursor:
    for table in tables_to_clear:
        try:
            cursor.execute(f"TRUNCATE TABLE {table} CASCADE")
            print(f"  ✓ {table} truncated")
        except Exception as e:
            print(f"  - Could not truncate {table}: {e}")

# Delete driver and officer users
User.objects.filter(role='driver').delete()
User.objects.filter(role='police').delete()
print("  ✓ Driver and officer users deleted")

# Close and reopen connection
connection.close()
print("\n✅ Database cleared. Connection closed.")
print("\n📝 Now run: cd src/backend && python manage.py populate_cambodia_violations --count 150")
