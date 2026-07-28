#!/usr/bin/env python3
"""Test inserting a single driver."""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
django.setup()

from datetime import timedelta
from django.utils import timezone
from users.models import User, Driver
from vehicles.models import Vehicle

print("Testing single driver insertion...")

# Check current state
print(f"\nCurrent state:")
print(f"  Users (drivers): {User.objects.filter(role='driver').count()}")
print(f"  Drivers: {Driver.objects.count()}")
print(f"  Vehicles: {Vehicle.objects.count()}")

# Try to create a single driver
try:
    print("\nAttempting to create user with license PP-100000...")
    user = User.objects.create_user(
        email='test-single@example.com',
        password='testpass123',
        full_name='Test Driver',
        role='driver',
        phone='012-345-678',
        license_no='PP-100000',
        address='Test Address',
    )
    print(f"✓ User created: {user.id}")
    
    print("\nAttempting to create driver profile...")
    driver = Driver.objects.create(
        user=user,
        license_no='PP-100000',
        license_expiry=timezone.now().date() + timedelta(days=365),
        demerit_points=0,
        kyc_status='approved',
        status='active',
    )
    print(f"✓ Driver created: {driver.id}")
    
    print("\nAttempting to create vehicle...")
    vehicle = Vehicle.objects.create(
        driver=driver,
        owner=user,
        plate_number='PP 1A-1000',
        vehicle_type='car',
        make='Toyota',
        model='Camry',
        color='White',
        year=2020,
        status='active',
    )
    print(f"✓ Vehicle created: {vehicle.id}")
    
    print("\n✅ SUCCESS! All records created.")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print(f"Type: {type(e)}")

# Check final state
print(f"\nFinal state:")
print(f"  Users (drivers): {User.objects.filter(role='driver').count()}")
print(f"  Drivers: {Driver.objects.count()}")
print(f"  Vehicles: {Vehicle.objects.count()}")
