"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertCircle, Loader2, BarChart3, Lightbulb } from "lucide-react";

interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  broker: string;
  account: string;
  lastUpdated: Date;
}

interface Trade {
  date: Date;
  realizedPnl: number;
  unrealizedPnl: number;
  note: string | null;
}

interface Metrics {
  mtdRealized: number;
  currentUnrealized: number;
  currentEquity: number | null;
  winRate: number | null;
  sharpeRatio: number | null;
  totalPositions: number;
  totalRecentTrades: number;
}

interface PortfolioContext {
  mode: "positions" | "recent_trades" | "no_data";
  positions: Position[];
  recentTrades: Trade[];
  metrics: Metrics;
  timestamp: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function PortfolioAdvisor() {
  const [context, setContext] = useState<PortfolioContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch portfolio context on mount
  useEffect(() => {
    async function fetchContext() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/ai/portfolio-context");
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch portfolio context");
        }
        const data = await res.json();
        setContext(data);

        // Set initial AI greeting based on mode
        const greeting = getInitialGreeting(data);
        setMessages([{ role: "assistant", content: greeting }]);
      } catch (err: any) {
        console.error("Error fetching portfolio context:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchContext();
  }, []);

  function getInitialGreeting(ctx: PortfolioContext): string {
    if (ctx.mode === "positions") {
      return `👋 Hi! I see you have **${ctx.metrics.totalPositions} active position${ctx.metrics.totalPositions > 1 ? "s" : ""}** right now. I can help you analyze your holdings, suggest risk adjustments, or identify opportunities. What would you like to explore?`;
    } else if (ctx.mode === "recent_trades") {
      return `👋 Hi! You don't have any open positions, but I can see you've made **${ctx.metrics.totalRecentTrades} trade${ctx.metrics.totalRecentTrades > 1 ? "s" : ""}** in the last 30 days. I can analyze your trading patterns, review past performance, or help you find new opportunities. What interests you?`;
    } else {
      return `👋 Hi! It looks like you're just getting started. I can help you build a watchlist, scan the market for opportunities, or review general trading strategies. What would you like to explore?`;
    }
  }

  async function sendMessage() {
    if (!input.trim() || !context) return;

    const userMessage = input.trim();
    setInput("");
    setSending(true);

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      // Send to AI chat endpoint with portfolio context
      const res = await fetch("/api/ai/portfolio-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: context,
          history: messages,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-500/10 border-red-500/20 p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-red-600 dark:text-red-400">Error Loading Portfolio</h3>
        </div>
        <p className="text-slate-700 dark:text-slate-300">{error}</p>
      </div>
    );
  }

  if (!context) return null;

  return (
    <div className="space-y-4">
      {/* Context Summary Card */}
      <div className="card p-4 bg-gradient-to-br from-gold-500/10 to-gold-500/5 border-gold-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Portfolio Context
            </h3>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              {context.mode === "positions" && (
                <>
                  <p>📊 {context.metrics.totalPositions} active positions</p>
                  <p>
                    {context.metrics.currentUnrealized >= 0 ? "📈" : "📉"} Unrealized P&L:{" "}
                    <span
                      className={
                        context.metrics.currentUnrealized >= 0
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-red-600 dark:text-red-400 font-medium"
                      }
                    >
                      {context.metrics.currentUnrealized >= 0 ? "+" : ""}$
                      {context.metrics.currentUnrealized.toLocaleString()}
                    </span>
                  </p>
                </>
              )}
              {context.mode === "recent_trades" && (
                <>
                  <p>📝 {context.metrics.totalRecentTrades} trades in last 30 days</p>
                  {context.metrics.winRate !== null && (
                    <p>
                      🎯 Win Rate: <span className="font-medium">{context.metrics.winRate.toFixed(1)}%</span>
                    </p>
                  )}
                </>
              )}
              {context.mode === "no_data" && (
                <p>🚀 Ready to start analyzing the market</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">MTD Realized</div>
            <div
              className={`text-xl font-bold ${
                context.metrics.mtdRealized >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {context.metrics.mtdRealized >= 0 ? "+" : ""}$
              {context.metrics.mtdRealized.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="card p-4">
        <div className="space-y-4 mb-4 max-h-[500px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-gold-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
            placeholder={
              context.mode === "positions"
                ? "Ask about your positions..."
                : context.mode === "recent_trades"
                ? "Ask about your recent trades..."
                : "Ask for market insights..."
            }
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Quick Action Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {context.mode === "positions" && (
          <>
            <QuickAction
              icon={<BarChart3 className="w-4 h-4" />}
              label="Analyze my portfolio risk"
              onClick={() => {
                setInput("Can you analyze the risk in my current portfolio?");
              }}
            />
            <QuickAction
              icon={<TrendingUp className="w-4 h-4" />}
              label="Which positions to trim?"
              onClick={() => {
                setInput("Which positions should I consider trimming or taking profits on?");
              }}
            />
            <QuickAction
              icon={<Lightbulb className="w-4 h-4" />}
              label="Suggest new opportunities"
              onClick={() => {
                setInput("Based on my current holdings, what new opportunities should I consider?");
              }}
            />
          </>
        )}
        {context.mode === "recent_trades" && (
          <>
            <QuickAction
              icon={<BarChart3 className="w-4 h-4" />}
              label="Review my trading patterns"
              onClick={() => {
                setInput("Can you analyze my recent trading patterns and identify areas for improvement?");
              }}
            />
            <QuickAction
              icon={<TrendingUp className="w-4 h-4" />}
              label="What worked well?"
              onClick={() => {
                setInput("What strategies or setups worked best in my recent trades?");
              }}
            />
            <QuickAction
              icon={<Lightbulb className="w-4 h-4" />}
              label="Find new setups"
              onClick={() => {
                setInput("Help me find new trading opportunities based on my style.");
              }}
            />
          </>
        )}
        {context.mode === "no_data" && (
          <>
            <QuickAction
              icon={<BarChart3 className="w-4 h-4" />}
              label="Market scan"
              onClick={() => {
                setInput("What are some interesting market opportunities right now?");
              }}
            />
            <QuickAction
              icon={<TrendingUp className="w-4 h-4" />}
              label="Build a watchlist"
              onClick={() => {
                setInput("Help me build a watchlist of stocks to monitor.");
              }}
            />
            <QuickAction
              icon={<Lightbulb className="w-4 h-4" />}
              label="Trading strategies"
              onClick={() => {
                setInput("What are some effective trading strategies for the current market?");
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card p-3 hover:border-gold-500 dark:hover:border-gold-600 hover:shadow-lg transition-all duration-200 flex items-center gap-2 group"
    >
      <div className="text-gold-500 group-hover:scale-110 transition-transform">{icon}</div>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </button>
  );
}
