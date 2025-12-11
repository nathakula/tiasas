"use client";

import { useState } from "react";
import type { ProficiencyLevel } from "./welcome-step";
import type { SeedDataOption } from "./seed-data-step";

interface CompletionStepProps {
  wizardData: {
    proficiencyLevel?: ProficiencyLevel;
    goals?: string[];
    connectionsCount?: number;
    seedDataOption?: SeedDataOption;
    startingCapital?: number | null;
    benchmarks?: string[];
  };
  onComplete: () => void;
}

const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  BEGINNER: "Beginner (0-1 years)",
  INTERMEDIATE: "Intermediate (1-3 years)",
  ADVANCED: "Advanced (3-5 years)",
  PROFESSIONAL: "Professional (5+ years)",
};

const SEED_DATA_LABELS: Record<SeedDataOption, string> = {
  use_real: "Real Data Only",
  demo: "Demo Data",
  hybrid: "Hybrid (Real + Demo)",
};

export function CompletionStep({
  wizardData,
  onComplete,
}: CompletionStepProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    await onComplete();
  };

  return (
    <div className="card p-8">
      {/* Success Icon */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
          <svg
            className="w-10 h-10 text-emerald-600 dark:text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          You're All Set!
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Your Tiasas workspace is ready
        </p>
      </div>

      {/* Setup Summary */}
      <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Setup Summary
        </h3>

        <div className="space-y-3">
          {/* Proficiency Level */}
          {wizardData.proficiencyLevel && (
            <div className="flex items-center gap-3">
              <div className="text-2xl">👤</div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Trading Level
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {PROFICIENCY_LABELS[wizardData.proficiencyLevel]}
                </div>
              </div>
            </div>
          )}

          {/* Connected Brokers */}
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔗</div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Connected Brokers
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                {wizardData.connectionsCount || 0}{" "}
                {wizardData.connectionsCount === 0 && "(You can add later)"}
              </div>
            </div>
          </div>

          {/* Data Mode */}
          {wizardData.seedDataOption && (
            <div className="flex items-center gap-3">
              <div className="text-2xl">📊</div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Data Mode
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {SEED_DATA_LABELS[wizardData.seedDataOption]}
                </div>
              </div>
            </div>
          )}

          {/* Starting Capital */}
          {wizardData.startingCapital && (
            <div className="flex items-center gap-3">
              <div className="text-2xl">💰</div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Starting Capital
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  ${wizardData.startingCapital.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Benchmarks */}
          {wizardData.benchmarks && wizardData.benchmarks.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-2xl">📈</div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Benchmarks
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {wizardData.benchmarks.join(", ")}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps */}
      <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          What You Can Do Next:
        </h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="text-lg">📝</span>
            <span>Add your first journal entry or daily P&L</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="text-lg">📅</span>
            <span>View your calendar and track performance</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="text-lg">💼</span>
            <span>Check your aggregated positions</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="text-lg">📈</span>
            <span>Explore performance analytics</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <span className="text-lg">🤖</span>
            <span>Try the AI Analyst's Bench</span>
          </li>
        </ul>
      </div>

      {/* Complete Button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleComplete}
          disabled={isCompleting}
          className="px-8 py-3 text-base font-medium text-white bg-gold-600 dark:bg-gold-700 rounded-md hover:bg-gold-700 dark:hover:bg-gold-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isCompleting ? "Setting up..." : "Go to Dashboard →"}
        </button>
      </div>
    </div>
  );
}
