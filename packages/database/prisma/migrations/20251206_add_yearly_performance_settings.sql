-- Create YearlyPerformanceSettings table to store starting capital and benchmark preferences
CREATE TABLE "YearlyPerformanceSettings" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orgId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "startingCapital" DECIMAL(20,8) NOT NULL,
  "benchmarks" TEXT[] DEFAULT ARRAY['SPY', 'QQQ']::TEXT[],
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "YearlyPerformanceSettings_org_year_uq" UNIQUE ("orgId", "year"),
  CONSTRAINT "YearlyPerformanceSettings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX "YearlyPerformanceSettings_orgId_year_idx" ON "YearlyPerformanceSettings"("orgId", "year");

-- Insert starting capital for 2025
INSERT INTO "YearlyPerformanceSettings" ("orgId", "year", "startingCapital", "benchmarks")
SELECT
  "id" as "orgId",
  2025 as "year",
  250000 as "startingCapital",
  ARRAY['SPY', 'QQQ']::TEXT[] as "benchmarks"
FROM "Org"
LIMIT 1;
