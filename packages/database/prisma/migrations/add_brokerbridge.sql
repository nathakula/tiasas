-- BrokerBridge Schema Migration
-- Adds all tables and enums for the BrokerBridge module

-- Create Enums (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE "BrokerProvider" AS ENUM ('ROBINHOOD', 'ETRADE', 'FIDELITY', 'SCHWAB', 'CSV_IMPORT', 'OFX_IMPORT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BrokerConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ERROR', 'DISCONNECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AssetClass" AS ENUM ('EQUITY', 'ETF', 'OPTION', 'FUND', 'BOND', 'CRYPTO', 'CASH', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OptionRight" AS ENUM ('CALL', 'PUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BasisMethod" AS ENUM ('FIFO', 'LIFO', 'AVERAGE', 'SPECIFIC_LOT', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- BrokerConnection table
CREATE TABLE "BrokerConnection" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "broker" "BrokerProvider" NOT NULL,
    "status" "BrokerConnectionStatus" NOT NULL,
    "encryptedAuth" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrokerConnection_orgId_idx" ON "BrokerConnection"("orgId");
CREATE INDEX "BrokerConnection_userId_idx" ON "BrokerConnection"("userId");

-- BrokerAccount table
CREATE TABLE "BrokerAccount" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "connectionId" TEXT NOT NULL,
    "nickname" TEXT,
    "maskedNumber" TEXT,
    "accountType" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrokerAccount_connectionId_idx" ON "BrokerAccount"("connectionId");

-- Instrument table
CREATE TABLE "Instrument" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "symbol" TEXT NOT NULL,
    "exchange" TEXT,
    "name" TEXT,
    "assetClass" "AssetClass" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "cusip" TEXT,
    "isin" TEXT,
    "underlyingInstrumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Instrument_symbol_exchange_key" ON "Instrument"("symbol", "exchange");
CREATE INDEX "Instrument_symbol_idx" ON "Instrument"("symbol");
CREATE INDEX "Instrument_assetClass_idx" ON "Instrument"("assetClass");

-- OptionDetail table
CREATE TABLE "OptionDetail" (
    "instrumentId" TEXT NOT NULL,
    "right" "OptionRight" NOT NULL,
    "strike" DECIMAL(20,8) NOT NULL,
    "expiration" DATE NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL DEFAULT 100,

    CONSTRAINT "OptionDetail_pkey" PRIMARY KEY ("instrumentId")
);

-- PositionSnapshot table
CREATE TABLE "PositionSnapshot" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "accountId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "cashTotal" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "marketValue" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "costBasisTotal" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PositionSnapshot_accountId_asOf_idx" ON "PositionSnapshot"("accountId", "asOf");
CREATE INDEX "PositionSnapshot_asOf_idx" ON "PositionSnapshot"("asOf");

-- PositionLot table
CREATE TABLE "PositionLot" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "snapshotId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL,
    "averagePrice" DECIMAL(20,8),
    "costBasis" DECIMAL(20,8),
    "marketPrice" DECIMAL(20,8),
    "marketValue" DECIMAL(20,8),
    "unrealizedPL" DECIMAL(20,8),
    "unrealizedPLPct" DECIMAL(10,6),
    "basisMethod" "BasisMethod" NOT NULL DEFAULT 'UNKNOWN',
    "basisAggregate" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionLot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PositionLot_snapshotId_idx" ON "PositionLot"("snapshotId");
CREATE INDEX "PositionLot_instrumentId_idx" ON "PositionLot"("instrumentId");

-- SyncLog table
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "connectionId" TEXT,
    "accountId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "result" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SyncLog_connectionId_idx" ON "SyncLog"("connectionId");
CREATE INDEX "SyncLog_accountId_idx" ON "SyncLog"("accountId");
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");

-- Add Foreign Key Constraints
ALTER TABLE "BrokerConnection" ADD CONSTRAINT "BrokerConnection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrokerConnection" ADD CONSTRAINT "BrokerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrokerAccount" ADD CONSTRAINT "BrokerAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BrokerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_underlyingInstrumentId_fkey" FOREIGN KEY ("underlyingInstrumentId") REFERENCES "Instrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OptionDetail" ADD CONSTRAINT "OptionDetail_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionSnapshot" ADD CONSTRAINT "PositionSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BrokerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PositionLot" ADD CONSTRAINT "PositionLot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PositionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PositionLot" ADD CONSTRAINT "PositionLot_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BrokerConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BrokerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
