# ✅ Cambodian Traffic Violation Data - Ready to Deploy

## What Was Created

I've created a complete system to replace your repetitive violation data (all "Kosal Pich" + "No Parking") with **realistic, diverse Cambodian traffic data**.

### Created Files:

1. **`populate_cambodia_violations.py`**
   - Location: `src/backend/core/management/commands/`
   - Django management command to generate diverse violations
   - Creates 150+ unique violations with Cambodian context

2. **`diversify_violations.py`**
   - Location: `src/backend/core/management/commands/`
   - Alternative command to update existing violations
   - Updates in-place without deletion

3. **`clean_database.sql`**
   - SQL script to safely clean all violation data
   - Handles foreign key constraints automatically
   - Ready to run with PostgreSQL

4. **`DIVERSIFY_CAMBODIA_DATA_GUIDE.md`**
   - Complete documentation
   - Step-by-step instructions
   - Troubleshooting guide

---

## Quick Start (2 Steps)

### Step 1: Clean Database

Choose one method:

**Option A - SQL Script (Recommended):**
```bash
# From project root
cd src/backend
python manage.py dbshell < ../../clean_database.sql
```

**Option B - PowerShell Commands:**
```powershell
cd "src/backend"

# Delete in order
python manage.py shell -c "from fines.models import PaymentTransaction; PaymentTransaction.objects.all().delete()"
python manage.py shell -c "from appeals.models import Appeal; Appeal.objects.all().delete()"
python manage.py shell -c "from fines.models import Fine; Fine.objects.all().delete()"
python manage.py shell -c "from ai_detection.models import AIDetectionLog; AIDetectionLog.objects.all().delete()"
python manage.py shell -c "from violations.models import TrafficViolation; TrafficViolation.objects.all().delete()"
python manage.py shell -c "from vehicles.models import Vehicle; Vehicle.objects.all().delete()"
python manage.py shell -c "from users.models import Driver; Driver.objects.all().delete()"
python manage.py shell -c "from users.models import User; User.objects.filter(role='driver').delete()"
```

### Step 2: Generate Diverse Data

```bash
cd src/backend
python manage.py populate_cambodia_violations --count 150
```

**Expected output:**
```
📝 Creating 150 realistic Cambodian violations...
  ✓ Created 10/150 violations...
  ✓ Created 20/150 violations...
  ...
  ✓ Created 150/150 violations...

✅ Successfully created 150 realistic Cambodian violations!
   • Drivers: 150
   • Vehicles: 150
   • Violations: 150
```

### Step 3: Refresh Browser

```
Ctrl + Shift + R  (Windows)
Cmd + Shift + R   (Mac)
```

---

## What You'll See

### Before (Current):
```
All rows showing:
Driver: Kosal Pich
Violation: No Parking
Location: Various streets
Status: Confirmed/Rejected
```

### After (Diverse):
```
Row 1: Sok Chantha   | No Parking        | Sisowath Quay      | Confirmed
Row 2: Chea Sokha    | No Entry          | Monivong Blvd      | Rejected  
Row 3: Pich Sothea   | Illegal Left Turn | Street 271         | Pending
Row 4: Heng Dara     | Illegal U-Turn    | Norodom Blvd       | Confirmed
Row 5: Hor Sophea    | Weight Limit      | National Road 1    | Draft
Row 6: Kong Rattana  | No Stopping       | Japanese Bridge    | Confirmed
Row 7: Lim Bopha     | Illegal Right Turn| Street 51          | Rejected
... (150 unique rows)
```

---

## Features of Generated Data

### ✅ 25+ Cambodian Driver Names
```
Sok Chantha, Chea Sokha, Pich Sothea, Heng Dara, Hor Sophea,
Kong Rattana, Lim Bopha, Meas Kunthea, Nhem Sreypov, Ouk Chanthy,
Prak Piseth, Ros Virak, Sao Samnang, Tep Sophal, Ung Kimheng,
Vong Phirun, Yem Sokchea, Khiev Bunrith, Leng Socheat, Men Veasna
```

### ✅ 7 Violation Types with Realistic Fines
```
NO_PARKING           $50   - Street 51, Riverside, Central Market
NO_ENTRY            $100   - Monivong Blvd, Street 178, Street 271  
ILLEGAL_LEFT_TURN    $75   - Monivong & Mao Tse Toung junction
ILLEGAL_RIGHT_TURN   $75   - Preah Sihanouk Blvd, Street 51
ILLEGAL_U_TURN       $80   - Norodom Blvd, Hun Sen Blvd
NO_STOPPING          $60   - Monivong Bridge, Japanese Bridge
WEIGHT_LIMIT        $200   - National Road 1, 4, 5, Chroy Changvar
```

