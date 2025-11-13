/**
 * BrokerBridge Module
 * Central export point for all BrokerBridge functionality
 */

// Core types
export type {
  NormalizedInstrument,
  NormalizedLot,
  NormalizedSnapshot,
  BrokerAdapter,
  BrokerAuthInput,
  BrokerAccount,
  RawPositionPayload,
  CashPayload,
  AdapterErrorCode,
  SyncResult,
  SyncOptions,
  CSVColumnMapping,
  ImportFileType,
  ImportResult,
} from "./types";

export { AdapterError } from "./types";

// Symbol utilities
export {
  parseOCCSymbol,
  buildOCCSymbol,
  normalizeSymbol,
  inferAssetClass,
  extractExchange,
  buildInstrumentKey,
  parseInstrument,
} from "./symbol-utils";

// Encryption utilities
export {
  encryptCredentials,
  decryptCredentials,
  maskCredential,
  redactSensitiveFields,
  generateUserSalt,
} from "./encryption";

// CSV parser
export {
  parseCSVContent,
  parseCSVLine,
  inferColumnMapping,
  validateCSVRow,
  formatColumnMapping,
  getSuggestedMappings,
} from "./parsers/csv-parser";

export type { ParsedCSV } from "./parsers/csv-parser";

// CSV mapper
export {
  mapCSVToSnapshot,
  validateCSVSnapshot,
  aggregateCSVMetrics,
} from "./mappers/csv-mapper";

// Adapters
export {
  getAdapter,
  hasAdapter,
  getSupportedBrokers,
  registerAdapter,
  CSVAdapter,
  createCSVAdapter,
} from "./adapters";

export type { AdapterFactory } from "./adapters";
export type { CSVImportAuthInput } from "./adapters/csv-adapter";
