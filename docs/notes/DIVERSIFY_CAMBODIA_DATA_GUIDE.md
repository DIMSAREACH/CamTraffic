# 🇰🇭 Diversify Cambodian Violation Data - Complete Guide

## Problem

Your current violations database shows:
- **All violations from the same driver:** "Kosal Pich" 
- **All same violation type:** "No Parking"
- **No diversity** in locations, violation types, or dates

This makes the system look unrealistic for demonstration purposes.

## Solution

Replace the repetitive data with **diverse, realistic Cambodian traffic violations** including:
- ✅ **25+ different Cambodian driver names** (Sok Chantha, Chea Sokha, Pich Sothea, etc.)
- ✅ **7 different violation types** (NO_PARKING, NO_ENTRY, ILLEGAL_TURN, WEIGHT_LIMIT, etc.)
- ✅ **Real Cambodian locations** (Monivong Blvd, Street 51, Sisowath Quay, etc.)
- ✅ **Varied vehicle types** (motorcycles, cars, trucks, tuk-tuks)
- ✅ **Realistic Cambodian license plates** (PP 1A-2345, KM 2B-5678, etc.)
- ✅ **Mixed statuses** (40% confirmed, 30% pending, 20% rejected, 10% draft)
- ✅ **Recent dates** (last 60 days with varied times)

---

## 🚨 Database Issue: Accumulated Test Data

The database has accumulated many driver/violation records from testing that prevent new inserts due to unique constraints on license numbers.

### Step 1: Clean Database (Choose One Method)

#### Option A: SQL Script (Fastest) ⚡

Run this SQL directly in your PostgreSQL database:

```sql
-- WARNING: This will delete ALL violations, fines, drivers, and related data!
-- Make a backup first if you have important data.

-- Delete in correct order to avoid foreign key violations
TRUNCATE TABLE payment_transactions CASCADE;
TRUNCATE TABLE appeals CASCADE;
TRUNCATE TABLE fines CASCADE;
TRUNCATE TABLE ai_detection_logs CASCADE;
TRUNCATE TABLE traffic_violations CASCADE;
TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE drivers CASCADE;
DELETE FROM users WHERE role = 'driver';

-- Reset sequences (optional - for clean IDs)
-- ALTER SEQUENCE IF EXISTS violations_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS drivers_id_seq RESTART WITH 1;

SELECT 'Database cleaned!' AS status;
```

**To run:**
```bash
# Via psql
psql -U your_db_user -d camtraffic_db -f clean_database.sql

# Or via Django dbshell
cd src/backend
python manage.py dbshell < clean_database.sql
```

#### Option B: Django Management Command

```bash
cd src/backend

# Delete payment transactions first (these are blocking)
python manage.py shell -c "from fines.models import PaymentTransaction; PaymentTransaction.objects.all().delete(); print('Payments deleted')"

# Delete appeals
python manage.py shell -c "from appeals.models import Appeal; Appeal.objects.all().delete(); print('Appeals deleted')"

# Delete fines
python manage.py shell -c "from fines.models import Fine; Fine.objects.all().delete(); print('Fines deleted')"

# Delete AI logs
python manage.py shell -c "from ai_detection.models import AIDetectionLog; AIDetectionLog.objects.all().delete(); print('AI logs deleted')"

# Delete violations
python manage.py shell -c "from violations.models import TrafficViolation; TrafficViolation.objects.all().delete(); print('Violations deleted')"

# Delete vehicles
python manage.py shell -c "from vehicles.models import Vehicle; Vehicle.objects.all().delete(); print('Vehicles deleted')"

# Delete drivers
python manage.py shell -c "from users.models import Driver, User; Driver.objects.all().delete(); User.objects.filter(role='driver').delete(); print('Drivers deleted')"
```

---

### Step 2: Generate Diverse Cambodian Data

After cleaning, run the population command:

```bash
cd src/backend
python manage.py populate_cambodia_violations --count 150
```

