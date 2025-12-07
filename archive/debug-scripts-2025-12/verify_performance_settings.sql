-- 1. Check if YearlyPerformanceSettings table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'YearlyPerformanceSettings';

-- 2. Check the data in YearlyPerformanceSettings
SELECT * FROM "YearlyPerformanceSettings";

-- 3. Check if we have an orgId to work with
SELECT id, name FROM "Org" LIMIT 1;

-- 4. If table is empty, insert the starting capital manually
-- First, get the orgId (you'll need to copy this)
-- Then run this (replace YOUR_ORG_ID with the actual ID from step 3):
/*
INSERT INTO "YearlyPerformanceSettings" ("id", "orgId", "year", "startingCapital", "benchmarks", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'YOUR_ORG_ID',  -- Replace with actual orgId from step 3
  2025,
  250000,
  ARRAY['SPY', 'QQQ']::TEXT[],
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("orgId", "year") DO NOTHING;
*/
