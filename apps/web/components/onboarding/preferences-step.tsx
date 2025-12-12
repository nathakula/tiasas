"use client";

import { useState } from "react";

export interface PreferencesStepData {
  startingCapital: number | null;
  benchmarks: string[];
  aiProvider: "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "custom";
  aiBaseUrl?: string;
}

interface PreferencesStepProps {
  initialData?: PreferencesStepData;
  onNext: (data: PreferencesStepData) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function PreferencesStep({
  initialData,
  onNext,
  onBack,
  onSkip,
}: PreferencesStepProps) {
  const [startingCapital, setStartingCapital] = useState<string>(
    initialData?.startingCapital?.toString() ?? ""
  );
  const [benchmarks, setBenchmarks] = useState<string>(
    initialData?.benchmarks?.join(", ") ?? "SPY, QQQ"
  );
  const [aiProvider, setAiProvider] = useState<
    "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "custom"
  >(initialData?.aiProvider ?? "openai");
  const [aiBaseUrl, setAiBaseUrl] = useState<string>(
    initialData?.aiBaseUrl ?? ""
  );

  const handleNext = () => {
    const capitalNum = startingCapital ? parseFloat(startingCapital) : null;
    const benchmarkArray = benchmarks
      .split(",")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    onNext({
      startingCapital: capitalNum,
      benchmarks: benchmarkArray,
      aiProvider,
      aiBaseUrl: aiProvider === "custom" ? aiBaseUrl : undefined,
    });
  };

  return (
    <div className="card p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Set Up Performance Tracking
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Configure your trading preferences and analytics
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6 mb-6">
        {/* Starting Capital */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Starting Capital (for current year)
          </label>
          <input
            type="number"
            value={startingCapital}
            onChange={(e) => setStartingCapital(e.target.value)}
            placeholder="50000"
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600"
          />
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Used to calculate returns and performance metrics. You can add
            deposits/withdrawals later.
          </div>
        </div>

        {/* Benchmark Symbols */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Benchmark Symbols <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            type="text"
            value={benchmarks}
            onChange={(e) => setBenchmarks(e.target.value)}
            placeholder="SPY, QQQ"
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600"
          />
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare your performance against these benchmarks. Separate with
            commas.
          </div>
        </div>

        {/* AI Provider */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            AI Provider (for Analyst's Bench)
          </label>
          <select
            value={aiProvider}
            onChange={(e) =>
              setAiProvider(e.target.value as "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "custom")
            }
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600"
          >
            <option value="openai">OpenAI (GPT-4o, GPT-5)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="gemini">Google (Gemini)</option>
            <option value="openrouter">OpenRouter (Multi-model)</option>
            <option value="ollama">Ollama (Local)</option>
            <option value="custom">Custom Endpoint</option>
          </select>

          {aiProvider === "custom" && (
            <input
              type="url"
              value={aiBaseUrl}
              onChange={(e) => setAiBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-600 mt-2"
            />
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Uses environment API key by default. Configure custom keys in
            Settings later.
          </div>
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
            Skip
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gold-600 dark:bg-gold-700 rounded-md hover:bg-gold-700 dark:hover:bg-gold-800 transition-colors shadow-md hover:shadow-lg"
          >
            Complete Setup →
          </button>
        </div>
      </div>
    </div>
  );
}
