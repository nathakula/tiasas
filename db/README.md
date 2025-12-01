DB operations and migrations

This folder captures raw SQL you can run in any Postgres (including Supabase) to create and maintain structures we added outside Prisma.

Files
- migrations/20251111_01_create_monthly_nav_eom.sql
  Creates table MonthlyNav_eom for one row per month (end-of-month date) and supporting indexes.
- migrations/20251111_02_fn_upsert_monthly_nav_eom.sql
  Adds a helper function upsert_monthly_nav_eom(orgId, date_text, nav) which normalizes any date/"YYYY-MM" to the true last day of the month and upserts.
- bootstrap.sql
  Convenience script that enables required extension and runs the two migrations above.

How to apply
-- psql example
-- From repo root
-- 1) Create table and function
-- \i db/bootstrap.sql
-- 2) Upsert a few NAVs for an org by email (example)
-- SELECT upsert_monthly_nav_eom((
--   SELECT m."orgId" FROM "Membership" m JOIN "User" u ON u.id=m."userId" WHERE u.email='tiasasllc@gmail.com' LIMIT 1
-- ), '2025-01', 227800);

Notes
- The MonthlyNav_eom table stores only end-of-month NAV snapshots.
- DailyPnl should remain free of NAV; only realized/unrealized/note per day.
- App code can be pointed to MonthlyNav_eom for NAV charts and banners; until then, the SQL here lets you manage data cleanly.

