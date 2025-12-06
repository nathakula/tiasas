/**
 * CSV Mapper
 * Transforms CSV position data into canonical NormalizedLot format
 */

import { AssetClass, BasisMethod } from "@tiasas/database";
import type { NormalizedLot, NormalizedSnapshot, RawPositionPayload } from "../types";
import { parseInstrument } from "../symbol-utils";

/**
 * Map raw CSV position payload to normalized snapshot
 */
export function mapCSVToSnapshot(
  payload: RawPositionPayload,
  accountId: string
): NormalizedSnapshot {
  const lots: NormalizedLot[] = [];

  for (const rawPosition of payload.positions) {
    try {
      const lot = mapCSVPositionToLot(rawPosition);
      lots.push(lot);
    } catch (error) {
      console.error("Failed to map CSV position:", error);
      // Continue processing other positions
    }
  }

  // Use asOf from metadata if available, otherwise use current time
  const asOf = payload.metadata?.asOf
    ? new Date(payload.metadata.asOf as string)
    : new Date();

  return {
    asOf,
    cashTotal: payload.cash || 0,
    lots,
  };
}

/**
 * Map a single CSV position to NormalizedLot
 */
function mapCSVPositionToLot(rawPosition: unknown): NormalizedLot {
  const pos = rawPosition as Record<string, unknown>;

  // Extract basic fields
  const symbol = pos.symbol as string;
  const quantity = pos.quantity as number;
  const averagePrice = pos.averagePrice as number | undefined;
  const costBasis = pos.costBasis as number | undefined;
  const lastPrice = pos.lastPrice as number | undefined;
  const marketValue = pos.marketValue as number | undefined;
  const unrealizedPLFromCSV = pos.unrealizedPL as number | undefined;
  const accountNickname = pos.accountNickname as string | undefined;

  if (!symbol || quantity === undefined) {
    throw new Error("Symbol and quantity are required");
  }

  // Parse instrument (handles options, ETFs, etc.)
  const metadata = pos.metadata as Record<string, any> | undefined;
  const instrument = parseInstrument(symbol, "CSV_IMPORT", {
    assetType: pos.assetClass,
    currency: pos.currency,
    name: metadata?.["name"] || metadata?.["Name"],
  });

  // Calculate derived values if not provided
  let finalCostBasis = costBasis;
  let finalMarketValue = marketValue;
  let unrealizedPL: number | undefined;
  let unrealizedPLPct: number | undefined;

  // Calculate cost basis if we have average price but not cost basis
  if (!finalCostBasis && averagePrice) {
    finalCostBasis = averagePrice * Math.abs(quantity);
  }

  // Calculate market value if we have last price
  if (!finalMarketValue && lastPrice) {
    finalMarketValue = lastPrice * Math.abs(quantity);
  }

  // Use unrealized P&L from CSV if provided, otherwise calculate it
  if (unrealizedPLFromCSV !== undefined) {
    // CSV already provides the correct unrealized P&L (e.g., E*TRADE "Total Gain $")
    // This accounts for short/long positions correctly
    unrealizedPL = unrealizedPLFromCSV;
    if (finalCostBasis !== undefined && finalCostBasis !== 0) {
      const rawPct = (unrealizedPL / finalCostBasis) * 100;
      // Cap percentage to prevent database overflow (Decimal(10,6) max is ~9999)
      unrealizedPLPct = Math.max(-9999, Math.min(9999, rawPct));
    }
  } else if (finalMarketValue !== undefined && finalCostBasis !== undefined) {
    // Fallback: Calculate unrealized P&L if not provided in CSV
    // For long positions: unrealizedPL = marketValue - costBasis
    // For short positions: unrealizedPL = costBasis - marketValue
    if (quantity < 0) {
      // Short position
      unrealizedPL = finalCostBasis - finalMarketValue;
    } else {
      // Long position
      unrealizedPL = finalMarketValue - finalCostBasis;
    }
    if (finalCostBasis !== 0) {
      const rawPct = (unrealizedPL / finalCostBasis) * 100;
      unrealizedPLPct = Math.max(-9999, Math.min(9999, rawPct));
    }
  }

  // Note: For CSV imports, the unrealized P&L is already the total amount
  // We don't multiply by option multiplier because the CSV data already contains final values

  // Ensure accountNickname is included in metadata if it exists
  const enhancedMetadata = {
    ...(pos.metadata as Record<string, unknown> || {}),
    ...(accountNickname && { accountNickname }),
  };

  return {
    instrument,
    quantity,
    averagePrice,
    costBasis: finalCostBasis,
    lastPrice,
    marketValue: finalMarketValue,
    unrealizedPL,
    unrealizedPLPct,
    basisMethod: BasisMethod.UNKNOWN, // CSV imports don't specify basis method
    metadata: enhancedMetadata,
  };
}

