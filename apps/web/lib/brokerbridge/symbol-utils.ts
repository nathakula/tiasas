/**
 * Symbol Normalization and Instrument Utilities
 * Handles mapping raw broker symbols to canonical instrument format
 */

import { AssetClass, OptionRight } from "@prisma/client";
import { NormalizedInstrument } from "./types";

/**
 * Parse OCC option symbol format
 * Format: UNDERLYING YYMMDD C/P STRIKE
 * Example: "AAPL  250117C00150000" -> AAPL Jan 17, 2025 $150 Call
 */
export function parseOCCSymbol(occSymbol: string): {
  underlying: string;
  expiration: Date;
  right: OptionRight;
  strike: number;
} | null {
  // OCC format: 6 chars underlying + 6 chars date + 1 char right + 8 chars strike
  const match = occSymbol.match(/^([A-Z\s]{1,6})(\d{6})([CP])(\d{8})$/);
  if (!match) return null;

  const [, underlying, dateStr, right, strikeStr] = match;

  // Parse date: YYMMDD
  const year = 2000 + parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1; // 0-indexed
  const day = parseInt(dateStr.substring(4, 6));
  const expiration = new Date(year, month, day);

  // Parse strike: 8 digits with 3 decimal places
  const strike = parseInt(strikeStr) / 1000;

  return {
    underlying: underlying.trim(),
    expiration,
    right: right === "C" ? OptionRight.CALL : OptionRight.PUT,
    strike,
  };
}

/**
 * Build OCC symbol from components
 */
export function buildOCCSymbol(
  underlying: string,
  expiration: Date,
  right: OptionRight,
  strike: number
): string {
  // Pad underlying to 6 characters
  const paddedUnderlying = underlying.padEnd(6, " ");

  // Format date as YYMMDD
  const yy = expiration.getFullYear() % 100;
  const mm = (expiration.getMonth() + 1).toString().padStart(2, "0");
  const dd = expiration.getDate().toString().padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;

  // Format right
  const rightChar = right === OptionRight.CALL ? "C" : "P";

  // Format strike with 3 decimal places, padded to 8 digits
  const strikeStr = Math.round(strike * 1000)
    .toString()
    .padStart(8, "0");

  return `${paddedUnderlying}${dateStr}${rightChar}${strikeStr}`;
}

/**
 * Normalize symbol by removing common prefixes/suffixes and standardizing format
 */
export function normalizeSymbol(rawSymbol: string, broker?: string): string {
  let symbol = rawSymbol.trim().toUpperCase();

  // Remove common exchange suffixes
  symbol = symbol.replace(/\.(US|NYSE|NASDAQ|AMEX|ARCA)$/i, "");

  // Handle broker-specific formats
  if (broker === "ROBINHOOD") {
    // Robinhood sometimes adds unique IDs
    symbol = symbol.split(":")[0];
  } else if (broker === "ETRADE") {
    // E*TRADE may use different option formats
    // Handle as needed
  }

  return symbol;
}

/**
 * Infer asset class from symbol and other context
 */
export function inferAssetClass(
  symbol: string,
  metadata?: Record<string, unknown>
): AssetClass {
  // Check if it's an option (OCC format or contains option keywords)
  if (parseOCCSymbol(symbol)) {
    return AssetClass.OPTION;
  }

  // Check metadata hints
  if (metadata?.assetType === "OPTION") return AssetClass.OPTION;
  if (metadata?.assetType === "ETF") return AssetClass.ETF;
  if (metadata?.assetType === "FUND" || metadata?.assetType === "MUTUAL_FUND")
    return AssetClass.FUND;
  if (metadata?.assetType === "BOND") return AssetClass.BOND;
  if (metadata?.assetType === "CRYPTO") return AssetClass.CRYPTO;

  // Check for common ETF patterns
  if (/^(SPY|QQQ|IWM|DIA|VOO|VTI|AGG|GLD|SLV|TLT|HYG|LQD|XLF|XLE|XLK|XLV|XLI)$/.test(symbol)) {
    return AssetClass.ETF;
  }

  // Check for crypto patterns
  if (/^(BTC|ETH|DOGE|ADA|SOL|MATIC|AVAX|DOT|LINK|UNI)(USD|USDT|USDC)?$/.test(symbol)) {
    return AssetClass.CRYPTO;
  }

  // Default to equity
  return AssetClass.EQUITY;
}

/**
 * Extract exchange from symbol or metadata
 */
export function extractExchange(
  symbol: string,
  metadata?: Record<string, unknown>
): string | undefined {
  // Check metadata first
  if (metadata?.exchange && typeof metadata.exchange === "string") {
    return metadata.exchange;
  }

  // Check if symbol contains exchange suffix
  const match = symbol.match(/\.(NYSE|NASDAQ|AMEX|ARCA|BATS)$/i);
  if (match) {
    return match[1].toUpperCase();
  }

  return undefined;
}

/**
 * Build canonical instrument key for uniqueness
 */
export function buildInstrumentKey(symbol: string, exchange?: string): string {
  return exchange ? `${symbol}:${exchange}` : symbol;
}

/**
 * Parse instrument from raw broker data
 */
export function parseInstrument(
  rawSymbol: string,
  broker?: string,
  metadata?: Record<string, unknown>
): NormalizedInstrument {
  const normalizedSymbol = normalizeSymbol(rawSymbol, broker);
  const assetClass = inferAssetClass(normalizedSymbol, metadata);
  const exchange = extractExchange(normalizedSymbol, metadata);

  const instrument: NormalizedInstrument = {
    symbol: normalizedSymbol,
    exchange,
    name: metadata?.name as string | undefined,
    assetClass,
    currency: (metadata?.currency as string) || "USD",
    cusip: metadata?.cusip as string | undefined,
    isin: metadata?.isin as string | undefined,
  };

  // Handle options
  if (assetClass === AssetClass.OPTION) {
    const optionData = parseOCCSymbol(normalizedSymbol);
    if (optionData) {
      instrument.underlying = {
        symbol: optionData.underlying,
      };
      instrument.option = {
        right: optionData.right,
        strike: optionData.strike,
        expiration: optionData.expiration,
        multiplier: (metadata?.multiplier as number) || 100,
      };
    }
  }

  return instrument;
}
