-- Onboarding Setup SQL Script
-- Run this if you need to manually set up the database tables
-- Or verify that the tables were created correctly

-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('UserPreferences', 'OnboardingProgress');

-- Check if enum exists
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'ProficiencyLevel'::regtype;

-- View UserPreferences table structure
\d "UserPreferences"

-- View OnboardingProgress table structure
\d "OnboardingProgress"

-- Count existing UserPreferences
SELECT COUNT(*) as total_users_with_preferences FROM "UserPreferences";

-- Check which users need onboarding
SELECT
  u.id,
  u.email,
  up."onboardingCompleted",
  up."proficiencyLevel"
FROM "User" u
LEFT JOIN "UserPreferences" up ON u.id = up."userId"
ORDER BY u."createdAt" DESC
LIMIT 10;

-- If you need to manually create UserPreferences for existing users:
-- INSERT INTO "UserPreferences" (id, "userId", "onboardingCompleted", "createdAt", "updatedAt")
-- SELECT
--   gen_random_uuid()::text,
--   id,
--   true,  -- Mark existing users as completed
--   NOW(),
--   NOW()
-- FROM "User"
-- WHERE NOT EXISTS (
--   SELECT 1 FROM "UserPreferences" WHERE "UserPreferences"."userId" = "User".id
-- );

-- To reset a user's onboarding (for testing):
-- UPDATE "UserPreferences"
-- SET "onboardingCompleted" = false
-- WHERE "userId" = 'your-user-id-here';

-- To delete a user's onboarding progress (start fresh):
-- DELETE FROM "OnboardingProgress" WHERE "userId" = 'your-user-id-here';
