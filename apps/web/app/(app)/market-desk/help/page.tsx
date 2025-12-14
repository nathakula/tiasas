import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center - TIASAS",
  description: "Learn how to use TIASAS Market Desk for trading and portfolio management",
};

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Help Center</h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          Your comprehensive guide to using TIASAS Market Desk for day trading and portfolio management.
        </p>
      </div>

      {/* Table of Contents */}
      <div className="mb-12 p-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <a href="#getting-started" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Getting Started</a>
          <a href="#overview" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Overview</a>
          <a href="#journal" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Journal</a>
          <a href="#bulk-upload" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Bulk Upload</a>
          <a href="#calendar" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Calendar</a>
          <a href="#performance" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Performance</a>
          <a href="#brokerbridge" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ BrokerBridge</a>
          <a href="#connections" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Connections</a>
          <a href="#positions" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Positions</a>
          <a href="#ai" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Analyst's Bench (AI)</a>
          <a href="#workspace-sharing" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 hover:underline">→ Workspace Sharing</a>
        </div>
      </div>

      {/* Getting Started Section */}
      <section id="getting-started" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-gold-500 dark:border-gold-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">🚀 Getting Started</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            Welcome to TIASAS! When you first sign up, you'll go through a quick <strong>5-step onboarding wizard</strong> designed to
            personalize your experience and get you up and running fast. The entire process takes about 2-3 minutes, and you can skip it
            if you prefer to explore on your own.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">The Onboarding Wizard:</h3>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Step 1: Welcome & Proficiency</h4>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Tell us about your trading experience and goals. This helps TIASAS customize features and content to your skill level.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 text-sm ml-4">
                <li><strong>Proficiency Level:</strong> Beginner, Intermediate, Advanced, or Professional</li>
                <li><strong>Trading Goals:</strong> Select from options like Build Consistency, Improve Win Rate, Track Performance, etc.</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Step 2: Broker Connections</h4>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Connect your brokerage accounts or plan to import positions via CSV. Currently showing upcoming integrations:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 text-sm ml-4">
                <li>E*TRADE, Fidelity, Charles Schwab, Robinhood (Coming Soon)</li>
                <li>Generic CSV import (Available now)</li>
              </ul>
              <p className="text-gray-700 dark:text-slate-300 mt-2 text-sm">
                You can skip this step and add connections later from the Connections page.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Step 3: Seed Data Option</h4>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Choose how you want to start using TIASAS:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 text-sm ml-4">
                <li><strong>Use Real Data:</strong> Start with a clean slate and import your actual trading data</li>
                <li><strong>Demo Data:</strong> Pre-populate with sample trades, positions, and journal entries to explore features</li>
                <li><strong>Hybrid Mode:</strong> Get demo data to explore while you prepare to import your real data</li>
              </ul>
              <p className="text-yellow-700 dark:text-yellow-400 mt-2 text-sm">
                Note: Demo data can be removed anytime from Settings → Seed Data Manager
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Step 4: Preferences & Settings</h4>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Configure essential settings for performance tracking:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 text-sm ml-4">
                <li><strong>Starting Capital:</strong> Your portfolio value at the start of the year (for calculating returns)</li>
                <li><strong>Benchmark Symbols:</strong> Indices to compare your performance against (e.g., SPY, QQQ, IWM)</li>
                <li><strong>AI Provider:</strong> Choose your AI service for Analyst's Bench (OpenAI, OpenRouter, or Custom)</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Step 5: Completion & Next Steps</h4>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Review your setup and get personalized next steps to start using TIASAS effectively. You'll be directed to the
                Market Desk dashboard to begin tracking your trading journey.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 First Steps After Onboarding:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-slate-300">
              <li>If you chose demo data, explore the Journal, Calendar, and Performance pages to see how TIASAS works</li>
              <li>If you chose real data, head to Bulk Upload to import your historical trading data</li>
              <li>Connect your broker(s) from the Connections page to sync positions</li>
              <li>Create your first journal entry to document today's market thoughts</li>
              <li>Set up daily P&L tracking (manual entry or broker sync)</li>
            </ol>
          </div>

          <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">✨ Can I Skip Onboarding?</h4>
            <p className="text-gray-700 dark:text-slate-300">
              Yes! You can click "Skip" at any step to go directly to the Market Desk. However, we recommend completing it -
              the wizard takes just 2-3 minutes and ensures you get the most out of TIASAS from day one. You can always
              adjust settings later from the Settings page.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800 mt-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">🔄 Removing Demo Data:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              If you selected demo data during onboarding and want to remove it later:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-slate-300 mt-2 ml-4">
              <li>Navigate to Settings (gear icon in sidebar)</li>
              <li>Scroll to the "Seed Data Manager" section</li>
              <li>Review the demo data statistics (journal entries, P&L records, positions, etc.)</li>
              <li>Click "Delete All Seed Data" and confirm</li>
              <li>All demo data will be permanently removed, leaving you with a clean slate</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section id="overview" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-blue-500 dark:border-blue-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">📊 Overview</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            The <strong>Overview</strong> page is your trading dashboard - your first stop each day to see the big picture of your trading performance.
            It provides a comprehensive snapshot of your P&L (Profit & Loss), recent trading activity, and market insights all in one place.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Performance Health:</strong> Key metrics like Sharpe Ratio, Sortino Ratio, and Win Rate at a glance</li>
            <li><strong>Financial Overview:</strong> MTD Realized P&L, Current Unrealized P&L, YTD P&L, and Latest NAV</li>
            <li><strong>Recent Trading Activity:</strong> Your last 5 daily P&L entries with realized profits/losses</li>
            <li><strong>Quick Actions:</strong> Fast links to add journal entries, view calendar, and analyze performance</li>
          </ul>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 Example Use Case:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              Start your day by checking the Overview page. You immediately see you're up $2,450 for the day with 3 winning trades
              and 1 losing trade. Your monthly P&L shows +$15,230, putting you on track for your best month ever. Your latest journal
              entry reminds you to "stay disciplined on stop losses" - a note you made after yesterday's session.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Key Actions:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300">
            <li>Monitor intraday performance without switching between multiple broker platforms</li>
            <li>Quickly assess if you're meeting your daily/monthly profit targets</li>
            <li>Review recent journal entries to maintain trading discipline</li>
          </ul>
        </div>
      </section>

      {/* Journal Section */}
      <section id="journal" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-green-500 dark:border-green-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">📝 Journal</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            The <strong>Journal</strong> is your trading diary - a critical tool for improving your trading performance through reflection and
            pattern recognition. Document your thoughts, emotions, market observations, and trade rationale to build better trading habits.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Chronological Entries:</strong> All your journal entries listed by date, newest first</li>
            <li><strong>Search & Filter:</strong> Find specific entries by date, tags, or keywords</li>
            <li><strong>Tags System:</strong> Organize entries with custom tags like #winners, #mistakes, #strategy</li>
            <li><strong>Rich Text Editor:</strong> Write detailed notes with formatting, lists, and structure</li>
          </ul>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 Example Entry:</h4>
            <div className="bg-white dark:bg-slate-900 p-3 rounded border border-gray-300 dark:border-slate-700 text-sm">
              <p className="text-gray-600 dark:text-slate-400 text-xs mb-2">December 14, 2024 • Tags: #winning-trade #tech-stocks</p>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                <strong>Pre-Market Thoughts:</strong> Market showing strength, tech sector leading. Planning to watch NVDA for continuation pattern.
              </p>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                <strong>Entry:</strong> Entered NVDA at $485.20, 200 shares at 10:15 AM. Stock broke resistance with strong volume.
              </p>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                <strong>Management:</strong> Set stop at $483 (-0.45%). Target $490 (+1%). Stock moved quickly, hit target at 11:02 AM.
              </p>
              <p className="text-gray-700 dark:text-slate-300">
                <strong>Result:</strong> +$960 profit. Executed plan perfectly. Emotion: Confident but controlled.
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li>Click "New Entry" to create a journal entry for today</li>
            <li>Write your pre-market thoughts, trade plans, or end-of-day reflections</li>
            <li>Add relevant tags to categorize the entry (e.g., #winners, #lessons-learned)</li>
            <li>Review past entries weekly to identify patterns in your trading behavior</li>
          </ol>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">⚡ Pro Tip:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              Make journaling a non-negotiable habit. Write at least 2-3 entries per week: pre-market thoughts,
              post-trade analysis, and weekly reviews. The most successful traders are excellent journalers.
            </p>
          </div>
        </div>
      </section>

      {/* Bulk Upload Section */}
      <section id="bulk-upload" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-purple-500 dark:border-purple-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">📤 Bulk Upload</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            <strong>Bulk Upload</strong> allows you to import multiple records at once from a CSV file. You can import three types of data:
            <strong> Daily P&L</strong> (your trading results), <strong>Monthly NAV</strong> (month-end portfolio values), and
            <strong> Journal Notes</strong> (trading observations). Perfect for backfilling historical data or migrating from spreadsheets.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Data Type Selector:</strong> Choose between Daily P&L, Monthly NAV, or Journal Notes</li>
            <li><strong>CSV Templates:</strong> Download templates for each data type</li>
            <li><strong>Drag & Drop Upload:</strong> Simply drag your CSV file into the upload zone</li>
            <li><strong>Validation & Preview:</strong> Validate your data before importing</li>
            <li><strong>Undo Capability:</strong> Roll back any import if needed</li>
          </ul>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 CSV Formats:</h4>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-1">Daily P&L:</p>
              <div className="bg-white dark:bg-slate-900 p-2 rounded border border-gray-300 dark:border-slate-700 font-mono text-xs overflow-x-auto">
                <pre className="text-gray-900 dark:text-slate-100">{`date,realized,unrealized,totalEquity,note
2025-12-01,1200,-50,385000,Good momentum day
2025-12-02,-200,0,384800,Cut losses early`}</pre>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Required: date, realized. Optional: unrealized, totalEquity, note</p>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-1">Monthly NAV:</p>
              <div className="bg-white dark:bg-slate-900 p-2 rounded border border-gray-300 dark:border-slate-700 font-mono text-xs overflow-x-auto">
                <pre className="text-gray-900 dark:text-slate-100">{`date,nav
2025-01,265700
2025-02,280000`}</pre>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Use YYYY-MM format or any date (auto-converted to month-end)</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-1">Journal Notes:</p>
              <div className="bg-white dark:bg-slate-900 p-2 rounded border border-gray-300 dark:border-slate-700 font-mono text-xs overflow-x-auto">
                <pre className="text-gray-900 dark:text-slate-100">{`date,text,tags
2025-12-01,"Strong tech setup today",#winning,#tech`}</pre>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li>Select your data type (Daily P&L, Monthly NAV, or Journal)</li>
            <li>Download the appropriate CSV template</li>
            <li>Fill in your data, save, and drag the file into the upload zone</li>
            <li>Click "Validate" to preview and check for errors</li>
            <li>Click "Import" to save the data</li>
          </ol>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">📌 Best Practice:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              For Daily P&L, include <code className="bg-gray-200 dark:bg-slate-800 px-1 rounded">totalEquity</code> when possible -
              this enables tracking your portfolio value over time. If you already have data without totalEquity, you can always
              bulk upload again with the upsert strategy to add it later.
            </p>
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <section id="calendar" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-orange-500 dark:border-orange-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">📅 Calendar</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            The <strong>Calendar</strong> provides a visual timeline of your trading performance. See at a glance which days were profitable
            (green), which had losses (red), and identify patterns in your trading schedule. Perfect for spotting weekly or monthly patterns.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Monthly Calendar View:</strong> Full month display with P&L for each trading day</li>
            <li><strong>Color-Coded Days:</strong> Green for profit, red for loss, gray for no trades</li>
            <li><strong>Daily P&L Amounts:</strong> Hover over any day to see exact profit/loss numbers</li>
            <li><strong>Quick Navigation:</strong> Jump between months to analyze historical performance</li>
            <li><strong>Pattern Recognition:</strong> Identify which days of the week you perform best</li>
          </ul>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 Example Insight:</h4>
            <p className="text-gray-700 dark:text-slate-300 mb-3">
              Looking at your December calendar, you notice:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 ml-4">
              <li>Mondays are usually your best days (4 out of 5 green)</li>
              <li>Friday afternoons show consistent small losses</li>
              <li>You had 3 consecutive red days after Thanksgiving - emotional trading?</li>
              <li>Your best week was Dec 4-8 with 5 straight profitable days</li>
            </ul>
            <p className="text-gray-700 dark:text-slate-300 mt-3">
              <strong>Action:</strong> Adjust your strategy - trade more aggressively on Mondays, avoid Friday afternoon trades,
              and be extra cautious after holiday breaks.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Key Actions:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300">
            <li>Click any day to see detailed trades and journal entries for that date</li>
            <li>Use month navigation arrows to review past performance</li>
            <li>Look for streaks - both winning and losing - to understand momentum</li>
            <li>Identify days you didn't trade to assess if you're taking enough breaks</li>
          </ul>
        </div>
      </section>

      {/* Performance Section */}
      <section id="performance" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-pink-500 dark:border-pink-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">📈 Performance</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            <strong>Performance</strong> is your comprehensive performance analysis dashboard. Compare your returns against major benchmarks
            (S&P 500, Nasdaq, Russell 2000), visualize your equity curve, track monthly P&L trends, and identify how you stack up against
            the broader market. All with beautiful animated charts that bring your data to life.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Benchmark Comparison Chart:</strong> Your cumulative returns vs. S&P 500, Nasdaq, and Russell 2000 - animated line chart</li>
            <li><strong>Outperformance Stats:</strong> See exactly how many percentage points you're beating (or trailing) each benchmark</li>
            <li><strong>Monthly Realized P&L Chart:</strong> Bar chart showing your profit/loss for each month of the year</li>
            <li><strong>NAV & Equity Chart:</strong> Track your Net Asset Value over time with a smooth line chart</li>
            <li><strong>Year Selector:</strong> Analyze current or previous years of trading performance</li>
            <li><strong>Starting Capital Settings:</strong> Configure your starting capital for accurate return calculations</li>
          </ul>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 Example Analysis:</h4>
            <p className="text-gray-700 dark:text-slate-300 mb-3">
              Your Performance page reveals:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 ml-4">
              <li><strong>Your Return (YTD):</strong> +68.98% - crushing it!</li>
              <li><strong>vs. S&P 500:</strong> +45.02pp outperformance (S&P is only +23.96%)</li>
              <li><strong>vs. Nasdaq:</strong> +36.30pp outperformance</li>
              <li><strong>vs. Russell 2000:</strong> +50.77pp outperformance</li>
              <li><strong>Monthly Trend:</strong> November was your best month with +$12,000 in realized P&L</li>
            </ul>
            <p className="text-gray-700 dark:text-slate-300 mt-3">
              <strong>Key Insight:</strong> You're significantly outperforming all major benchmarks - your trading edge is real and measurable!
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Understanding the Charts:</h3>
          <div className="space-y-3 text-gray-700 dark:text-slate-300">
            <div>
              <strong className="text-gray-900 dark:text-slate-100">Benchmark Comparison:</strong> The animated line chart shows your cumulative
              return (gold line) vs. benchmark indices. Lines above the X-axis mean positive returns; your goal is to have your gold line
              above all the benchmark lines.
            </div>
            <div>
              <strong className="text-gray-900 dark:text-slate-100">Monthly P&L Bars:</strong> Green/blue bars show profitable months.
              This helps you identify seasonal patterns in your trading - maybe you perform better in Q4, or struggle in summer months.
            </div>
            <div>
              <strong className="text-gray-900 dark:text-slate-100">NAV Chart:</strong> Your total portfolio value over time.
              A steadily rising line indicates consistent profitability. Sharp drops indicate drawdowns to analyze.
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">⚡ Pro Tip:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              Review your Performance page weekly to track progress. Beating benchmarks consistently (not just once) is the true sign of trading skill.
              If you're underperforming the S&P 500 long-term, you might be better off with index funds - use this data to stay accountable.
            </p>
          </div>
        </div>
      </section>

      {/* BrokerBridge Overview */}
      <section id="brokerbridge" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-indigo-500 dark:border-indigo-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">🌉 BrokerBridge</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            <strong>BrokerBridge</strong> is the unified interface that connects all your brokerage accounts in one place. Whether you trade with
            TD Ameritrade, Interactive Brokers, E*TRADE, or manage positions via CSV imports, BrokerBridge consolidates everything into a single
            portfolio view. No more logging into multiple broker websites just to see your total exposure.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Why BrokerBridge Exists:</h3>
          <p className="text-gray-700 dark:text-slate-300 mb-4">
            As a day trader, you might use multiple brokers for different purposes - one for options, another for futures, a third for international stocks.
            BrokerBridge solves the critical problem: <strong>"What's my total exposure across ALL my accounts right now?"</strong>
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Key Capabilities:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Multi-Broker Aggregation:</strong> See positions from TD Ameritrade, E*TRADE, and CSV imports in one unified view</li>
            <li><strong>Real-Time Sync:</strong> Import latest positions with a single click (or automatic daily sync)</li>
            <li><strong>Concentration Risk Analysis:</strong> Identify if you're overexposed to a single stock, sector, or asset class</li>
            <li><strong>Cross-Account Strategy:</strong> Plan trades that balance risk across multiple accounts</li>
            <li><strong>CSV Import for Flexibility:</strong> Import positions from any broker via CSV export</li>
          </ul>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 Real-World Example:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              You're trading tech stocks across three brokers:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 ml-4 my-2">
              <li>E*TRADE: 500 shares NVDA, 300 shares AAPL</li>
              <li>TD Ameritrade: 200 shares NVDA, 150 shares MSFT</li>
              <li>Interactive Brokers (CSV): 100 shares NVDA calls</li>
            </ul>
            <p className="text-gray-700 dark:text-slate-300 mt-3">
              <strong>Without BrokerBridge:</strong> You'd need to log into each platform separately, manually add up your NVDA exposure,
              and calculate total tech sector allocation.
            </p>
            <p className="text-gray-700 dark:text-slate-300 mt-2">
              <strong>With BrokerBridge:</strong> One screen shows you have $138,500 in NVDA across all accounts (23% of total portfolio)
              and 45% total tech exposure. You immediately see you're over-concentrated and should diversify.
            </p>
          </div>

          <p className="text-gray-700 dark:text-slate-300 mt-4">
            Continue reading below for detailed guides on <strong>Connections</strong> (linking your brokers) and <strong>Positions</strong> (viewing your aggregated portfolio).
          </p>
        </div>
      </section>

      {/* Connections Section */}
      <section id="connections" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-cyan-500 dark:border-cyan-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">🔗 Connections</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            The <strong>Connections</strong> page is where you link your brokerage accounts to TIASAS. Think of it as your "broker management center" -
            add connections, test them, sync positions, and manage credentials all in one place.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Connected Brokers List:</strong> All your linked brokerage accounts with status indicators</li>
            <li><strong>Add Connection Button:</strong> Link a new broker or import CSV positions</li>
            <li><strong>Sync Status:</strong> See when each account was last synced and if sync is in progress</li>
            <li><strong>Connection Health:</strong> Active (green), Error (red), or Pending (yellow) status badges</li>
            <li><strong>Manual Sync Controls:</strong> Force an immediate position sync for any connection</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">How to Add a Connection:</h3>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Method 1: CSV Import (Recommended for Day Traders)</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-slate-300">
              <li>Export your positions from your broker as CSV (most brokers have "Export to CSV" in the positions tab)</li>
              <li>Click "Add Connection" → "Import CSV"</li>
              <li>Drag and drop your CSV file (or click to browse)</li>
              <li>Preview the positions to ensure correct parsing</li>
              <li>Click "Import" - positions are saved instantly</li>
            </ol>
            <p className="text-gray-700 dark:text-slate-300 mt-3">
              <strong>Daily Workflow:</strong> Each morning (or end of day), export fresh CSV from your broker and drag it into TIASAS.
              Old positions are automatically replaced with the latest snapshot. Takes 30 seconds.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Method 2: Direct API Connection</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-slate-300">
              <li>Click "Add Connection" → Select your broker (TD Ameritrade, E*TRADE, etc.)</li>
              <li>Authenticate with your broker credentials via OAuth (secure, no password storage)</li>
              <li>Grant read-only access to positions and account data</li>
              <li>Click "Test Connection" to verify it works</li>
              <li>Enable "Auto Sync" to automatically update positions daily</li>
            </ol>
            <p className="text-gray-700 dark:text-slate-300 mt-3">
              <strong>Note:</strong> API connections provide real-time data but require broker API approval. CSV import is faster to set up.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Managing Connections:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300">
            <li><strong>Sync Now:</strong> Click the sync icon to immediately fetch latest positions</li>
            <li><strong>Edit Connection:</strong> Update credentials or re-upload CSV with new data</li>
            <li><strong>Delete Connection:</strong> Remove a broker connection and all associated positions</li>
            <li><strong>View Sync History:</strong> See log of all syncs, when they ran, and if they succeeded</li>
          </ul>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">📌 Security Note:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              All broker credentials are encrypted with AES-256 encryption. API connections use OAuth (you never give TIASAS your password).
              CSV imports contain no credentials - just position data. Your trading accounts remain fully secure.
            </p>
          </div>
        </div>
      </section>

      {/* Positions Section */}
      <section id="positions" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-teal-500 dark:border-teal-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">📋 Positions</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            The <strong>Positions</strong> page is your unified portfolio view - every stock, option, and security you own across ALL your
            brokerage accounts, displayed in one comprehensive table. This is where day traders answer critical questions like "What's my total NVDA
            exposure?" or "Am I overweight tech stocks?"
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>All Positions Table:</strong> Every position from every connected broker in one sortable table</li>
            <li><strong>Real-Time P&L:</strong> Unrealized profit/loss for each position, color-coded green (profit) or red (loss)</li>
            <li><strong>Position Details:</strong> Symbol, quantity, average cost, current price, market value, and total P&L</li>
            <li><strong>Broker Attribution:</strong> See which broker holds each position (important for multi-account traders)</li>
            <li><strong>Asset Class Breakdown:</strong> Filter by stocks, options, futures, or other security types</li>
            <li><strong>Search & Filter:</strong> Quickly find specific positions by symbol or filter by criteria</li>
            <li><strong>Concentration Analysis:</strong> Identify largest positions by dollar value or percentage of portfolio</li>
          </ul>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 Example Scenario:</h4>
            <p className="text-gray-700 dark:text-slate-300 mb-3">
              You open the Positions page mid-day and see:
            </p>
            <div className="bg-white dark:bg-slate-900 p-3 rounded border border-gray-300 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="border-b dark:border-slate-700">
                  <tr className="text-left">
                    <th className="py-2 text-gray-900 dark:text-slate-100">Symbol</th>
                    <th className="text-gray-900 dark:text-slate-100">Broker</th>
                    <th className="text-right text-gray-900 dark:text-slate-100">Qty</th>
                    <th className="text-right text-gray-900 dark:text-slate-100">Avg Cost</th>
                    <th className="text-right text-gray-900 dark:text-slate-100">Current</th>
                    <th className="text-right text-gray-900 dark:text-slate-100">P&L</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-slate-300">
                  <tr className="border-b dark:border-slate-700">
                    <td className="py-2 font-semibold text-gray-900 dark:text-slate-100">NVDA</td>
                    <td className="text-xs">E*TRADE</td>
                    <td className="text-right">500</td>
                    <td className="text-right">$485.20</td>
                    <td className="text-right">$492.35</td>
                    <td className="text-right text-green-600 dark:text-green-400">+$3,575</td>
                  </tr>
                  <tr className="border-b dark:border-slate-700">
                    <td className="py-2 font-semibold text-gray-900 dark:text-slate-100">NVDA</td>
                    <td className="text-xs">TD Ameritrade</td>
                    <td className="text-right">200</td>
                    <td className="text-right">$488.50</td>
                    <td className="text-right">$492.35</td>
                    <td className="text-right text-green-600 dark:text-green-400">+$770</td>
                  </tr>
                  <tr className="border-b dark:border-slate-700 bg-yellow-50 dark:bg-yellow-950/20">
                    <td className="py-2 font-semibold text-gray-900 dark:text-slate-100">AAPL</td>
                    <td className="text-xs">E*TRADE</td>
                    <td className="text-right">300</td>
                    <td className="text-right">$185.30</td>
                    <td className="text-right">$182.15</td>
                    <td className="text-right text-red-600 dark:text-red-400">-$945</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-700 dark:text-slate-300 mt-3">
              <strong>Key Insight:</strong> You have 700 total shares of NVDA across two brokers ($344,450 total position) - that's 34%
              of your portfolio! Might be time to take some profits and reduce concentration risk.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Key Actions on This Page:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Sort by P&L:</strong> Click column headers to see biggest winners or losers</li>
            <li><strong>Search Symbols:</strong> Type "AAPL" to quickly find all Apple positions</li>
            <li><strong>Filter by Broker:</strong> View only E*TRADE positions or only TD Ameritrade</li>
            <li><strong>Export to CSV:</strong> Download full position list for external analysis</li>
            <li><strong>Calculate Totals:</strong> See total portfolio value, total unrealized P&L, and total cost basis</li>
          </ul>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">⚡ Pro Tip for Day Traders:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              Set a concentration limit rule - no single position over 20% of portfolio, no single sector over 40%. Check the Positions
              page before entering new trades to ensure you're not accidentally over-concentrating. This prevents "all eggs in one basket" blow-ups.
            </p>
          </div>
        </div>
      </section>

      {/* Workspace Sharing Section */}
      <section id="workspace-sharing" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-emerald-500 dark:border-emerald-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">👥 Workspace Sharing</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            <strong>Workspace Sharing</strong> allows you to collaborate with others on TIASAS by sharing your workspace with different permission levels.
            Perfect for families managing trading accounts together, hedge fund teams with analysts and managers, or mentors working with students.
            Control exactly what each person can see and do in your workspace with role-based access control.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Why Workspace Sharing?</h3>
          <p className="text-gray-700 dark:text-slate-300 mb-4">
            Many trading scenarios require multiple people to access the same trading data:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Family Trading:</strong> Share portfolios between family members (e.g., Srinath and Sridhar managing separate accounts but wanting visibility into each other's performance)</li>
            <li><strong>Hedge Fund Teams:</strong> A fund manager with multiple analysts - Junior Analysts get view-only access, Senior Analysts can edit, Chief Analyst can manage connections</li>
            <li><strong>Mentorship:</strong> Trading coaches can view student accounts to provide feedback without making changes</li>
            <li><strong>Multi-Portfolio Management:</strong> Manage 5 different portfolios with different team members assigned to each</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">The 4 Permission Levels:</h3>

          <div className="space-y-3 mb-6">
            <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">👑 OWNER - Full Control</h4>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                The workspace creator with complete control. Can do everything including managing members and changing roles.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 text-sm ml-4">
                <li>View all data (journal, positions, P&L, performance)</li>
                <li>Edit journal entries and daily P&L</li>
                <li>Manage broker connections</li>
                <li>Invite new members and manage permissions</li>
                <li>Change member roles or remove members</li>
                <li>Delete the workspace</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">⚙️ ADMIN - Management Access</h4>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Trusted team members who can manage workspace settings and invite others. Cannot change roles or remove members.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 text-sm ml-4">
                <li>View all data (journal, positions, P&L, performance)</li>
                <li>Edit journal entries and daily P&L</li>
                <li>Manage broker connections (add, edit, sync)</li>
                <li>Invite new members to the workspace</li>
                <li>Cannot change member roles or remove members</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">✏️ MEMBER - Edit Access</h4>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Can view and edit trading data but cannot manage workspace settings or invite others.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 text-sm ml-4">
                <li>View all data (journal, positions, P&L, performance)</li>
                <li>Create, edit, and delete journal entries</li>
                <li>Add and edit daily P&L records</li>
                <li>Cannot manage broker connections</li>
                <li>Cannot invite members or change permissions</li>
              </ul>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">👁️ VIEWER - Read-Only Access</h4>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                Can only view data, perfect for observers, auditors, or junior team members who are learning.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 text-sm ml-4">
                <li>View all data (journal, positions, P&L, performance)</li>
                <li>Export data to CSV</li>
                <li>Cannot create, edit, or delete anything</li>
                <li>Cannot manage connections or invite members</li>
                <li>Read-only banner displayed on pages</li>
              </ul>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">How to Share Your Workspace:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li>Navigate to <strong>Settings → Workspace</strong> in the sidebar</li>
            <li>Click the <strong>"Invite Member"</strong> button (available to ADMIN and OWNER roles)</li>
            <li>Enter the email address of the person you want to invite</li>
            <li>Select their permission level (VIEWER, MEMBER, or ADMIN)</li>
            <li>Click <strong>"Send Invitation"</strong> - an invitation link is generated</li>
            <li>Copy the invitation link and send it to the person via email or messaging</li>
            <li>They click the link, sign in (or create an account), and accept the invitation</li>
            <li>They now have access to your workspace with the specified permissions</li>
          </ol>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 Example Use Cases:</h4>

            <div className="space-y-4 mt-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100 mb-1">Family SaaS Scenario:</p>
                <p className="text-gray-700 dark:text-slate-300 text-sm">
                  Srinath has his workspace "Srinath Trading Account". He invites his brother Sridhar as a MEMBER so Sridhar can view
                  Srinath's trades and add journal notes when they discuss strategies together. Sridhar creates his own workspace
                  "Sridhar Trading Account" and invites Srinath as a VIEWER so Srinath can monitor performance but not make changes.
                </p>
              </div>

              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100 mb-1">Hedge Fund Manager Scenario:</p>
                <p className="text-gray-700 dark:text-slate-300 text-sm">
                  A hedge fund manager creates 5 workspaces: "Tech Portfolio", "Healthcare Portfolio", "Energy Portfolio", "Real Estate Portfolio", and "International Portfolio".
                  Each workspace has different team members:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-slate-300 text-sm ml-4 mt-2">
                  <li>Manager: OWNER on all 5 workspaces</li>
                  <li>Chief Analyst: ADMIN on all 5 workspaces (can invite sector specialists)</li>
                  <li>Senior Analyst (Tech specialist): MEMBER on Tech Portfolio, VIEWER on others</li>
                  <li>Junior Analyst: VIEWER on assigned portfolios (learning and observing)</li>
                </ul>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Managing Workspace Members:</h3>
          <p className="text-gray-700 dark:text-slate-300 mb-3">
            On the <strong>Settings → Workspace</strong> page, you'll see:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Current Members Table:</strong> All workspace members with their roles and when they joined</li>
            <li><strong>Change Roles (OWNER only):</strong> Click the role dropdown to promote/demote members (e.g., upgrade a MEMBER to ADMIN)</li>
            <li><strong>Remove Members (OWNER only):</strong> Click the remove button to revoke someone's access instantly</li>
            <li><strong>Pending Invitations:</strong> See all sent invitations that haven't been accepted yet</li>
            <li><strong>Copy Invitation Link:</strong> Re-send the invitation link if needed</li>
            <li><strong>Cancel Invitation:</strong> Revoke a pending invitation before it's accepted</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">Viewing Shared Workspaces:</h3>
          <p className="text-gray-700 dark:text-slate-300 mb-3">
            When you're invited to someone else's workspace, you'll see it in the workspace selector (top of sidebar):
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>"My Workspaces"</strong> section shows workspaces where you're the OWNER</li>
            <li><strong>"Shared With Me"</strong> section shows workspaces shared by others</li>
            <li>Each workspace shows your role badge (👑 OWNER, ⚙️ ADMIN, ✏️ MEMBER, 👁️ VIEWER)</li>
            <li>Switch between workspaces instantly using the dropdown</li>
          </ul>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">🔒 Security & Privacy:</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300">
              <li>Invitations expire after 7 days for security</li>
              <li>Members can only access workspaces they're explicitly invited to</li>
              <li>OWNER can remove anyone's access instantly</li>
              <li>All permission checks are enforced at the API level - UI restrictions cannot be bypassed</li>
              <li>Audit logs track who made what changes in the workspace</li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">⚡ Best Practices:</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>Start Conservative:</strong> Invite new members as VIEWER first, then promote based on trust and need</li>
              <li><strong>Limit ADMIN Roles:</strong> Only give ADMIN to people who truly need to manage settings and invite others</li>
              <li><strong>Regular Audits:</strong> Review the members list monthly and remove anyone who no longer needs access</li>
              <li><strong>Clear Communication:</strong> Let team members know their role and what they can/can't do</li>
              <li><strong>Use Multiple Workspaces:</strong> Don't put everything in one workspace - create separate workspaces for different portfolios or strategies</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800 mt-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">❓ Common Questions:</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">Q: Can I be a member of multiple workspaces?</p>
                <p className="text-gray-700 dark:text-slate-300">A: Yes! You can own multiple workspaces and be invited to others. Switch between them using the workspace selector.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">Q: What happens if I remove someone from my workspace?</p>
                <p className="text-gray-700 dark:text-slate-300">A: They immediately lose access to the workspace. The workspace disappears from their account.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">Q: Can members see each other?</p>
                <p className="text-gray-700 dark:text-slate-300">A: All members can see the full members list on the Workspace settings page, including names and roles.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">Q: Can I transfer workspace ownership?</p>
                <p className="text-gray-700 dark:text-slate-300">A: Currently, workspace ownership cannot be transferred. The OWNER role is permanent for the creator.</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">Q: Do VIEWERs see a different interface?</p>
                <p className="text-gray-700 dark:text-slate-300">A: VIEWERs see the same data but without edit buttons. A blue banner at the top reminds them they're in read-only mode.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analyst's Bench (AI) Section */}
      <section id="ai" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-violet-500 dark:border-violet-400 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">🤖 Analyst's Bench (AI)</h2>

          <p className="text-gray-700 dark:text-slate-300 mb-4">
            <strong>Analyst's Bench</strong> is your AI-powered trading assistant - think of it as having a professional analyst reviewing your trades,
            journal entries, and performance data 24/7. Ask questions in plain English, get insights about your trading patterns, and receive
            data-driven recommendations to improve your results.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">What the AI Can Do:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Performance Analysis:</strong> "What's my win rate in tech stocks vs. financials?"</li>
            <li><strong>Pattern Recognition:</strong> "Do I perform better on Mondays or Fridays?"</li>
            <li><strong>Risk Assessment:</strong> "Am I too concentrated in any single stock or sector?"</li>
            <li><strong>Trade Review:</strong> "Analyze my last 10 losing trades - what went wrong?"</li>
            <li><strong>Journal Insights:</strong> "What patterns appear in my journal entries before big losses?"</li>
            <li><strong>Strategy Suggestions:</strong> "Based on my trading history, when should I size up positions?"</li>
          </ul>

          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">💡 Example Conversations:</h4>

            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-3 rounded border-l-4 border-blue-500 dark:border-blue-400">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">You ask:</p>
                <p className="text-gray-700 dark:text-slate-300 italic">"What's my average P&L on days when I trade more than 5 times?"</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-2">AI responds:</p>
                <p className="text-gray-700 dark:text-slate-300">
                  "You've traded 5+ times on 23 days. Your average P&L on those days is -$287, compared to +$542 on days with 3-4 trades.
                  This suggests overtrading hurts your performance. Your best results come from 2-4 high-conviction trades per day."
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded border-l-4 border-green-500 dark:border-green-400">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">You ask:</p>
                <p className="text-gray-700 dark:text-slate-300 italic">"Which sectors have I been most profitable in over the last 3 months?"</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-2">AI responds:</p>
                <p className="text-gray-700 dark:text-slate-300">
                  "Top 3 sectors by profit: 1) Technology (+$18,450, 67% win rate), 2) Healthcare (+$5,230, 58% win rate),
                  3) Consumer Discretionary (+$3,120, 54% win rate). Your worst sector is Energy (-$4,850, 42% win rate).
                  Recommendation: Focus more capital on tech and healthcare where you have demonstrated edge."
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3 rounded border-l-4 border-purple-500 dark:border-purple-400">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">You ask:</p>
                <p className="text-gray-700 dark:text-slate-300 italic">"Analyze my discipline based on journal entries"</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-2">AI responds:</p>
                <p className="text-gray-700 dark:text-slate-300">
                  "Your journal shows strong discipline from Dec 1-10 (8 mentions of 'followed plan', 'stuck to stops').
                  However, Dec 11-13 entries mention 'FOMO', 'chased the move', and 'ignored stop loss' - these 3 days resulted in
                  -$2,340 combined loss. Pattern detected: You maintain discipline during calm markets but lose discipline during high volatility."
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">How to Use Effectively:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li><strong>Ask Specific Questions:</strong> Instead of "How am I doing?", ask "What's my win rate when I enter trades in the first 30 minutes?"</li>
            <li><strong>Request Comparisons:</strong> "Compare my December performance to November"</li>
            <li><strong>Seek Pattern Insights:</strong> "What emotions appear in my journal before losing streaks?"</li>
            <li><strong>Get Actionable Advice:</strong> "What 3 changes would improve my risk/reward ratio?"</li>
            <li><strong>Review Weekly:</strong> Ask "Summarize my trading week - wins, losses, and lessons learned"</li>
          </ol>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mt-6 mb-3">What the AI Analyzes:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300 mb-4">
            <li>All your trade history and P&L data</li>
            <li>Journal entries and tagged patterns</li>
            <li>Current positions and risk exposure</li>
            <li>Calendar patterns (day of week, time of day performance)</li>
            <li>Win/loss streaks and drawdown periods</li>
            <li>Correlation between journal sentiment and trading results</li>
          </ul>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">⚡ Pro Tip:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              Treat the AI like a trading coach. Schedule a weekly "coaching session" where you ask it to review your performance,
              identify mistakes, and suggest improvements. The AI is objective and data-driven - it won't sugarcoat bad habits or let you
              make excuses. Use it to hold yourself accountable.
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800 mt-4">
            <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">⚠️ Important Disclaimer:</h4>
            <p className="text-gray-700 dark:text-slate-300">
              The AI provides analysis and insights based on YOUR historical data. It does NOT provide trade recommendations, stock picks,
              or market predictions. It's a tool for self-analysis and pattern recognition, not a replacement for your own judgment and research.
              All trading decisions remain 100% your responsibility.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-gray-200 dark:border-slate-700 text-center">
        <p className="text-gray-600 dark:text-slate-400">
          Need more help? Questions or feedback?{" "}
          <a href="mailto:support@tiasas.com" className="text-blue-600 dark:text-gold-400 hover:text-blue-800 dark:hover:text-gold-300 underline">
            Contact Support
          </a>
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-500 mt-2">
          Last updated: December 2025 • TIASAS v1.2 • Added: Workspace Sharing & Role-Based Access Control
        </p>
      </div>
    </div>
  );
}
