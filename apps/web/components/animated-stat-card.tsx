"use client";

import { useCounterAnimation } from "@/hooks/use-counter-animation";

export function AnimatedStatCard({
  label,
  value,
  rawValue,
  subtitle,
  tone,
  isPercentage = false,
  isCurrency = false,
}: {
  label: string;
  value: string;
  rawValue?: number;
  subtitle?: string;
  tone?: "pos" | "neg";
  isPercentage?: boolean;
  isCurrency?: boolean;
}) {
  const animatedValue = useCounterAnimation(rawValue ?? 0, 1500);

  const formatValue = (val: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(val);
    }
    if (isPercentage) {
      return `${(val * 100).toFixed(2)}%`;
    }
    return Math.round(val).toString();
  };

  const displayValue = rawValue !== undefined ? formatValue(animatedValue) : value;

  return (
    <div className="card p-4 animate-count-up">
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`text-2xl font-bold mt-1 transition-colors duration-300 ${
          tone === "pos"
            ? "text-emerald-700 dark:text-emerald-400"
            : tone === "neg"
            ? "text-red-700 dark:text-red-400"
            : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {displayValue}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>
      )}
    </div>
  );
}