This will create:
- **150 unique violations**
- **150 different drivers** with Cambodian names
- **150 vehicles** with realistic Cambodian plates
- **Diverse violation types** and locations
- **Mixed statuses** for realistic demo

---

## Generated Data Examples

### Cambodian Driver Names
```
Sok Chantha, Chea Sokha, Pich Sothea, Heng Dara, Hor Sophea,
Kong Rattana, Lim Bopha, Meas Kunthea, Nhem Sreypov, Ouk Chanthy,
Prak Piseth, Ros Virak, Sao Samnang, Tep Sophal, Ung Kimheng,
Vong Phirun, Yem Sokchea, Khiev Bunrith, Leng Socheat, Men Veasna,
Nou Chandara, Seng Rithy, Touch Sovann, Van Panha, Yen Raksa
```

### Violation Types & Locations
```
1. NO_PARKING - Sisowath Quay, Street 51, Street 240
   Fine: $50.00

2. NO_ENTRY - Street 178, Monivong Blvd, Street 271
   Fine: $100.00

3. ILLEGAL_LEFT_TURN - Monivong & Mao Tse Toung, Norodom & St 240
   Fine: $75.00

4. ILLEGAL_RIGHT_TURN - Preah Sihanouk Blvd, Street 51 junction
   Fine: $75.00

5. ILLEGAL_U_TURN - Monivong Blvd, Norodom Blvd, Hun Sen Blvd
   Fine: $80.00

6. NO_STOPPING - Monivong Bridge, Japanese Bridge, Independence Monument
   Fine: $60.00

7. WEIGHT_LIMIT_VIOLATION - National Road 1, 4, 5, Chroy Changvar Bridge
   Fine: $200.00
```

### Vehicle Types
- **Motorcycles:** Honda Dream, Yamaha Exciter, Honda Click, Suzuki Raider
- **Cars:** Toyota Camry, Honda Civic, Mazda 3, Hyundai Elantra
- **SUVs:** Toyota Fortuner, Ford Everest, Mazda CX-5
- **Trucks:** Hino, Isuzu, Mitsubishi Fuso
- **Tuk-tuks:** Bajaj RE, TVS King, Piaggio Ape

### License Plate Format
```
PP 1A-2345  (Phnom Penh)
KM 2B-5678  (Kampong Cham)
SR 3C-9012  (Siem Reap)
BT 4D-3456  (Battambang)
```

---

## Expected Result

### Before (Repetitive):
| Driver | Violation Type | Sign | Location | Status |
|--------|---------------|------|----------|--------|
| Kosal Pich | No Parking | NO_PARKING | Charles de Gaulle Bl. | Confirmed |
| Kosal Pich | No Parking | NO_PARKING | Ekarearch St. | Rejected |
| Kosal Pich | No Parking | NO_PARKING | Sivatha Blvd. | Confirmed |
| Kosal Pich | No Parking | NO_PARKING | Sivatha Blvd. | Confirmed |
| ... | ... | ... | ... | ... |

### After (Diverse):
| Driver | Violation Type | Sign | Location | Status |
|--------|---------------|------|----------|--------|
| Sok Chantha | No Parking | NO_PARKING | Sisowath Quay | Confirmed |
| Chea Sokha | No Entry | NO_ENTRY | Monivong Blvd | Rejected |
| Pich Sothea | Illegal Left Turn | ILLEGAL_LEFT_TURN | Street 271 junction | Pending |
| Heng Dara | Illegal U-Turn | ILLEGAL_U_TURN | Norodom Blvd | Confirmed |
| Hor Sophea | Weight Limit | WEIGHT_LIMIT | National Road 1 | Draft |
| Kong Rattana | No Stopping | NO_STOPPING | Japanese Bridge | Confirmed |
| Lim Bopha | Illegal Right Turn | ILLEGAL_RIGHT_TURN | Street 51 | Rejected |
| Meas Kunthea | No Parking | NO_PARKING | Central Market | Pending |
| ... | ... | ... | ... | ... |

---

