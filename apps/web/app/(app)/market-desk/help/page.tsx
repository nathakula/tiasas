import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center - TIASAS",
  description: "Learn how to use TIASAS Market Desk for trading and portfolio management",
};

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
        <p className="mt-2 text-gray-600">
          Your comprehensive guide to using TIASAS Market Desk for day trading and portfolio management.
        </p>
      </div>

      {/* Table of Contents */}
      <div className="mb-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <a href="#overview" className="text-blue-600 hover:text-blue-800 hover:underline">→ Overview</a>
          <a href="#journal" className="text-blue-600 hover:text-blue-800 hover:underline">→ Journal</a>
          <a href="#bulk-upload" className="text-blue-600 hover:text-blue-800 hover:underline">→ Bulk Upload</a>
          <a href="#calendar" className="text-blue-600 hover:text-blue-800 hover:underline">→ Calendar</a>
          <a href="#charts" className="text-blue-600 hover:text-blue-800 hover:underline">→ Charts</a>
          <a href="#brokerbridge" className="text-blue-600 hover:text-blue-800 hover:underline">→ BrokerBridge</a>
          <a href="#connections" className="text-blue-600 hover:text-blue-800 hover:underline">→ Connections</a>
          <a href="#positions" className="text-blue-600 hover:text-blue-800 hover:underline">→ Positions</a>
          <a href="#ai" className="text-blue-600 hover:text-blue-800 hover:underline">→ Analyst's Bench (AI)</a>
        </div>
      </div>

      {/* Overview Section */}
      <section id="overview" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-blue-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Overview</h2>

          <p className="text-gray-700 mb-4">
            The <strong>Overview</strong> page is your trading dashboard - your first stop each day to see the big picture of your trading performance.
            It provides a comprehensive snapshot of your P&L (Profit & Loss), recent trading activity, and market insights all in one place.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Daily P&L Summary:</strong> See today's realized and unrealized profit/loss at a glance</li>
            <li><strong>Monthly Performance:</strong> Track your month-to-date performance with Net Asset Value (NAV) charts</li>
            <li><strong>Recent Journal Entries:</strong> Quick access to your latest trading notes and reflections</li>
            <li><strong>Performance Metrics:</strong> View key statistics like win rate, average gain/loss, and total P&L</li>
          </ul>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Example Use Case:</h4>
            <p className="text-gray-700">
              Start your day by checking the Overview page. You immediately see you're up $2,450 for the day with 3 winning trades
              and 1 losing trade. Your monthly P&L shows +$15,230, putting you on track for your best month ever. Your latest journal
              entry reminds you to "stay disciplined on stop losses" - a note you made after yesterday's session.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Key Actions:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Monitor intraday performance without switching between multiple broker platforms</li>
            <li>Quickly assess if you're meeting your daily/monthly profit targets</li>
            <li>Review recent journal entries to maintain trading discipline</li>
          </ul>
        </div>
      </section>

      {/* Journal Section */}
      <section id="journal" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-green-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📝 Journal</h2>

          <p className="text-gray-700 mb-4">
            The <strong>Journal</strong> is your trading diary - a critical tool for improving your trading performance through reflection and
            pattern recognition. Document your thoughts, emotions, market observations, and trade rationale to build better trading habits.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Chronological Entries:</strong> All your journal entries listed by date, newest first</li>
            <li><strong>Search & Filter:</strong> Find specific entries by date, tags, or keywords</li>
            <li><strong>Tags System:</strong> Organize entries with custom tags like #winners, #mistakes, #strategy</li>
            <li><strong>Rich Text Editor:</strong> Write detailed notes with formatting, lists, and structure</li>
          </ul>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Example Entry:</h4>
            <div className="bg-white p-3 rounded border border-gray-300 text-sm">
              <p className="text-gray-600 text-xs mb-2">December 14, 2024 • Tags: #winning-trade #tech-stocks</p>
              <p className="text-gray-700 mb-2">
                <strong>Pre-Market Thoughts:</strong> Market showing strength, tech sector leading. Planning to watch NVDA for continuation pattern.
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Entry:</strong> Entered NVDA at $485.20, 200 shares at 10:15 AM. Stock broke resistance with strong volume.
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Management:</strong> Set stop at $483 (-0.45%). Target $490 (+1%). Stock moved quickly, hit target at 11:02 AM.
              </p>
              <p className="text-gray-700">
                <strong>Result:</strong> +$960 profit. Executed plan perfectly. Emotion: Confident but controlled.
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
            <li>Click "New Entry" to create a journal entry for today</li>
            <li>Write your pre-market thoughts, trade plans, or end-of-day reflections</li>
            <li>Add relevant tags to categorize the entry (e.g., #winners, #lessons-learned)</li>
            <li>Review past entries weekly to identify patterns in your trading behavior</li>
          </ol>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-2">⚡ Pro Tip:</h4>
            <p className="text-gray-700">
              Make journaling a non-negotiable habit. Write at least 2-3 entries per week: pre-market thoughts,
              post-trade analysis, and weekly reviews. The most successful traders are excellent journalers.
            </p>
          </div>
        </div>
      </section>

      {/* Bulk Upload Section */}
      <section id="bulk-upload" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-purple-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📤 Bulk Upload</h2>

          <p className="text-gray-700 mb-4">
            <strong>Bulk Upload</strong> allows you to import multiple journal entries at once from a CSV file. This is perfect for backfilling
            historical journal entries, migrating from another trading journal, or batch-importing weekly reflections.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>CSV Template:</strong> Download a template to see the required format</li>
            <li><strong>Drag & Drop Upload:</strong> Simply drag your CSV file into the upload zone</li>
            <li><strong>Preview Before Import:</strong> Review all entries before committing them to your journal</li>
            <li><strong>Validation:</strong> Automatic checking for required fields and date formats</li>
          </ul>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Example CSV Format:</h4>
            <div className="bg-white p-3 rounded border border-gray-300 font-mono text-xs overflow-x-auto">
              <pre>
{`date,text,tags
2024-12-10,"Great trading day. Focused on tech stocks. +$1,200 profit","#winning-day,#tech"
2024-12-11,"Overtraded. Need to be more selective. -$350","#mistakes,#discipline"
2024-12-12,"Flat day. Stayed patient, no trades. $0","#patience,#discipline"`}
              </pre>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
            <li>Download the CSV template by clicking "Download Template"</li>
            <li>Fill in your journal entries with dates, text, and tags (comma-separated)</li>
            <li>Save the file and drag it into the upload zone</li>
            <li>Review the preview to ensure all entries look correct</li>
            <li>Click "Import" to add all entries to your journal</li>
          </ol>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">📌 Best Practice:</h4>
            <p className="text-gray-700">
              Keep a "trading journal draft" document throughout the week. At week's end, copy your notes into the CSV template
              and bulk upload them. This workflow helps you maintain consistency without interrupting your trading day.
            </p>
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <section id="calendar" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-orange-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📅 Calendar</h2>

          <p className="text-gray-700 mb-4">
            The <strong>Calendar</strong> provides a visual timeline of your trading performance. See at a glance which days were profitable
            (green), which had losses (red), and identify patterns in your trading schedule. Perfect for spotting weekly or monthly patterns.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Monthly Calendar View:</strong> Full month display with P&L for each trading day</li>
            <li><strong>Color-Coded Days:</strong> Green for profit, red for loss, gray for no trades</li>
            <li><strong>Daily P&L Amounts:</strong> Hover over any day to see exact profit/loss numbers</li>
            <li><strong>Quick Navigation:</strong> Jump between months to analyze historical performance</li>
            <li><strong>Pattern Recognition:</strong> Identify which days of the week you perform best</li>
          </ul>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Example Insight:</h4>
            <p className="text-gray-700 mb-3">
              Looking at your December calendar, you notice:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li>Mondays are usually your best days (4 out of 5 green)</li>
              <li>Friday afternoons show consistent small losses</li>
              <li>You had 3 consecutive red days after Thanksgiving - emotional trading?</li>
              <li>Your best week was Dec 4-8 with 5 straight profitable days</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>Action:</strong> Adjust your strategy - trade more aggressively on Mondays, avoid Friday afternoon trades,
              and be extra cautious after holiday breaks.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Key Actions:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Click any day to see detailed trades and journal entries for that date</li>
            <li>Use month navigation arrows to review past performance</li>
            <li>Look for streaks - both winning and losing - to understand momentum</li>
            <li>Identify days you didn't trade to assess if you're taking enough breaks</li>
          </ul>
        </div>
      </section>

      {/* Charts Section */}
      <section id="charts" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-pink-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📈 Charts</h2>

          <p className="text-gray-700 mb-4">
            <strong>Charts</strong> transforms your raw trading data into visual insights. Track your equity curve, analyze P&L trends,
            compare realized vs. unrealized gains, and measure your progress toward trading goals. Data visualization makes patterns
            obvious that would be invisible in spreadsheets.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Equity Curve:</strong> Your account balance over time - the ultimate measure of success</li>
            <li><strong>Daily P&L Chart:</strong> Bar chart showing profit/loss for each trading day</li>
            <li><strong>Realized vs. Unrealized P&L:</strong> Separate lines tracking closed trades vs. open positions</li>
            <li><strong>Cumulative Returns:</strong> Your total percentage gain/loss since starting</li>
            <li><strong>Monthly Comparison:</strong> Compare current month performance to previous months</li>
            <li><strong>Win Rate Trends:</strong> Track your percentage of winning trades over time</li>
          </ul>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Example Analysis:</h4>
            <p className="text-gray-700 mb-3">
              Your Charts page reveals:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li><strong>Equity Curve:</strong> Steady upward trend from $100K to $125K over 6 months (+25%)</li>
              <li><strong>Daily P&L Pattern:</strong> Smaller wins ($500-1,000) and smaller losses ($200-400) - good risk management</li>
              <li><strong>Drawdown:</strong> Largest drawdown was only 3.2% in September - excellent risk control</li>
              <li><strong>Win Rate:</strong> Consistent 58-62% win rate - sustainable edge in the market</li>
              <li><strong>Recent Trend:</strong> Last 30 days show acceleration - equity curve steepening</li>
            </ul>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Chart Types Explained:</h3>
          <div className="space-y-3 text-gray-700">
            <div>
              <strong className="text-gray-900">Equity Curve:</strong> The line should generally trend upward for profitable trading.
              Flat periods are normal. Sharp drops indicate large losses or drawdowns to analyze.
            </div>
            <div>
              <strong className="text-gray-900">Daily P&L Bars:</strong> Green bars above zero are winning days, red bars below are losing days.
              Look for consistency - you want many small wins, few large losses.
            </div>
            <div>
              <strong className="text-gray-900">Unrealized P&L:</strong> Shows paper gains/losses on open positions.
              If this line is consistently high, you might be holding winners too long or not taking profits.
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
            <h4 className="font-semibold text-gray-900 mb-2">⚡ Pro Tip:</h4>
            <p className="text-gray-700">
              Check your charts weekly, not daily. Daily fluctuations create emotional noise. Weekly reviews let you see the actual trend
              and make rational adjustments to your strategy. Your equity curve is your report card - let it guide your decisions.
            </p>
          </div>
        </div>
      </section>

      {/* BrokerBridge Overview */}
      <section id="brokerbridge" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-indigo-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🌉 BrokerBridge</h2>

          <p className="text-gray-700 mb-4">
            <strong>BrokerBridge</strong> is the unified interface that connects all your brokerage accounts in one place. Whether you trade with
            TD Ameritrade, Interactive Brokers, E*TRADE, or manage positions via CSV imports, BrokerBridge consolidates everything into a single
            portfolio view. No more logging into multiple broker websites just to see your total exposure.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Why BrokerBridge Exists:</h3>
          <p className="text-gray-700 mb-4">
            As a day trader, you might use multiple brokers for different purposes - one for options, another for futures, a third for international stocks.
            BrokerBridge solves the critical problem: <strong>"What's my total exposure across ALL my accounts right now?"</strong>
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Key Capabilities:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Multi-Broker Aggregation:</strong> See positions from TD Ameritrade, E*TRADE, and CSV imports in one unified view</li>
            <li><strong>Real-Time Sync:</strong> Import latest positions with a single click (or automatic daily sync)</li>
            <li><strong>Concentration Risk Analysis:</strong> Identify if you're overexposed to a single stock, sector, or asset class</li>
            <li><strong>Cross-Account Strategy:</strong> Plan trades that balance risk across multiple accounts</li>
            <li><strong>CSV Import for Flexibility:</strong> Import positions from any broker via CSV export</li>
          </ul>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Real-World Example:</h4>
            <p className="text-gray-700">
              You're trading tech stocks across three brokers:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 my-2">
              <li>E*TRADE: 500 shares NVDA, 300 shares AAPL</li>
              <li>TD Ameritrade: 200 shares NVDA, 150 shares MSFT</li>
              <li>Interactive Brokers (CSV): 100 shares NVDA calls</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>Without BrokerBridge:</strong> You'd need to log into each platform separately, manually add up your NVDA exposure,
              and calculate total tech sector allocation.
            </p>
            <p className="text-gray-700 mt-2">
              <strong>With BrokerBridge:</strong> One screen shows you have $138,500 in NVDA across all accounts (23% of total portfolio)
              and 45% total tech exposure. You immediately see you're over-concentrated and should diversify.
            </p>
          </div>

          <p className="text-gray-700 mt-4">
            Continue reading below for detailed guides on <strong>Connections</strong> (linking your brokers) and <strong>Positions</strong> (viewing your aggregated portfolio).
          </p>
        </div>
      </section>

      {/* Connections Section */}
      <section id="connections" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-cyan-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔗 Connections</h2>

          <p className="text-gray-700 mb-4">
            The <strong>Connections</strong> page is where you link your brokerage accounts to TIASAS. Think of it as your "broker management center" -
            add connections, test them, sync positions, and manage credentials all in one place.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Connected Brokers List:</strong> All your linked brokerage accounts with status indicators</li>
            <li><strong>Add Connection Button:</strong> Link a new broker or import CSV positions</li>
            <li><strong>Sync Status:</strong> See when each account was last synced and if sync is in progress</li>
            <li><strong>Connection Health:</strong> Active (green), Error (red), or Pending (yellow) status badges</li>
            <li><strong>Manual Sync Controls:</strong> Force an immediate position sync for any connection</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">How to Add a Connection:</h3>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">Method 1: CSV Import (Recommended for Day Traders)</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Export your positions from your broker as CSV (most brokers have "Export to CSV" in the positions tab)</li>
              <li>Click "Add Connection" → "Import CSV"</li>
              <li>Drag and drop your CSV file (or click to browse)</li>
              <li>Preview the positions to ensure correct parsing</li>
              <li>Click "Import" - positions are saved instantly</li>
            </ol>
            <p className="text-gray-700 mt-3">
              <strong>Daily Workflow:</strong> Each morning (or end of day), export fresh CSV from your broker and drag it into TIASAS.
              Old positions are automatically replaced with the latest snapshot. Takes 30 seconds.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">Method 2: Direct API Connection</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Click "Add Connection" → Select your broker (TD Ameritrade, E*TRADE, etc.)</li>
              <li>Authenticate with your broker credentials via OAuth (secure, no password storage)</li>
              <li>Grant read-only access to positions and account data</li>
              <li>Click "Test Connection" to verify it works</li>
              <li>Enable "Auto Sync" to automatically update positions daily</li>
            </ol>
            <p className="text-gray-700 mt-3">
              <strong>Note:</strong> API connections provide real-time data but require broker API approval. CSV import is faster to set up.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Managing Connections:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Sync Now:</strong> Click the sync icon to immediately fetch latest positions</li>
            <li><strong>Edit Connection:</strong> Update credentials or re-upload CSV with new data</li>
            <li><strong>Delete Connection:</strong> Remove a broker connection and all associated positions</li>
            <li><strong>View Sync History:</strong> See log of all syncs, when they ran, and if they succeeded</li>
          </ul>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
            <h4 className="font-semibold text-gray-900 mb-2">📌 Security Note:</h4>
            <p className="text-gray-700">
              All broker credentials are encrypted with AES-256 encryption. API connections use OAuth (you never give TIASAS your password).
              CSV imports contain no credentials - just position data. Your trading accounts remain fully secure.
            </p>
          </div>
        </div>
      </section>

      {/* Positions Section */}
      <section id="positions" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-teal-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Positions</h2>

          <p className="text-gray-700 mb-4">
            The <strong>Positions</strong> page is your unified portfolio view - every stock, option, and security you own across ALL your
            brokerage accounts, displayed in one comprehensive table. This is where day traders answer critical questions like "What's my total NVDA
            exposure?" or "Am I overweight tech stocks?"
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What You'll Find:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>All Positions Table:</strong> Every position from every connected broker in one sortable table</li>
            <li><strong>Real-Time P&L:</strong> Unrealized profit/loss for each position, color-coded green (profit) or red (loss)</li>
            <li><strong>Position Details:</strong> Symbol, quantity, average cost, current price, market value, and total P&L</li>
            <li><strong>Broker Attribution:</strong> See which broker holds each position (important for multi-account traders)</li>
            <li><strong>Asset Class Breakdown:</strong> Filter by stocks, options, futures, or other security types</li>
            <li><strong>Search & Filter:</strong> Quickly find specific positions by symbol or filter by criteria</li>
            <li><strong>Concentration Analysis:</strong> Identify largest positions by dollar value or percentage of portfolio</li>
          </ul>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Example Scenario:</h4>
            <p className="text-gray-700 mb-3">
              You open the Positions page mid-day and see:
            </p>
            <div className="bg-white p-3 rounded border border-gray-300">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2">Symbol</th>
                    <th>Broker</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Avg Cost</th>
                    <th className="text-right">Current</th>
                    <th className="text-right">P&L</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b">
                    <td className="py-2 font-semibold">NVDA</td>
                    <td className="text-xs">E*TRADE</td>
                    <td className="text-right">500</td>
                    <td className="text-right">$485.20</td>
                    <td className="text-right">$492.35</td>
                    <td className="text-right text-green-600">+$3,575</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-semibold">NVDA</td>
                    <td className="text-xs">TD Ameritrade</td>
                    <td className="text-right">200</td>
                    <td className="text-right">$488.50</td>
                    <td className="text-right">$492.35</td>
                    <td className="text-right text-green-600">+$770</td>
                  </tr>
                  <tr className="border-b bg-yellow-50">
                    <td className="py-2 font-semibold">AAPL</td>
                    <td className="text-xs">E*TRADE</td>
                    <td className="text-right">300</td>
                    <td className="text-right">$185.30</td>
                    <td className="text-right">$182.15</td>
                    <td className="text-right text-red-600">-$945</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-700 mt-3">
              <strong>Key Insight:</strong> You have 700 total shares of NVDA across two brokers ($344,450 total position) - that's 34%
              of your portfolio! Might be time to take some profits and reduce concentration risk.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Key Actions on This Page:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Sort by P&L:</strong> Click column headers to see biggest winners or losers</li>
            <li><strong>Search Symbols:</strong> Type "AAPL" to quickly find all Apple positions</li>
            <li><strong>Filter by Broker:</strong> View only E*TRADE positions or only TD Ameritrade</li>
            <li><strong>Export to CSV:</strong> Download full position list for external analysis</li>
            <li><strong>Calculate Totals:</strong> See total portfolio value, total unrealized P&L, and total cost basis</li>
          </ul>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-2">⚡ Pro Tip for Day Traders:</h4>
            <p className="text-gray-700">
              Set a concentration limit rule - no single position over 20% of portfolio, no single sector over 40%. Check the Positions
              page before entering new trades to ensure you're not accidentally over-concentrating. This prevents "all eggs in one basket" blow-ups.
            </p>
          </div>
        </div>
      </section>

      {/* Analyst's Bench (AI) Section */}
      <section id="ai" className="mb-12 scroll-mt-6">
        <div className="border-l-4 border-violet-500 pl-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🤖 Analyst's Bench (AI)</h2>

          <p className="text-gray-700 mb-4">
            <strong>Analyst's Bench</strong> is your AI-powered trading assistant - think of it as having a professional analyst reviewing your trades,
            journal entries, and performance data 24/7. Ask questions in plain English, get insights about your trading patterns, and receive
            data-driven recommendations to improve your results.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What the AI Can Do:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Performance Analysis:</strong> "What's my win rate in tech stocks vs. financials?"</li>
            <li><strong>Pattern Recognition:</strong> "Do I perform better on Mondays or Fridays?"</li>
            <li><strong>Risk Assessment:</strong> "Am I too concentrated in any single stock or sector?"</li>
            <li><strong>Trade Review:</strong> "Analyze my last 10 losing trades - what went wrong?"</li>
            <li><strong>Journal Insights:</strong> "What patterns appear in my journal entries before big losses?"</li>
            <li><strong>Strategy Suggestions:</strong> "Based on my trading history, when should I size up positions?"</li>
          </ul>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Example Conversations:</h4>

            <div className="space-y-4">
              <div className="bg-white p-3 rounded border-l-4 border-blue-500">
                <p className="text-sm font-semibold text-gray-900">You ask:</p>
                <p className="text-gray-700 italic">"What's my average P&L on days when I trade more than 5 times?"</p>
                <p className="text-sm font-semibold text-gray-900 mt-2">AI responds:</p>
                <p className="text-gray-700">
                  "You've traded 5+ times on 23 days. Your average P&L on those days is -$287, compared to +$542 on days with 3-4 trades.
                  This suggests overtrading hurts your performance. Your best results come from 2-4 high-conviction trades per day."
                </p>
              </div>

              <div className="bg-white p-3 rounded border-l-4 border-green-500">
                <p className="text-sm font-semibold text-gray-900">You ask:</p>
                <p className="text-gray-700 italic">"Which sectors have I been most profitable in over the last 3 months?"</p>
                <p className="text-sm font-semibold text-gray-900 mt-2">AI responds:</p>
                <p className="text-gray-700">
                  "Top 3 sectors by profit: 1) Technology (+$18,450, 67% win rate), 2) Healthcare (+$5,230, 58% win rate),
                  3) Consumer Discretionary (+$3,120, 54% win rate). Your worst sector is Energy (-$4,850, 42% win rate).
                  Recommendation: Focus more capital on tech and healthcare where you have demonstrated edge."
                </p>
              </div>

              <div className="bg-white p-3 rounded border-l-4 border-purple-500">
                <p className="text-sm font-semibold text-gray-900">You ask:</p>
                <p className="text-gray-700 italic">"Analyze my discipline based on journal entries"</p>
                <p className="text-sm font-semibold text-gray-900 mt-2">AI responds:</p>
                <p className="text-gray-700">
                  "Your journal shows strong discipline from Dec 1-10 (8 mentions of 'followed plan', 'stuck to stops').
                  However, Dec 11-13 entries mention 'FOMO', 'chased the move', and 'ignored stop loss' - these 3 days resulted in
                  -$2,340 combined loss. Pattern detected: You maintain discipline during calm markets but lose discipline during high volatility."
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">How to Use Effectively:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
            <li><strong>Ask Specific Questions:</strong> Instead of "How am I doing?", ask "What's my win rate when I enter trades in the first 30 minutes?"</li>
            <li><strong>Request Comparisons:</strong> "Compare my December performance to November"</li>
            <li><strong>Seek Pattern Insights:</strong> "What emotions appear in my journal before losing streaks?"</li>
            <li><strong>Get Actionable Advice:</strong> "What 3 changes would improve my risk/reward ratio?"</li>
            <li><strong>Review Weekly:</strong> Ask "Summarize my trading week - wins, losses, and lessons learned"</li>
          </ol>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What the AI Analyzes:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li>All your trade history and P&L data</li>
            <li>Journal entries and tagged patterns</li>
            <li>Current positions and risk exposure</li>
            <li>Calendar patterns (day of week, time of day performance)</li>
            <li>Win/loss streaks and drawdown periods</li>
            <li>Correlation between journal sentiment and trading results</li>
          </ul>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-2">⚡ Pro Tip:</h4>
            <p className="text-gray-700">
              Treat the AI like a trading coach. Schedule a weekly "coaching session" where you ask it to review your performance,
              identify mistakes, and suggest improvements. The AI is objective and data-driven - it won't sugarcoat bad habits or let you
              make excuses. Use it to hold yourself accountable.
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-4">
            <h4 className="font-semibold text-gray-900 mb-2">⚠️ Important Disclaimer:</h4>
            <p className="text-gray-700">
              The AI provides analysis and insights based on YOUR historical data. It does NOT provide trade recommendations, stock picks,
              or market predictions. It's a tool for self-analysis and pattern recognition, not a replacement for your own judgment and research.
              All trading decisions remain 100% your responsibility.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-gray-200 text-center">
        <p className="text-gray-600">
          Need more help? Questions or feedback?{" "}
          <a href="mailto:support@tiasas.com" className="text-blue-600 hover:text-blue-800 underline">
            Contact Support
          </a>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Last updated: December 2024 • TIASAS v1.0
        </p>
      </div>
    </div>
  );
}
