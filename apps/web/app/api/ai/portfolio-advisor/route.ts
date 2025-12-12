import { NextRequest, NextResponse } from "next/server";
import { getActiveOrgId } from "@/lib/org";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db as prisma } from "@/lib/db";

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
  // Store provider info outside try block for error handling
  let providerInfo = { provider: "unknown", model: "unknown" };

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

    // Store settings for error handling
    providerInfo = { provider: settings.provider || "unknown", model: settings.model || "unknown" };

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(context);

    let assistantMessage = "";
    let usage = { inputTokens: 0, outputTokens: 0 };

    // Call AI based on provider
    const provider = (settings.provider || "openai").toUpperCase();

    if (provider === "GEMINI") {
      // Use Google Generative AI (Gemini)
      const genAI = new GoogleGenerativeAI(settings.apiKey);
      const model = genAI.getGenerativeModel({ model: settings.model });

      // Build conversation history for Gemini
      const chatHistory = history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          temperature: Number(settings.temperature),
          maxOutputTokens: 2048,
        },
        systemInstruction: systemPrompt,
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      assistantMessage = response.text();

      // Gemini doesn't provide token counts in the same way
      usage = {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      };
    } else if (provider === "ANTHROPIC") {
      // Use Anthropic API (Claude)
      const client = new Anthropic({
        apiKey: settings.apiKey,
      });

      const conversationHistory: Anthropic.MessageParam[] = history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      conversationHistory.push({
        role: "user",
        content: message,
      });

      const response = await client.messages.create({
        model: settings.model,
        max_tokens: 2048,
        temperature: Number(settings.temperature),
        system: systemPrompt,
        messages: conversationHistory,
      });

      assistantMessage = response.content[0].type === "text" ? response.content[0].text : "";
      usage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } else {
      // Use OpenAI-compatible API (OpenAI, OpenRouter, Ollama, Custom)
      const client = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl || undefined,
      });

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...history.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: message },
      ];

      // Detect reasoning models (gpt-5*, o3*, o4*, gpt-4.1*) that require max_completion_tokens
      const modelName = settings.model.toLowerCase();
      const isReasoningModel =
        modelName.startsWith("gpt-5") ||
        modelName.startsWith("o3") ||
        modelName.startsWith("o4") ||
        modelName.startsWith("gpt-4.1");

      // Build request parameters based on model type
      const requestParams: any = {
        model: settings.model,
        messages,
        temperature: Number(settings.temperature),
      };

      // Reasoning models use max_completion_tokens, others use max_tokens
      // Reasoning models need MORE tokens since they use many for "thinking"
      if (isReasoningModel) {
        requestParams.max_completion_tokens = 10000; // Increased for reasoning + output
      } else {
        requestParams.max_tokens = 2048;
      }

      const response = await client.chat.completions.create(requestParams);

      // Debug logging
      console.log("OpenAI Response:", JSON.stringify(response, null, 2));
      console.log("Message content:", response.choices[0]?.message?.content);

      // For reasoning models, check if content is empty and finish_reason is "length"
      // This means the model used all tokens for reasoning and didn't produce output
      const messageContent = response.choices[0]?.message?.content || "";
      const finishReason = response.choices[0]?.finish_reason;

      if (!messageContent && finishReason === "length" && isReasoningModel) {
        // Reasoning model ran out of tokens - need to increase max_completion_tokens
        assistantMessage = "I apologize, but I need more tokens to provide a complete analysis. The reasoning model used all available tokens for thinking. Please try again with a simpler question, or contact support to increase the token limit.";
      } else {
        assistantMessage = messageContent;
      }

      usage = {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      };
    }

    return NextResponse.json({
      response: assistantMessage,
      usage,
    });
  } catch (error: any) {
    console.error("Error in Portfolio Advisor:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      provider: providerInfo?.provider,
      model: providerInfo?.model,
    });
    return NextResponse.json(
      {
        error: "AI request failed",
        details: error.message,
        provider: providerInfo?.provider,
        model: providerInfo?.model
      },
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
