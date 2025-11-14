"use client";

import { useState, useEffect } from "react";
import { AssetClass, BrokerProvider } from "@prisma/client";
import { Search, Filter, TrendingUp, TrendingDown, Info } from "lucide-react";
import { getBrokerDisplayName } from "@/lib/brokerbridge/parsers/broker-detector";

type AggregatedPosition = {
  instrument: {
    id: string;
    symbol: string;
    name: string | null;
    assetClass: AssetClass;
    exchange: string | null;
  };
  totalQuantity: number;
  totalCostBasis: number;
  totalMarketValue: number;
  totalUnrealizedPL: number;
  weightedAveragePrice: number;
  accounts: Array<{
    accountId: string;
    accountNickname: string | null;
    broker: BrokerProvider;
    brokerSource: string | null;
    quantity: number;
    averagePrice: number | null;
    marketValue: number | null;
  }>;
  optionDetails?: {
    right: string;
    strike: number;
    expiration: Date;
    multiplier: number;
    underlying: {
      symbol: string;
    };
  };
};

type PortfolioSummary = {
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalCash: number;
  positionCount: number;
  byAssetClass: Record<string, {
    count: number;
    marketValue: number;
    costBasis: number;
    unrealizedPL: number;
  }>;
};

export default function PositionsClient({ orgId }: { orgId: string }) {
  const [positions, setPositions] = useState<AggregatedPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClass | "ALL">("ALL");
  const [optionsOnly, setOptionsOnly] = useState(false);
  const [brokerSourceFilter, setBrokerSourceFilter] = useState<string>("ALL");
  const [selectedPosition, setSelectedPosition] = useState<AggregatedPosition | null>(null);

  useEffect(() => {
    loadPositions();
  }, [orgId, assetClassFilter, optionsOnly]);

  async function loadPositions() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        orgId,
        includeSummary: "true",
      });

      if (assetClassFilter !== "ALL") {
        params.append("assetClass", assetClassFilter);
      }

      if (optionsOnly) {
        params.append("optionsOnly", "true");
      }

      const res = await fetch(`/api/brokerbridge/positions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to load positions:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPositions = positions
    .map((pos) => {
      // If broker filter is active, filter accounts and recalculate totals
      if (brokerSourceFilter !== "ALL") {
        const filteredAccounts = pos.accounts.filter(acc => acc.brokerSource === brokerSourceFilter);

        if (filteredAccounts.length === 0) return null; // Skip if no accounts match

        // Recalculate totals based on filtered accounts
        const totalQuantity = filteredAccounts.reduce((sum, acc) => sum + acc.quantity, 0);
        const totalMarketValue = filteredAccounts.reduce((sum, acc) => sum + (acc.marketValue || 0), 0);
        const totalCostBasis = filteredAccounts.reduce((sum, acc) => {
          return sum + ((acc.averagePrice || 0) * Math.abs(acc.quantity));
        }, 0);
        const totalUnrealizedPL = totalMarketValue - totalCostBasis;
        const weightedAveragePrice = totalQuantity !== 0 ? totalCostBasis / Math.abs(totalQuantity) : 0;

        return {
          ...pos,
          accounts: filteredAccounts,
          totalQuantity,
          totalCostBasis,
          totalMarketValue,
          totalUnrealizedPL,
          weightedAveragePrice,
        };
      }

      return pos;
    })
    .filter((pos): pos is AggregatedPosition => {
      if (!pos) return false;

      // Search filter
      const matchesSearch = pos.instrument.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pos.instrument.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });

  // Get unique broker sources from positions for filter dropdown
  const uniqueBrokerSources = Array.from(
    new Set(
      positions.flatMap(pos =>
        pos.accounts.map(acc => acc.brokerSource).filter(Boolean)
      )
    )
  ).sort();

  if (loading) {
    return <div className="text-center text-gray-600">Loading positions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard
            title="Total Value"
            value={formatCurrency(summary.totalMarketValue + summary.totalCash)}
            subtitle={`${summary.positionCount} positions`}
          />
          <SummaryCard
            title="Cost Basis"
            value={formatCurrency(summary.totalCostBasis)}
            subtitle="Total investment"
          />
          <SummaryCard
            title="Unrealized P&L"
            value={formatCurrency(summary.totalUnrealizedPL)}
            subtitle={formatPercent(summary.totalUnrealizedPL / summary.totalCostBasis)}
            isProfit={summary.totalUnrealizedPL >= 0}
          />
          <SummaryCard
            title="Cash"
            value={formatCurrency(summary.totalCash)}
            subtitle="Available"
          />
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col space-y-4 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search symbols..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={assetClassFilter}
            onChange={(e) => setAssetClassFilter(e.target.value as AssetClass | "ALL")}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Asset Classes</option>
            {Object.values(AssetClass).map((ac) => (
              <option key={ac} value={ac}>
                {ac}
              </option>
            ))}
          </select>

          <select
            value={brokerSourceFilter}
            onChange={(e) => setBrokerSourceFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Brokers</option>
            {uniqueBrokerSources.map((source) => (
              <option key={source} value={source!}>
                {getBrokerDisplayName(source as any)}
              </option>
            ))}
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={optionsOnly}
              onChange={(e) => setOptionsOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Options only</span>
          </label>
        </div>

        <div className="text-sm text-gray-600">
          {filteredPositions.length} position{filteredPositions.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Positions Table */}
      {filteredPositions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Info className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No positions found</h3>
          <p className="mt-2 text-gray-600">
            {positions.length === 0
              ? "Import a CSV or sync a broker connection to see your positions."
              : "Try adjusting your filters or search term."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Broker
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Avg Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Market Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Cost Basis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Unrealized P&L
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Accounts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPositions.map((pos) => (
                <PositionRow
                  key={pos.instrument.id}
                  position={pos}
                  onClick={() => setSelectedPosition(pos)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Position Details Drawer */}
      {selectedPosition && (
        <PositionDetailsDrawer
          position={selectedPosition}
          onClose={() => setSelectedPosition(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  isProfit,
}: {
  title: string;
  value: string;
  subtitle: string;
  isProfit?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className={`mt-2 text-2xl font-semibold ${isProfit !== undefined ? (isProfit ? "text-green-600" : "text-red-600") : "text-gray-900"}`}>
        {value}
      </div>
      <div className="mt-1 text-sm text-gray-600">{subtitle}</div>
    </div>
  );
}

function PositionRow({
  position,
  onClick,
}: {
  position: AggregatedPosition;
  onClick: () => void;
}) {
  const plPct =
    position.totalCostBasis !== 0
      ? (position.totalUnrealizedPL / position.totalCostBasis) * 100
      : 0;
  const isPositive = position.totalUnrealizedPL >= 0;

  // Get unique broker sources for this position
  const uniqueBrokers = Array.from(
    new Set(position.accounts.map(acc => acc.brokerSource).filter(Boolean))
  );
  const brokerDisplay = uniqueBrokers.length === 1
    ? getBrokerDisplayName(uniqueBrokers[0] as any)
    : uniqueBrokers.length > 1
    ? `${uniqueBrokers.length} brokers`
    : "Unknown";

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-gray-50"
    >
      <td className="whitespace-nowrap px-6 py-4">
        <div>
          <div className="font-medium text-gray-900">{position.instrument.symbol}</div>
          <div className="text-sm text-gray-500">
            {position.instrument.assetClass}
            {position.optionDetails && (
              <span className="ml-2">
                {position.optionDetails.strike} {position.optionDetails.right} {new Date(position.optionDetails.expiration).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900">{brokerDisplay}</div>
          {position.accounts.length > 1 && (
            <div className="text-xs text-gray-500">{position.accounts.length} accounts</div>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
        {formatNumber(position.totalQuantity)}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
        {formatCurrency(position.weightedAveragePrice)}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
        {formatCurrency(position.totalMarketValue)}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
        {formatCurrency(position.totalCostBasis)}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
        <div className={`flex items-center justify-end space-x-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="font-medium">{formatCurrency(position.totalUnrealizedPL)}</span>
          <span className="text-xs">({formatPercent(plPct)})</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">
        {position.accounts.length}
      </td>
    </tr>
  );
}

