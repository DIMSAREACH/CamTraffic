"""Create test users for CamTraffic system."""
import os
import sys
from pathlib import Path

import django

# Setup Django
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src' / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import Driver, Officer
from infrastructure.models import PoliceStation

User = get_user_model()

def create_test_users():
    """Create test users for each role."""
    
    # 1. Create Admin User
    if not User.objects.filter(email='admin@test.com').exists():
        admin = User.objects.create_user(
            email='admin@test.com',
            password='admin123',
            full_name='Admin User',
            role='admin',
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        print(f"✅ Created admin user: {admin.email}")
    else:
        print(f"ℹ️  Admin user already exists: admin@test.com")
    
    # 2. Create Police Officer User
    if not User.objects.filter(email='officer@test.com').exists():
        officer_user = User.objects.create_user(
            email='officer@test.com',
            password='officer123',
            full_name='John Officer',
            role='police',
            is_active=True,
        )
        
        # Create officer profile
        station, _ = PoliceStation.objects.get_or_create(
            name='Central Station',
            defaults={
                'code': 'CS001',
                'address': 'Phnom Penh, Cambodia',
                'phone': '+855 12 345 678',
            }
        )
        
        Officer.objects.get_or_create(
            user=officer_user,
            defaults={
                'badge_no': 'BADGE-001',
                'rank': 'Senior Officer',
                'department': 'Traffic Police',
                'station': station,
                'status': 'active',
            }
        )
        print(f"✅ Created officer user: {officer_user.email}")
    else:
        print(f"ℹ️  Officer user already exists: officer@test.com")
    
    # 3. Create Driver User
    if not User.objects.filter(email='driver@test.com').exists():
        driver_user = User.objects.create_user(
            email='driver@test.com',
            password='driver123',
            full_name='Sarah Driver',
            role='driver',
            is_active=True,
        )
        
        # Create driver profile
        Driver.objects.get_or_create(
            user=driver_user,
            defaults={
                'license_no': 'DL-PP-2024-001',
                'national_id': 'ID-123456789',
                'phone': '+855 12 987 654',
                'address': 'Phnom Penh, Cambodia',
                'kyc_status': 'approved',
                'status': 'active',
            }
        )
        print(f"✅ Created driver user: {driver_user.email}")
    else:
        print(f"ℹ️  Driver user already exists: driver@test.com")
    
    print("\n" + "="*50)
    print("🎉 TEST USERS READY!")
    print("="*50)
    print("\n📋 Login Credentials:")
    print("\n1️⃣  Admin Portal (http://localhost:5174)")
    print("   Email: admin@test.com")
    print("   Password: admin123")
    print("\n2️⃣  Officer Portal (http://localhost:5173)")
    print("   Email: officer@test.com")
    print("   Password: officer123")
    print("\n3️⃣  Driver Portal (http://localhost:5173)")
    print("   Email: driver@test.com")
    print("   Password: driver123")
    print("\n" + "="*50)

if __name__ == '__main__':
    create_test_users()