## Troubleshooting

### Issue: "duplicate key value violates unique constraint"

**Cause:** Previous test data still in database

**Solution:** Run Step 1 (Clean Database) first, then Step 2

### Issue: Foreign key constraint violations

**Cause:** Deleting in wrong order

**Solution:** Use the SQL TRUNCATE CASCADE script (Option A) - it handles all foreign keys automatically

### Issue: Command creates 0 violations

**Cause:** Database wasn't properly cleaned

**Solution:**
1. Check driver count: `python manage.py shell -c "from users.models import Driver; print(Driver.objects.count())"`
2. If > 0, run Step 1 again
3. Then run Step 2

---

## Verification

After generating data, verify diversity:

```bash
cd src/backend

# Check violation type distribution
python manage.py shell -c "from violations.models import TrafficViolation; from django.db.models import Count; print(TrafficViolation.objects.values('violation_type').annotate(count=Count('id')).order_by('violation_type'))"

# Check driver name diversity
python manage.py shell -c "from violations.models import TrafficViolation; print(set(v.driver.user.full_name for v in TrafficViolation.objects.select_related('driver__user')[:50]))"

# Check status distribution
python manage.py shell -c "from violations.models import TrafficViolation; from django.db.models import Count; print(TrafficViolation.objects.values('status').annotate(count=Count('id')))"
```

Expected output:
```
# Violation types
[{'violation_type': 'ILLEGAL_LEFT_TURN', 'count': 18},
 {'violation_type': 'ILLEGAL_RIGHT_TURN', 'count': 22},
 {'violation_type': 'ILLEGAL_U_TURN', 'count': 19},
 {'violation_type': 'NO_ENTRY', 'count': 20},
 {'violation_type': 'NO_PARKING', 'count': 25},
 {'violation_type': 'NO_STOPPING', 'count': 23},
 {'violation_type': 'WEIGHT_LIMIT_VIOLATION', 'count': 23}]

# Driver names (sample)
{'Sok Chantha', 'Chea Sokha', 'Pich Sothea', 'Heng Dara', 'Hor Sophea', ...}

# Status distribution
[{'status': 'confirmed', 'count': 60},
 {'status': 'pending_review', 'count': 45},
 {'status': 'rejected', 'count': 30},
 {'status': 'draft', 'count': 15}]
```

---

## Frontend Refresh

After generating data, refresh your browser to see the changes:

1. **Hard refresh:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Or restart frontend:**
   ```bash
   # Stop frontend (Ctrl+C)
   # Then restart
   npm run dev
   ```

---

## Files Created

The system includes these management commands:

1. **`populate_cambodia_violations.py`** - Generate diverse Cambodian violations
   - Location: `src/backend/core/management/commands/`
   - Usage: `python manage.py populate_cambodia_violations --count 150`
   - Features: Real names, locations, vehicle types, varied violations

2. **`diversify_violations.py`** - Update existing violations (alternative approach)
   - Location: `src/backend/core/management/commands/`
   - Usage: `python manage.py diversify_violations`
   - Note: Requires existing violations to update

---

## Production Notes

### For Real Deployment:
- Remove demo data generation commands in production
- Use real RTSP camera streams
- Enable actual OCR for license plate reading
- Connect to payment gateways
- Implement proper email notifications
- Add SMS alerts for drivers

### Data Retention:
- Keep violations for legal compliance (7 years recommended)
- Archive old data after statute of limitations
- Regular database backups
- GDPR/privacy compliance for driver data

---

## Summary

✅ **What This Does:**
- Replaces repetitive test data with realistic Cambodian violations
- Adds diversity in drivers, vehicles, locations, and violation types
- Makes the system demo-ready with authentic-looking data

🎯 **Result:**
Your violations table will show a realistic traffic enforcement system with varied drivers, violation types, and statuses - perfect for demonstrations and testing!

---

**Status:** Ready to implement  
**Last Updated:** July 26, 2026  
**Database:** PostgreSQL with Django ORM
