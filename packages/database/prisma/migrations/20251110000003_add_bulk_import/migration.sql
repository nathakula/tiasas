-- Create BulkImport table to support bulk upload logs and undo
CREATE TABLE IF NOT EXISTS "BulkImport" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" TEXT NOT NULL,
  "userId" TEXT,
  type TEXT NOT NULL,
  summary JSONB NOT NULL,
  before JSONB,
  after JSONB,
  "createdAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "BulkImport_org_created_idx" ON "BulkImport" ("orgId", "createdAt" DESC);
