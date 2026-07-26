-- SQL Script to Diversify Driver Names in Violations
-- This will update violations to have different driver names instead of all being the same

-- First, let's see current distribution
SELECT driver_name, COUNT(*) as count 
FROM violations 
GROUP BY driver_name 
ORDER BY count DESC 
LIMIT 10;

-- Update violations with different Cambodian names (randomly distributed)
-- This creates a more realistic dataset

WITH driver_pool AS (
  SELECT id, full_name, license_no 
  FROM users 
  WHERE role = 'driver' 
  LIMIT 25
),
numbered_violations AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM violations
),
numbered_drivers AS (
  SELECT 
    id,
    full_name,
    license_no,
    ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
  FROM driver_pool
)
UPDATE violations v
SET 
  driver_id = nd.id,
  driver_name = nd.full_name,
  driver_license = COALESCE(nd.license_no, '')
FROM numbered_violations nv
JOIN numbered_drivers nd ON ((nv.rn - 1) % (SELECT COUNT(*) FROM driver_pool)) + 1 = nd.rn
WHERE v.id = nv.id;

-- Verify the update
SELECT driver_name, COUNT(*) as count 
FROM violations 
GROUP BY driver_name 
ORDER BY count DESC 
LIMIT 10;

-- Show sample of updated violations
SELECT 
  driver_name,
  violation_type,
  location,
  status,
  created_at
FROM violations
ORDER BY created_at DESC
LIMIT 20;
