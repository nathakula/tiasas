"use client";

import { useState } from "react";

interface SeedDataStats {
  hasSeedData: boolean;
  journalEntries: number;
  dailyPnlEntries: number;
  positions: number;
  monthlyNavEntries: number;
}

interface SeedDataManagerProps {
  initialStats: SeedDataStats;
}

export function SeedDataManager({ initialStats }: SeedDataManagerProps) {
  const [stats, setStats] = useState<SeedDataStats>(initialStats);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSeedRecords =
    stats.journalEntries +
    stats.dailyPnlEntries +
    stats.positions +
    stats.monthlyNavEntries;

  async function handleDeleteSeedData() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/seed-data", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete seed data");
      }

      const result = await response.json();

      // Update stats to reflect deletion
      setStats({
        hasSeedData: false,
        journalEntries: 0,
        dailyPnlEntries: 0,
        positions: 0,
        monthlyNavEntries: 0,
      });

      setShowConfirmation(false);

      // Show success toast (if you have a toast system)
      alert(`Successfully deleted ${result.deletedCount} seed data records`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  }

  // If no seed data exists, don't show this section
  if (!stats.hasSeedData || totalSeedRecords === 0) {
    return null;
  }

  return (
    <div className="card p-4">
      <div className="mb-3">
        <div className="font-medium text-slate-900 dark:text-slate-100">
          Demo Data Management
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage sample data from your onboarding setup
        </div>
      </div>

      {/* Seed Data Summary */}
      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
        <div className="flex items-start gap-2">
          <div className="text-amber-600 dark:text-amber-400 text-lg">ℹ️</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
              You have demo data in your account
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              This sample data was added during onboarding to help you explore
              the platform
            </div>

            {/* Breakdown */}
            <div className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-200">
              {stats.journalEntries > 0 && (
                <div>• {stats.journalEntries} journal entries</div>
              )}
              {stats.dailyPnlEntries > 0 && (
                <div>• {stats.dailyPnlEntries} daily P&L records</div>
              )}
              {stats.positions > 0 && (
                <div>• {stats.positions} position snapshots</div>
              )}
              {stats.monthlyNavEntries > 0 && (
                <div>• {stats.monthlyNavEntries} monthly NAV records</div>
              )}
            </div>

            <div className="text-xs font-semibold text-amber-900 dark:text-amber-100 mt-2">
              Total: {totalSeedRecords} demo records
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      {/* Delete Button */}
      {!showConfirmation ? (
        <button
          onClick={() => setShowConfirmation(true)}
          className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
        >
          Remove All Demo Data
        </button>
      ) : (
        <div className="space-y-3">
          {/* Confirmation Message */}
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="text-sm font-medium text-red-900 dark:text-red-100">
              Are you sure you want to delete all demo data?
            </div>
            <div className="text-xs text-red-700 dark:text-red-300 mt-1">
              This will permanently remove {totalSeedRecords} demo records. Your
              real data (from broker connections and manual entries) will not be
              affected.
            </div>
          </div>

          {/* Confirmation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSeedData}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 rounded-md hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Demo Data"}
            </button>
            <button
              onClick={() => {
                setShowConfirmation(false);
                setError(null);
              }}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
