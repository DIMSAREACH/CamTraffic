#!/usr/bin/env python3
"""Check for existing license numbers in the database."""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
django.setup()

from users.models import User, Driver

# Check for driver users
driver_users = User.objects.filter(role='driver')
print(f"\nDriver Users: {driver_users.count()}")
for user in driver_users[:10]:
    print(f"  - {user.email}: license={user.license_no}")

# Check for driver profiles
drivers = Driver.objects.all()
print(f"\nDriver Profiles: {drivers.count()}")
for driver in drivers[:10]:
    print(f"  - {driver.user.email}: license={driver.license_no}")
