-- Ensure pgcrypto is available for gen_random_uuid() (Supabase already has it)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- One row per month (actual last calendar day) per org
CREATE TABLE IF NOT EXISTS "MonthlyNav_eom" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId"     TEXT NOT NULL,
  "date"      DATE NOT NULL,           -- last day of the month (UTC)
  nav         DECIMAL(20,8) NOT NULL,
  note        TEXT,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyNav_eom_org_date_uq"
  ON "MonthlyNav_eom" ("orgId","date");

CREATE INDEX IF NOT EXISTS "MonthlyNav_eom_org_date_idx"
  ON "MonthlyNav_eom" ("orgId","date" DESC);

