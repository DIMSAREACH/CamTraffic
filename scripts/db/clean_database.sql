-- CamTraffic Database Cleanup Script
-- This script removes all violations, drivers, and related data
-- to allow fresh diverse Cambodian data generation
--
-- WARNING: This will delete ALL violations, fines, drivers, and related data!
-- Make a backup first if you have important data.

-- Start transaction for safety
BEGIN;

-- Display counts before deletion
SELECT 
    'Before deletion:' as status,
    (SELECT COUNT(*) FROM traffic_violations) as violations,
    (SELECT COUNT(*) FROM drivers) as drivers,
    (SELECT COUNT(*) FROM vehicles) as vehicles,
    (SELECT COUNT(*) FROM fines) as fines,
    (SELECT COUNT(*) FROM appeals) as appeals;

-- Delete in correct order to avoid foreign key violations
-- Using TRUNCATE CASCADE is fastest and handles all foreign keys

TRUNCATE TABLE payment_transactions CASCADE;
TRUNCATE TABLE appeals CASCADE;
TRUNCATE TABLE fines CASCADE;
TRUNCATE TABLE ai_detection_logs CASCADE;
TRUNCATE TABLE traffic_violations CASCADE;
TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE drivers CASCADE;

-- Delete driver users (role = 'driver')
DELETE FROM users WHERE role = 'driver';

-- Display counts after deletion
SELECT 
    'After deletion:' as status,
    (SELECT COUNT(*) FROM traffic_violations) as violations,
    (SELECT COUNT(*) FROM drivers) as drivers,
    (SELECT COUNT(*) FROM vehicles) as vehicles,
    (SELECT COUNT(*) FROM fines) as fines,
    (SELECT COUNT(*) FROM appeals) as appeals;

SELECT '✅ Database cleaned successfully!' AS result;
SELECT 'You can now run: python manage.py populate_cambodia_violations --count 150' AS next_step;

-- Commit the changes
COMMIT;

-- If you want to rollback instead of committing, uncomment the line below:
-- ROLLBACK;
