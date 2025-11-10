-- Add optional note column to DailyPnl
ALTER TABLE "DailyPnl" ADD COLUMN IF NOT EXISTS "note" TEXT;