### ✅ Authentic Cambodian Details
- **Phones:** 010-xxx-xxx, 012-xxx-xxx, 077-xxx-xxx format
- **License Numbers:** PP-xxxxxxx, KM-xxxxxxx, SR-xxxxxxx (province codes)
- **Plates:** PP 1A-2345, KM 2B-5678, SR 3C-9012
- **Addresses:** Street 51, Monivong Blvd, BKK area, Riverside, etc.

### ✅ Varied Vehicle Types
- Motorcycles: Honda Dream, Yamaha Exciter, Honda Click
- Cars: Toyota Camry, Honda Civic, Mazda 3
- SUVs: Toyota Fortuner, Ford Everest
- Trucks: Hino, Isuzu, Mitsubishi Fuso
- Tuk-tuks: Bajaj RE, TVS King

### ✅ Realistic Status Distribution
- 40% Confirmed
- 30% Pending Review
- 20% Rejected
- 10% Draft

### ✅ Recent Dates
- Random dates within last 60 days
- Varied times (6 AM - 10 PM)
- Realistic timestamp distribution

---

## Verification Commands

Check the diversity after generation:

```bash
cd src/backend

# Check total count
python manage.py shell -c "from violations.models import TrafficViolation; print(f'Total: {TrafficViolation.objects.count()}')"

# Check violation type distribution
python manage.py shell -c "from violations.models import TrafficViolation; from django.db.models import Count; import json; print(json.dumps(list(TrafficViolation.objects.values('violation_type').annotate(count=Count('id'))), indent=2))"

# Check driver name diversity (first 20)
python manage.py shell -c "from violations.models import TrafficViolation; names = [v.driver.user.full_name for v in TrafficViolation.objects.select_related('driver__user')[:20]]; print('\\n'.join(names))"

# Check status distribution
python manage.py shell -c "from violations.models import TrafficViolation; from django.db.models import Count; import json; print(json.dumps(list(TrafficViolation.objects.values('status').annotate(count=Count('id'))), indent=2))"
```

---

## Troubleshooting

### ❌ "duplicate key value violates unique constraint"

**Problem:** Old driver records still in database  
**Solution:** Run Step 1 (Clean Database) again

### ❌ "Foreign key constraint violation"

**Problem:** Deleting in wrong order  
**Solution:** Use the SQL script (`clean_database.sql`) - it handles all dependencies

### ❌ "Successfully created 0 violations"

**Problem:** Database wasn't properly cleaned  
**Solution:**
1. Check: `python manage.py shell -c "from users.models import Driver; print(Driver.objects.count())"`
2. If count > 0, run Step 1 again
3. Then run Step 2

### ❌ Browser still shows old data

**Problem:** Browser cache  
**Solution:** Hard refresh with `Ctrl + Shift + R`

---

## Why This Matters

### Demo & Presentation
- Shows realistic enforcement patterns
- Demonstrates system handles diverse scenarios
- Professional appearance for stakeholders

### Testing
- Tests pagination with varied data
- Validates filtering across violation types
- Ensures UI handles different statuses

### Development
- Realistic data for frontend development
- Tests edge cases (long names, special characters)
- Validates date/location handling

---

## Next Steps (Optional)

### Add More Data
```bash
# Generate additional 50 violations
python manage.py populate_cambodia_violations --count 50
```

### Update Specific Fields
Edit `populate_cambodia_violations.py` to customize:
- Driver names (line 127)
- Violation scenarios (line 297)
- Status distribution (line 329)
- Date ranges (line 334)

### Export for Backup
```bash
# Export violations
python manage.py dumpdata violations.TrafficViolation > violations_backup.json

# Import later
python manage.py loaddata violations_backup.json
```

---

## Summary

**Status:** ✅ Ready to Deploy

**What's Complete:**
- Django management commands created
- SQL cleanup script ready
- Documentation written
- Data generation tested

**What You Need to Do:**
1. Run cleanup (Step 1)
2. Generate data (Step 2)
3. Refresh browser (Step 3)
4. Enjoy diverse Cambodian traffic data! 🇰🇭

---

**Files Location:**
- Commands: `src/backend/core/management/commands/`
- SQL Script: `clean_database.sql` (project root)
- Documentation: `DIVERSIFY_CAMBODIA_DATA_GUIDE.md`
- This README: `UPDATE_VIOLATIONS_DATA_README.md`

**Need Help?** See `DIVERSIFY_CAMBODIA_DATA_GUIDE.md` for detailed troubleshooting.

---

**Last Updated:** July 26, 2026  
**System Version:** CamTraffic v1.0  
**Database:** PostgreSQL with Django ORM
