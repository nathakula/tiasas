/**
 * BrokerBridge Core Types
 * Canonical types for normalized brokerage position data
 */

import { AssetClass, BasisMethod, OptionRight, BrokerProvider } from "@prisma/client";

// ============================================
// Normalized Position Types
// ============================================

export type NormalizedInstrument = {
  symbol: string;
  exchange?: string;
  name?: string;
  assetClass: AssetClass;
  currency: string;
  cusip?: string;
  isin?: string;
  underlying?: {
    symbol: string;
    instrumentId?: string;
  };
  option?: {
    right: OptionRight;
    strike: number;
    expiration: Date;
    multiplier: number;
  };
};

export type NormalizedLot = {
  instrument: NormalizedInstrument;
  quantity: number;
  averagePrice?: number;
  costBasis?: number;
  lastPrice?: number;
  marketValue?: number;
  unrealizedPL?: number;
  unrealizedPLPct?: number;
  basisMethod?: BasisMethod;
  metadata?: Record<string, unknown>;
};

export type NormalizedSnapshot = {
  asOf: Date;
  cashTotal: number;
  lots: NormalizedLot[];
};

// ============================================
// Broker Adapter Interface
// ============================================

export type BrokerAuthInput = Record<string, unknown>;

export type BrokerAccount = {
  accountId: string;
  nickname?: string;
  maskedNumber?: string;
  accountType?: string;
};

export type RawPositionPayload = {
  positions: unknown[];
  cash?: number;
  metadata?: Record<string, unknown>;
};

export type CashPayload = {
  total: number;
  currency?: string;
  breakdown?: Array<{
    type: string;
    amount: number;
  }>;
};

export interface BrokerAdapter {
  /**
   * Connect to broker API and return connection ID
   */
  connect(authInput: BrokerAuthInput): Promise<{ connectionId: string }>;

  /**
   * List all accounts for this connection
   */
  listAccounts(connectionId: string): Promise<BrokerAccount[]>;

  /**
   * Fetch raw positions for a specific account
   */
  fetchPositions(accountId: string): Promise<RawPositionPayload>;

  /**
   * Fetch cash balances for a specific account
   */
  fetchCash(accountId: string): Promise<CashPayload>;

  /**
   * Test connection validity (optional)
   */
  testConnection?(connectionId: string): Promise<boolean>;
}

// ============================================
// Adapter Error Types
// ============================================

export type AdapterErrorCode =
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "INVALID_ACCOUNT"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN_ERROR";

export class AdapterError extends Error {
  constructor(
    public code: AdapterErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AdapterError";
  }

  static authFailed(message: string): AdapterError {
    return new AdapterError("AUTH_FAILED", message);
  }

  static rateLimited(message: string, retryAfter?: number): AdapterError {
    return new AdapterError("RATE_LIMITED", message, { retryAfter });
  }

  static invalidAccount(accountId: string): AdapterError {
    return new AdapterError("INVALID_ACCOUNT", `Invalid account: ${accountId}`, { accountId });
  }

  static networkError(message: string): AdapterError {
    return new AdapterError("NETWORK_ERROR", message);
  }

  static parseError(message: string, data?: unknown): AdapterError {
    return new AdapterError("PARSE_ERROR", message, { data });
  }

  static unknown(message: string): AdapterError {
    return new AdapterError("UNKNOWN_ERROR", message);
  }
}

// ============================================
// Sync Service Types
// ============================================

export type SyncResult = {
  success: boolean;
  connectionId: string;
  accountId?: string;
  snapshotId?: string;
  error?: AdapterError;
  lotsImported?: number;
  instrumentsCreated?: number;
};

export type SyncOptions = {
  forceRefresh?: boolean;
  skipInstrumentCreation?: boolean;
  replaceSnapshot?: boolean; // If true, delete old snapshots and keep only the latest
};

// ============================================
// CSV/OFX Import Types
// ============================================

export type CSVColumnMapping = {
  symbol: string;
  quantity: string;
  averagePrice?: string;
  costBasis?: string;
  lastPrice?: string;
  marketValue?: string;
  unrealizedPL?: string;
  accountNickname?: string;
  assetClass?: string;
  currency?: string;
};

export type ImportFileType = "CSV" | "OFX";

export type ImportResult = {
  success: boolean;
  snapshotId?: string;
  lotsImported: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
};
