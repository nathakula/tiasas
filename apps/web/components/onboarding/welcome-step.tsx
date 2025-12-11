"use client";

import { useState } from "react";

export type ProficiencyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL";

export interface WelcomeStepData {
  proficiencyLevel: ProficiencyLevel | null;
  goals: string[];
}

interface WelcomeStepProps {
  initialData?: WelcomeStepData;
  onNext: (data: WelcomeStepData) => void;
  onSkip: () => void;
}

const PROFICIENCY_OPTIONS = [
  {
    value: "BEGINNER" as ProficiencyLevel,
    label: "Beginner",
    description: "0-1 years - Just getting started with trading",
  },
  {
    value: "INTERMEDIATE" as ProficiencyLevel,
    label: "Intermediate",
    description: "1-3 years - Regular trader with some experience",
  },
  {
    value: "ADVANCED" as ProficiencyLevel,
    label: "Advanced",
    description: "3-5 years - Experienced trader with consistent strategy",
  },
  {
    value: "PROFESSIONAL" as ProficiencyLevel,
    label: "Professional",
    description: "5+ years - Full-time trader or finance professional",
  },
];

const GOAL_OPTIONS = [
  { value: "track_pnl", label: "Track P&L and performance metrics" },
  { value: "aggregate_positions", label: "Aggregate positions across multiple brokers" },
  { value: "journal_trades", label: "Journal trades and improve discipline" },
  { value: "analyze_performance", label: "Analyze performance vs benchmarks (SPY, QQQ)" },
  { value: "ai_insights", label: "Use AI insights for market analysis" },
];

export function WelcomeStep({ initialData, onNext, onSkip }: WelcomeStepProps) {
  const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel | null>(
    initialData?.proficiencyLevel ?? null
  );
  const [goals, setGoals] = useState<string[]>(initialData?.goals ?? []);

  const toggleGoal = (goalValue: string) => {
    setGoals((prev) =>
      prev.includes(goalValue)
        ? prev.filter((g) => g !== goalValue)
        : [...prev, goalValue]
    );
  };

  const handleNext = () => {
    if (!proficiencyLevel) {
      alert("Please select your trading proficiency level");
      return;
    }

    onNext({ proficiencyLevel, goals });
  };

  return (
    <div className="card p-8">
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Welcome to Tiasas Portfolio Tracker!
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Let's personalize your experience in 4 quick steps
        </p>
      </div>

      {/* Proficiency Level Selection */}
      <div className="mb-8">
        <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          What's your trading proficiency level?
        </label>

        <div className="space-y-3">
          {PROFICIENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setProficiencyLevel(option.value)}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                ${
                  proficiencyLevel === option.value
                    ? "border-gold-500 dark:border-gold-600 bg-gold-50 dark:bg-gold-900/20 shadow-md"
                    : "border-slate-200 dark:border-slate-700 hover:border-gold-300 dark:hover:border-gold-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${
                      proficiencyLevel === option.value
                        ? "border-gold-500 dark:border-gold-600 bg-gold-500 dark:bg-gold-600"
                        : "border-slate-300 dark:border-slate-600"
                    }
                  `}
                >
                  {proficiencyLevel === option.value && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {option.label}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {option.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Goals Selection */}
      <div className="mb-8">
        <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          What are your primary goals?
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
            (Select all that apply)
          </span>
        </label>

        <div className="space-y-2">
          {GOAL_OPTIONS.map((goal) => (
            <button
              key={goal.value}
              type="button"
              onClick={() => toggleGoal(goal.value)}
              className={`
                w-full text-left p-3 rounded-lg border transition-all duration-200
                ${
                  goals.includes(goal.value)
                    ? "border-gold-500 dark:border-gold-600 bg-gold-50 dark:bg-gold-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-gold-300 dark:hover:border-gold-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0
                    ${
                      goals.includes(goal.value)
                        ? "border-gold-500 dark:border-gold-600 bg-gold-500 dark:bg-gold-600"
                        : "border-slate-300 dark:border-slate-600"
                    }
                  `}
                >
                  {goals.includes(goal.value) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-slate-900 dark:text-slate-100">
                  {goal.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onSkip}
          className="px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Skip Setup
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!proficiencyLevel}
          className="px-6 py-2.5 text-sm font-medium text-white bg-gold-600 dark:bg-gold-700 rounded-md hover:bg-gold-700 dark:hover:bg-gold-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
        >
          Next: Connect Brokers →
        </button>
      </div>
    </div>
  );
}
