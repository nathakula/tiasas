export type Level = { price: number; note?: string };
export type Catalyst = { date: string; label: string; source?: string };
export type RangeStat = { period: string; chgPct: number; high: number; low: number; atr?: number };

export type QuickScanResult = {
  ticker: string;
  window: string;
  trend: 'up'|'down'|'sideways';
  supports: Level[];
  resistances: Level[];
  entryIdeas: string[];
  exitIdeas: string[];
  ranges: RangeStat[];
  catalysts: Catalyst[];
  macroNote?: string;
  disclaimer: string;
};

export type DeepDiveResult = {
  ticker: string;
  overview: string;
  recentResults: string;
  technicalZones: { supports: Level[]; resistances: Level[]; momentumNote?: string };
  valuationContext: string;
  comps?: string[];
  risks: string[];
  alternativeCases: string[];
  checklist: string[];
  sources?: string[];
  disclaimer: string;
};

export type ParsedPosition = {
  symbol: string;
  type: 'stock'|'call'|'put';
  side: 'long'|'short';
  strike?: number;
  expiry?: string; // ISO date
  qty: number;
  avgPrice?: number;
};

export type WhatIfResult = {
  positions: ParsedPosition[];
  strategyLabel: string;
  payoff: {
    breakEvens: number[];
    maxProfit: number | null;
    maxLoss: number | null;
    p50?: number | null;
  };
  sensitivity: { price: number; pnl: number }[];
  risks: string[];
  notes?: string;
  disclaimer: string;
};

export type MacroResult = {
  summary: string;
  weekAhead: { date: string; item: string }[];
  watchouts?: string[];
  disclaimer: string;
};

export type ActionItem = { symbol?: string; horizon: 'today'|'this_week'|'this_month'; text: string };
