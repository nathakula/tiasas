/**
 * Broker Adapter Registry
 * Central registry for all broker adapters
 */

import { BrokerProvider } from "@prisma/client";
import type { BrokerAdapter } from "../types";
import { CSVAdapter, createCSVAdapter } from "./csv-adapter";

/**
 * Adapter factory type
 */
type AdapterFactory = () => BrokerAdapter;

/**
 * Registry of adapter factories by broker provider
 */
const adapterRegistry = new Map<BrokerProvider, AdapterFactory>([
  [BrokerProvider.CSV_IMPORT, createCSVAdapter],
  // Future adapters will be registered here:
  // [BrokerProvider.ROBINHOOD, createRobinhoodAdapter],
  // [BrokerProvider.ETRADE, createETradeAdapter],
  // [BrokerProvider.FIDELITY, createFidelityAdapter],
  // [BrokerProvider.SCHWAB, createSchwabAdapter],
]);

/**
 * Get adapter instance for a broker provider
 */
export function getAdapter(broker: BrokerProvider): BrokerAdapter {
  const factory = adapterRegistry.get(broker);

  if (!factory) {
    throw new Error(`No adapter registered for broker: ${broker}`);
  }

  return factory();
}

/**
 * Check if an adapter is available for a broker
 */
export function hasAdapter(broker: BrokerProvider): boolean {
  return adapterRegistry.has(broker);
}

/**
 * Get list of supported brokers
 */
export function getSupportedBrokers(): BrokerProvider[] {
  return Array.from(adapterRegistry.keys());
}

/**
 * Register a custom adapter (for testing or extensions)
 */
export function registerAdapter(broker: BrokerProvider, factory: AdapterFactory): void {
  adapterRegistry.set(broker, factory);
}

// Export adapter types and classes
export { CSVAdapter, createCSVAdapter };
export type { AdapterFactory };