/**
 * Validate and enrich CSV snapshot before persistence
 */
export function validateCSVSnapshot(snapshot: NormalizedSnapshot): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty snapshot
  if (snapshot.lots.length === 0) {
    warnings.push("Snapshot contains no positions");
  }

  // Validate each lot
  for (let i = 0; i < snapshot.lots.length; i++) {
    const lot = snapshot.lots[i];
    const lotPrefix = `Lot ${i + 1} (${lot.instrument.symbol})`;

    // Quantity validation
    if (lot.quantity === 0) {
      warnings.push(`${lotPrefix}: Zero quantity position`);
    }

    // Price validation
    if (lot.lastPrice !== undefined && lot.lastPrice < 0) {
      errors.push(`${lotPrefix}: Last price cannot be negative`);
    }

    if (lot.averagePrice !== undefined && lot.averagePrice < 0) {
      errors.push(`${lotPrefix}: Average price cannot be negative`);
    }

    // Option-specific validation
    if (lot.instrument.assetClass === AssetClass.OPTION) {
      if (!lot.instrument.option) {
        errors.push(`${lotPrefix}: Option position missing option details`);
      } else {
        const option = lot.instrument.option;

        // Check expiration date
        if (option.expiration < new Date()) {
          warnings.push(`${lotPrefix}: Option appears to be expired`);
        }

        // Check strike price
        if (option.strike <= 0) {
          errors.push(`${lotPrefix}: Invalid option strike price`);
        }
      }
    }

    // P&L consistency check
    if (
      lot.costBasis !== undefined &&
      lot.marketValue !== undefined &&
      lot.unrealizedPL !== undefined
    ) {
      const calculatedPL = lot.marketValue - lot.costBasis;
      const diff = Math.abs(calculatedPL - lot.unrealizedPL);

      // Allow for small rounding differences
      if (diff > 0.01) {
        warnings.push(
          `${lotPrefix}: Unrealized P&L (${lot.unrealizedPL.toFixed(2)}) doesn't match calculated value (${calculatedPL.toFixed(2)})`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Aggregate CSV snapshot metrics
 */
export function aggregateCSVMetrics(snapshot: NormalizedSnapshot): {
  totalPositions: number;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  byAssetClass: Record<string, {
    positions: number;
    marketValue: number;
    costBasis: number;
  }>;
} {
  const byAssetClass: Record<string, {
    positions: number;
    marketValue: number;
    costBasis: number;
  }> = {};

  let totalMarketValue = snapshot.cashTotal;
  let totalCostBasis = snapshot.cashTotal;
  let totalUnrealizedPL = 0;

  for (const lot of snapshot.lots) {
    const assetClass = lot.instrument.assetClass;

    // Initialize asset class aggregation
    if (!byAssetClass[assetClass]) {
      byAssetClass[assetClass] = {
        positions: 0,
        marketValue: 0,
        costBasis: 0,
      };
    }

    // Update asset class metrics
    byAssetClass[assetClass].positions += 1;
    if (lot.marketValue) {
      byAssetClass[assetClass].marketValue += lot.marketValue;
      totalMarketValue += lot.marketValue;
    }
    if (lot.costBasis) {
      byAssetClass[assetClass].costBasis += lot.costBasis;
      totalCostBasis += lot.costBasis;
    }

    // Update total P&L
    if (lot.unrealizedPL) {
      totalUnrealizedPL += lot.unrealizedPL;
    }
  }

  return {
    totalPositions: snapshot.lots.length,
    totalMarketValue,
    totalCostBasis,
    totalUnrealizedPL,
    byAssetClass,
  };
}
