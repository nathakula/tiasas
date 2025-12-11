"use client";

import { useState } from "react";

export type SeedDataOption = "use_real" | "demo" | "hybrid";

export interface SeedDataStepData {
  seedDataOption: SeedDataOption;
}

interface SeedDataStepProps {
  initialData?: SeedDataStepData;
  hasConnections: boolean;
  onNext: (data: SeedDataStepData) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function SeedDataStep({
  initialData,
  hasConnections,
  onNext,
  onBack,
  onSkip,
}: SeedDataStepProps) {
  const [seedOption, setSeedOption] = useState<SeedDataOption>(
    initialData?.seedDataOption ?? "use_real"
  );

  const handleNext = () => {
    onNext({ seedDataOption: seedOption });
  };

  return (
    <div className="card p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Want to Explore with Sample Data?
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          We can populate your account with example trades and positions
          <br />
          so you can see the platform in action
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Use Real Data */}
        <button
          type="button"
          onClick={() => setSeedOption("use_real")}
          className={`
            p-6 rounded-lg border-2 transition-all text-left
            ${
              seedOption === "use_real"
                ? "border-gold-500 dark:border-gold-600 bg-gold-50 dark:bg-gold-900/20 shadow-md"
                : "border-slate-200 dark:border-slate-700 hover:border-gold-300 dark:hover:border-gold-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          <div className="text-3xl mb-3">📊</div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Use My Real Data
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {hasConnections
              ? "Start with your connected brokers"
              : "Start with an empty slate and add data manually"}
          </div>
          <div
            className={`
              mt-4 w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${
                seedOption === "use_real"
                  ? "border-gold-500 dark:border-gold-600 bg-gold-500 dark:bg-gold-600"
                  : "border-slate-300 dark:border-slate-600"
              }
            `}
          >
            {seedOption === "use_real" && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </div>
        </button>

        {/* Demo Data */}
        <button
          type="button"
          onClick={() => setSeedOption("demo")}
          className={`
            p-6 rounded-lg border-2 transition-all text-left
            ${
              seedOption === "demo"
                ? "border-gold-500 dark:border-gold-600 bg-gold-50 dark:bg-gold-900/20 shadow-md"
                : "border-slate-200 dark:border-slate-700 hover:border-gold-300 dark:hover:border-gold-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          <div className="text-3xl mb-3">🎯</div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Explore with Demo Data
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Pre-populated with 30 days of sample trades, journal entries, and
            performance metrics
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Includes: 8 positions, 10 journal entries, daily P&L data, and
            benchmark comparisons
          </div>
          <div
            className={`
              mt-auto w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${
                seedOption === "demo"
                  ? "border-gold-500 dark:border-gold-600 bg-gold-500 dark:bg-gold-600"
                  : "border-slate-300 dark:border-slate-600"
              }
            `}
          >
            {seedOption === "demo" && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </div>
        </button>

        {/* Hybrid Mode */}
        <button
          type="button"
          onClick={() => setSeedOption("hybrid")}
          className={`
            p-6 rounded-lg border-2 transition-all text-left
            ${
              seedOption === "hybrid"
                ? "border-gold-500 dark:border-gold-600 bg-gold-50 dark:bg-gold-900/20 shadow-md"
                : "border-slate-200 dark:border-slate-700 hover:border-gold-300 dark:hover:border-gold-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }
          `}
        >
          <div className="text-3xl mb-3">🔀</div>
          <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Both (Hybrid Mode)
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Add demo data alongside your real connections for a fuller
            experience while learning
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Demo data will be clearly labeled
          </div>
          <div
            className={`
              mt-auto w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${
                seedOption === "hybrid"
                  ? "border-gold-500 dark:border-gold-600 bg-gold-500 dark:bg-gold-600"
                  : "border-slate-300 dark:border-slate-600"
              }
            `}
          >
            {seedOption === "hybrid" && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </div>
        </button>
      </div>

      {/* Warning for Demo Data */}
      {(seedOption === "demo" || seedOption === "hybrid") && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="text-sm text-amber-900 dark:text-amber-100">
            💡 Demo data can be cleared anytime from Settings → Demo Data
            Management
          </div>
        </div>
      )}

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
            Skip
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gold-600 dark:bg-gold-700 rounded-md hover:bg-gold-700 dark:hover:bg-gold-800 transition-colors shadow-md hover:shadow-lg"
          >
            Next: Preferences →
          </button>
        </div>
      </div>
    </div>
  );
}
