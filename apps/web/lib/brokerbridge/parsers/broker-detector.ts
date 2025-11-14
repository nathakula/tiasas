/**
 * Broker Detection Utility
 * Auto-detects which broker a CSV file is from based on headers and content patterns
 */

export type SupportedBroker = "ETRADE" | "FIDELITY" | "SCHWAB" | "ROBINHOOD" | "WEBULL" | "UNKNOWN";

export interface BrokerDetectionResult {
  broker: SupportedBroker;
  confidence: "high" | "medium" | "low";
  detectedFrom: string; // What pattern was used to detect
}

/**
 * Detect broker from CSV headers and content
 */
export function detectBrokerFromCSV(
  headers: string[],
  firstRow?: Record<string, string>
): BrokerDetectionResult {
  const headerStr = headers.join("|").toLowerCase();

  // E*TRADE detection patterns
  if (
    headerStr.includes("symbol") &&
    headerStr.includes("quantity") &&
    (headerStr.includes("last price") || headerStr.includes("lastprice")) &&
    (headerStr.includes("price paid") || headerStr.includes("pricepaid"))
  ) {
    return {
      broker: "ETRADE",
      confidence: "high",
      detectedFrom: "Headers contain E*TRADE-specific columns (Symbol, Quantity, Last Price, Price Paid)",
    };
  }

  // Fidelity detection patterns
  if (
    (headerStr.includes("symbol") || headerStr.includes("ticker")) &&
    (headerStr.includes("quantity") || headerStr.includes("qty")) &&
    (headerStr.includes("last price") || headerStr.includes("current value")) &&
    (headerStr.includes("cost basis total") || headerStr.includes("cost basis per share"))
  ) {
    return {
      broker: "FIDELITY",
      confidence: "high",
      detectedFrom: "Headers contain Fidelity-specific columns (Cost Basis Total/Per Share)",
    };
  }

  // Check for Fidelity account info in first row
  if (firstRow) {
    const rowStr = JSON.stringify(firstRow).toLowerCase();
    if (rowStr.includes("fidelity") || rowStr.includes("account number")) {
      return {
        broker: "FIDELITY",
        confidence: "medium",
        detectedFrom: "File contains 'Fidelity' or account metadata",
      };
    }
  }

  // Schwab detection patterns
  if (
    headerStr.includes("symbol") &&
    (headerStr.includes("quantity") || headerStr.includes("qty")) &&
    (headerStr.includes("market value") || headerStr.includes("price")) &&
    (headerStr.includes("schwab") || headerStr.includes("account"))
  ) {
    return {
      broker: "SCHWAB",
      confidence: "medium",
      detectedFrom: "Headers suggest Schwab format",
    };
  }

  // Robinhood detection patterns
  if (
    (headerStr.includes("ticker") || headerStr.includes("instrument")) &&
    headerStr.includes("quantity") &&
    (headerStr.includes("average cost") || headerStr.includes("avg cost")) &&
    headerStr.includes("equity")
  ) {
    return {
      broker: "ROBINHOOD",
      confidence: "medium",
      detectedFrom: "Headers contain Robinhood-specific columns (Ticker, Equity, Avg Cost)",
    };
  }

  // Webull detection patterns
  if (
    headerStr.includes("stock code") ||
    headerStr.includes("stock name") ||
    (headerStr.includes("symbol") &&
      headerStr.includes("holding") &&
      headerStr.includes("available"))
  ) {
    return {
      broker: "WEBULL",
      confidence: "medium",
      detectedFrom: "Headers contain Webull-specific columns (Stock Code/Name, Holding)",
    };
  }

  // Generic patterns - low confidence
  if (
    headerStr.includes("symbol") &&
    headerStr.includes("quantity") &&
    (headerStr.includes("price") || headerStr.includes("value"))
  ) {
    return {
      broker: "UNKNOWN",
      confidence: "low",
      detectedFrom: "Generic position CSV format detected",
    };
  }

  return {
    broker: "UNKNOWN",
    confidence: "low",
    detectedFrom: "Could not match any known broker pattern",
  };
}

/**
 * Get user-friendly broker display name
 */
export function getBrokerDisplayName(broker: SupportedBroker): string {
  const names: Record<SupportedBroker, string> = {
    ETRADE: "E*TRADE",
    FIDELITY: "Fidelity",
    SCHWAB: "Charles Schwab",
    ROBINHOOD: "Robinhood",
    WEBULL: "Webull",
    UNKNOWN: "Unknown Broker",
  };
  return names[broker];
}

/**
 * Get all supported brokers for dropdown
 */
export function getSupportedBrokers(): Array<{ value: SupportedBroker; label: string }> {
  return [
    { value: "ETRADE", label: "E*TRADE" },
    { value: "FIDELITY", label: "Fidelity" },
    { value: "SCHWAB", label: "Charles Schwab" },
    { value: "ROBINHOOD", label: "Robinhood" },
    { value: "WEBULL", label: "Webull" },
    { value: "UNKNOWN", label: "Other / Unknown" },
  ];
}
