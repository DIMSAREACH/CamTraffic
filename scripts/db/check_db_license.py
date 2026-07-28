#!/usr/bin/env python3
"""Check database for specific license number."""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
django.setup()

from django.db import connection

# Check drivers table directly
with connection.cursor() as cursor:
    # Check if license_no PV-9364A7 exists
    cursor.execute("SELECT id, license_no FROM drivers WHERE license_no LIKE 'PV-9364%'")
    rows = cursor.fetchall()
    print(f"\nDrivers with license 'PV-9364%': {len(rows)}")
    for row in rows[:10]:
        print(f"  - {row}")
    
    # Check total count
    cursor.execute("SELECT COUNT(*) FROM drivers")
    count = cursor.fetchone()[0]
    print(f"\nTotal drivers in table: {count}")
    
    # Check if there are any drivers at all
    cursor.execute("SELECT id, license_no FROM drivers LIMIT 10")
    rows = cursor.fetchall()
    print(f"\nFirst 10 drivers:")
    for row in rows:
        print(f"  - {row}")