function PositionDetailsDrawer({
  position,
  onClose,
}: {
  position: AggregatedPosition;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute bottom-0 right-0 top-0 w-full max-w-2xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {position.instrument.symbol}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {position.instrument.name || position.instrument.assetClass}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Option Details */}
            {position.optionDetails && (
              <div className="mb-6 rounded-lg bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-900">Option Details</h3>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Underlying:</span>{" "}
                    {position.optionDetails.underlying.symbol}
                  </div>
                  <div>
                    <span className="text-blue-700">Strike:</span> ${position.optionDetails.strike}
                  </div>
                  <div>
                    <span className="text-blue-700">Right:</span> {position.optionDetails.right}
                  </div>
                  <div>
                    <span className="text-blue-700">Expiration:</span>{" "}
                    {new Date(position.optionDetails.expiration).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="mb-6">
              <h3 className="mb-3 font-semibold text-gray-900">Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <DataPoint label="Total Quantity" value={formatNumber(position.totalQuantity)} />
                <DataPoint label="Avg Price" value={formatCurrency(position.weightedAveragePrice)} />
                <DataPoint label="Market Value" value={formatCurrency(position.totalMarketValue)} />
                <DataPoint label="Cost Basis" value={formatCurrency(position.totalCostBasis)} />
                <DataPoint
                  label="Unrealized P&L"
                  value={formatCurrency(position.totalUnrealizedPL)}
                  isProfit={position.totalUnrealizedPL >= 0}
                />
                <DataPoint
                  label="P&L %"
                  value={formatPercent(
                    position.totalCostBasis !== 0
                      ? (position.totalUnrealizedPL / position.totalCostBasis) * 100
                      : 0
                  )}
                  isProfit={position.totalUnrealizedPL >= 0}
                />
              </div>
            </div>

            {/* Account Breakdown */}
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Account Breakdown</h3>
              <div className="space-y-3">
                {position.accounts.map((account, idx) => {
                  const brokerDisplayName = account.brokerSource
                    ? getBrokerDisplayName(account.brokerSource as any)
                    : account.broker;
                  const accountLabel = account.accountNickname || account.accountId;
                  const fullLabel = account.brokerSource && account.brokerSource !== "UNKNOWN"
                    ? `${brokerDisplayName} - ${accountLabel}`
                    : accountLabel;

                  return (
                    <div key={idx} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {fullLabel}
                          </div>
                          <div className="text-sm text-gray-500">{account.broker}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {formatNumber(account.quantity)} shares
                          </div>
                          {account.averagePrice && (
                            <div className="text-sm text-gray-500">
                              @ {formatCurrency(account.averagePrice)}
                            </div>
                          )}
                        </div>
                      </div>
                      {account.marketValue && (
                        <div className="mt-2 text-sm text-gray-600">
                          Market Value: {formatCurrency(account.marketValue)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataPoint({
  label,
  value,
  isProfit,
}: {
  label: string;
  value: string;
  isProfit?: boolean;
}) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div
        className={`mt-1 font-medium ${
          isProfit !== undefined
            ? isProfit
              ? "text-green-600"
              : "text-red-600"
            : "text-gray-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
