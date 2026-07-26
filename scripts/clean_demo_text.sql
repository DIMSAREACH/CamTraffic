-- SQL Script to Remove All Demo/Thesis Text from Database
-- Run this in your PostgreSQL database

-- Clean Roads table
UPDATE roads
SET name = REGEXP_REPLACE(name, 'Thesis Demo|thesis demo|Demo|demo', '', 'gi')
WHERE name ~* 'demo|thesis';

UPDATE roads
SET description = REGEXP_REPLACE(description, 'Thesis Demo|thesis demo|Demo|demo', '', 'gi')
WHERE description ~* 'demo|thesis';

-- Clean Cameras table  
UPDATE cameras
SET description = REGEXP_REPLACE(description, 'Thesis Demo|thesis demo|Demo|demo', '', 'gi')
WHERE description ~* 'demo|thesis';

UPDATE cameras
SET name = REGEXP_REPLACE(name, 'Thesis Demo|thesis demo|Demo|demo', '', 'gi')
WHERE name ~* 'demo|thesis';

-- Clean Traffic Signs table
UPDATE traffic_signs
SET sign_name = REGEXP_REPLACE(sign_name, 'Thesis Demo|thesis demo|Demo|demo', '', 'gi')
WHERE sign_name ~* 'demo|thesis';

UPDATE traffic_signs
SET description = REGEXP_REPLACE(description, 'Thesis Demo|thesis demo|Demo|demo', '', 'gi')
WHERE description ~* 'demo|thesis';

UPDATE traffic_signs
SET description_en = REGEXP_REPLACE(description_en, 'Thesis Demo|thesis demo|Demo|demo', '', 'gi')
WHERE description_en ~* 'demo|thesis';

-- Display affected records
SELECT 'Roads' as table_name, COUNT(*) as affected FROM roads WHERE name ~* 'demo|thesis' OR description ~* 'demo|thesis'
UNION ALL
SELECT 'Cameras', COUNT(*) FROM cameras WHERE name ~* 'demo|thesis' OR description ~* 'demo|thesis'
UNION ALL
SELECT 'Traffic Signs', COUNT(*) FROM traffic_signs WHERE sign_name ~* 'demo|thesis' OR description ~* 'demo|thesis' OR description_en ~* 'demo|thesis';
