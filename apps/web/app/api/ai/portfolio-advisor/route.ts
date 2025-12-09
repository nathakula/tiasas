import { NextRequest, NextResponse } from "next/server";
import { getActiveOrgId } from "@/lib/org";
import Anthropic from "@anthropic-ai/sdk";
import { db as prisma } from "@/lib/db";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PortfolioContext {
  mode: "positions" | "recent_trades" | "no_data";
  positions: any[];
  recentTrades: any[];
  metrics: any;
  timestamp: string;
}

/**
 * Portfolio Advisor AI Chat
 * Context-aware AI that adapts responses based on user's current portfolio state
 */
export async function POST(req: NextRequest) {
  try {
    const orgId = await getActiveOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No active organization" }, { status: 401 });
    }

    const body = await req.json();
    const { message, context, history } = body as {
      message: string;
      context: PortfolioContext;
      history: Message[];
    };

    if (!message || !context) {
      return NextResponse.json({ error: "Missing message or context" }, { status: 400 });
    }

    // Get AI settings for this org
    const settings = await prisma.aiConfig.findUnique({
      where: { orgId },
    });

    if (!settings?.apiKey) {
      return NextResponse.json(
        { error: "AI not configured. Please add your API key in Settings." },
        { status: 400 }
      );
    }

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(context);

    // Build conversation history
    const conversationHistory: Anthropic.MessageParam[] = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add current user message
    conversationHistory.push({
      role: "user",
      content: message,
    });

    // Call Claude API with user's key
    const client = new Anthropic({
      apiKey: settings.apiKey,
    });

    const response = await client.messages.create({
      model: settings.model,
      max_tokens: 2048,
      temperature: Number(settings.temperature),
      system: systemPrompt,
      messages: conversationHistory,
    });

    const assistantMessage = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      response: assistantMessage,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error("Error in Portfolio Advisor:", error);
    return NextResponse.json(
      { error: "AI request failed", details: error.message },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(context: PortfolioContext): string {
  const basePrompt = `You are a professional trading advisor helping a trader analyze their portfolio and make informed decisions. Be concise, actionable, and data-driven in your responses.

**Current Portfolio Context:**
Mode: ${context.mode}
Timestamp: ${context.timestamp}

**Metrics:**
- MTD Realized P&L: $${context.metrics.mtdRealized.toLocaleString()}
- Current Unrealized P&L: $${context.metrics.currentUnrealized.toLocaleString()}
- Current Equity: ${context.metrics.currentEquity ? `$${context.metrics.currentEquity.toLocaleString()}` : "N/A"}
- Win Rate: ${context.metrics.winRate !== null ? `${context.metrics.winRate.toFixed(1)}%` : "N/A"}
- Sharpe Ratio: ${context.metrics.sharpeRatio !== null ? context.metrics.sharpeRatio.toFixed(2) : "N/A"}
`;

  if (context.mode === "positions") {
    const positionsDetail = context.positions
      .map(
        (p) =>
          `- ${p.symbol}: ${p.quantity} shares @ $${p.averagePrice.toFixed(2)} (Current: $${p.currentPrice.toFixed(2)}, P&L: ${p.unrealizedPnl >= 0 ? "+" : ""}$${p.unrealizedPnl.toFixed(2)} / ${p.unrealizedPnlPercent >= 0 ? "+" : ""}${p.unrealizedPnlPercent.toFixed(2)}%)`
      )
      .join("\n");

    return `${basePrompt}

**Current Positions (${context.positions.length}):**
${positionsDetail}

**Your Role:**
- Analyze the user's current positions and provide insights on risk, diversification, and opportunities
- Suggest specific actions (trim, hold, add) with clear reasoning
- Identify potential risks or overconcentration
- Recommend new opportunities that complement existing holdings
- Use technical and fundamental analysis when relevant
- Be specific and actionable in your recommendations
`;
  } else if (context.mode === "recent_trades") {
    const tradesDetail = context.recentTrades
      .slice(0, 10)
      .map(
        (t) =>
          `- ${new Date(t.date).toLocaleDateString()}: ${t.realizedPnl >= 0 ? "+" : ""}$${t.realizedPnl.toFixed(2)}${t.note ? ` (${t.note})` : ""}`
      )
      .join("\n");

    return `${basePrompt}

**Recent Trades (Last 30 Days - showing first 10):**
${tradesDetail}

**Your Role:**
- Analyze trading patterns and performance from recent history
- Identify what's working well and areas for improvement
- Suggest strategies to improve win rate and risk management
- Help find new trading opportunities based on past success patterns
- Provide feedback on trade sizing, timing, and execution
- Be constructive and specific in your analysis
`;
  } else {
    return `${basePrompt}

**Your Role:**
- Help the user build a watchlist and find trading opportunities
- Provide market analysis and identify interesting setups
- Suggest trading strategies appropriate for current market conditions
- Educate on risk management and position sizing
- Be proactive in suggesting actionable ideas
- Focus on practical, implementable strategies
`;
  }
}
