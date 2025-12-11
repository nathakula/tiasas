"use client";

import { useState } from "react";

export interface BrokerConnectionStepData {
  connections: string[]; // Array of connection IDs created
  skipped: boolean;
}

interface BrokerConnectionStepProps {
  initialData?: BrokerConnectionStepData;
  onNext: (data: BrokerConnectionStepData) => void;
  onBack: () => void;
  onSkip: () => void;
}

const BROKERS = [
  {
    id: "etrade",
    name: "E*TRADE",
    status: "AVAILABLE",
    type: "OAuth",
    description: "Securely link via OAuth",
    icon: "🔗",
  },
  {
    id: "fidelity",
    name: "Fidelity",
    status: "CSV_ONLY",
    type: "CSV Import",
    description: "Import positions from CSV export",
    icon: "📄",
  },
  {
    id: "schwab",
    name: "Charles Schwab",
    status: "CSV_ONLY",
    type: "CSV Import",
    description: "Import positions from CSV export",
    icon: "📄",
  },
  {
    id: "robinhood",
    name: "Robinhood",
    status: "CSV_ONLY",
    type: "CSV Import",
    description: "Import positions from CSV export",
    icon: "📄",
  },
  {
    id: "generic",
    name: "Other / Generic CSV",
    status: "CSV_ONLY",
    type: "CSV Import",
    description: "Works with any broker's CSV export",
    icon: "📊",
  },
];

export function BrokerConnectionStep({
  initialData,
  onNext,
  onBack,
  onSkip,
}: BrokerConnectionStepProps) {
  const [connections, setConnections] = useState<string[]>(
    initialData?.connections ?? []
  );

  const handleNext = () => {
    onNext({
      connections,
      skipped: false,
    });
  };

  const handleSkipConnections = () => {
    onNext({
      connections: [],
      skipped: true,
    });
  };

  return (
    <div className="card p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Connect Your Brokerage Accounts
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Aggregate positions across brokers or start with CSV import
        </p>
      </div>

      {/* Broker Grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {BROKERS.map((broker) => (
          <div
            key={broker.id}
            className="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-gold-300 dark:hover:border-gold-700 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl">{broker.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {broker.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  {broker.type}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {broker.description}
                </div>
                {broker.status === "AVAILABLE" ? (
                  <button
                    disabled
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-md cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-md cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connection Summary */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="text-sm text-blue-900 dark:text-blue-100">
          ℹ️ Broker connections can be added later from{" "}
          <span className="font-semibold">Settings → Broker Connections</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Skip for Now
          </button>

          <button
            type="button"
            onClick={handleSkipConnections}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gold-600 dark:bg-gold-700 rounded-md hover:bg-gold-700 dark:hover:bg-gold-800 transition-colors shadow-md hover:shadow-lg"
          >
            Next: Sample Data →
          </button>
        </div>
      </div>
    </div>
  );
}
