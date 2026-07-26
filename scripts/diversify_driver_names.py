#!/usr/bin/env python
"""
Diversify driver names in violations for more realistic data display.
Run: cd src/backend && python ../../scripts/diversify_driver_names.py
"""
import os
import sys
import django
import random

# Setup Django
sys.path.insert(0, os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from violations.models import Violation
from users.models import User

# Realistic Cambodian names
CAMBODIAN_NAMES = [
    'Sokha Chan', 'Dara Kim', 'Srey Pov', 'Vanna Ly', 'Sophea Oum',
    'Ratana Kong', 'Bopha Chea', 'Piseth Heng', 'Chenda Sok', 'Rithy Mao',
    'Kunthea Tan', 'Narith Sam', 'Sreypov Keo', 'Virak Sim', 'Makara Chhin',
    'Sothea Prak', 'Reaksmey Nith', 'Channary Um', 'Pheakdey Yim', 'Soksan Chea',
    'Bunthoeun Hak', 'Chanmony Yun', 'Raksa Pech', 'Sopheak Nget', 'Vannak Hor',
]

def diversify_names():
    """Update violations to have different driver names."""
    
    print("🔄 Diversifying driver names in violations...")
    
    # Get all violations
    violations = Violation.objects.select_related('driver').all()
    
    if not violations.exists():
        print("❌ No violations found in database")
        return
    
    print(f"📊 Found {violations.count()} violations")
    
    # Get all drivers
    drivers = list(User.objects.filter(role='driver'))
    
    if len(drivers) < 5:
        print("⚠️  Not enough drivers in database. Creating sample drivers...")
        # Create some sample drivers if needed
        for i, name in enumerate(CAMBODIAN_NAMES[:10]):
            if not User.objects.filter(full_name=name).exists():
                parts = name.split()
                username = f"{parts[0].lower()}.{parts[1].lower()}"
                email = f"{username}@example.com"
                
                driver = User.objects.create_user(
                    username=username,
                    email=email,
                    password='CamTraffic2026!',
                    full_name=name,
                    role='driver',
                    license_no=f'KH-{random.randint(100000, 999999)}',
                )
                drivers.append(driver)
                print(f"   ✓ Created driver: {name}")
    
    # Update violations with different drivers
    updated = 0
    for violation in violations:
        # Randomly assign a different driver
        new_driver = random.choice(drivers)
        if violation.driver_id != new_driver.id:
            violation.driver = new_driver
            violation.driver_name = new_driver.full_name
            violation.driver_license = new_driver.license_no or ''
            violation.save(update_fields=['driver', 'driver_name', 'driver_license'])
            updated += 1
    
    print(f"✅ Updated {updated} violations with diversified driver names")
    print(f"📋 Sample drivers used: {', '.join([d.full_name for d in drivers[:5]])}...")

if __name__ == '__main__':
    diversify_names()
