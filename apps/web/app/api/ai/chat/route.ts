import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { db as prisma } from "@/lib/db";
import { getSnapshot } from "@tiasas/core/src/market/yahoo";
import { rateLimit } from "@tiasas/core/src/ratelimit";

const MessageSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
    })),
    ticker: z.string().optional(), // Optional ticker for context
});

export async function POST(req: Request) {
    const auth = await requireAuthOrgMembership();
    if ("error" in auth) return auth.error;
    const { orgId, session } = auth as any;

    // Rate limit: 30 messages per minute
    const rl = rateLimit(`ai:chat:${session.user.email}`, 30, 60000);
    if (!rl.ok) return NextResponse.json({ error: "Rate limited. Please try again in a minute." }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const parsed = MessageSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { messages, ticker } = parsed.data;

    // Get AI config from DB or env
    const config = await prisma.aiConfig.findUnique({ where: { orgId } });
    const baseUrl = config?.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
    const model = config?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
    const temperature = config?.temperature ?? 0.3;

    if (!apiKey) {
        return NextResponse.json({ error: "No API key configured. Go to Settings → AI Configuration." }, { status: 400 });
    }

    // Fetch market data if ticker provided
    let marketContext = "";
    if (ticker) {
        const snap = await getSnapshot(ticker).catch(() => null);
        if (snap?.quote) {
            const q = snap.quote as any;
            marketContext = `
Current market data for ${ticker}:
- Price: $${q.regularMarketPrice ?? q.last ?? "N/A"}
- Change: ${q.regularMarketChangePercent?.toFixed(2) ?? "N/A"}%
- 52-week range: $${q.fiftyTwoWeekLow ?? "N/A"} - $${q.fiftyTwoWeekHigh ?? "N/A"}
- Previous close: $${q.regularMarketPreviousClose ?? q.previousClose ?? "N/A"}
- Volume: ${q.regularMarketVolume?.toLocaleString() ?? "N/A"}
- PE Ratio: ${q.trailingPE ?? q.forwardPE ?? "N/A"}
`;
        }
    }

    const systemPrompt = `You are a skilled market analyst assistant helping a trader with research and analysis.

Your capabilities include:
- Technical analysis (support/resistance, trends, patterns)
- Fundamental analysis (valuation, earnings, growth)
- Options strategies and what-if scenarios
- Risk/reward analysis
- Entry/exit point recommendations

Always provide specific price levels when discussing entry/exit points.
When analyzing options, calculate break-even prices and max profit/loss.
Keep responses focused and actionable.

${marketContext}

End every response with a brief disclaimer that this is for research purposes only and not investment advice.`;

    try {
        const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...messages,
                ],
            }),
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return NextResponse.json({ error: `AI error: ${res.status} - ${errText.slice(0, 200)}` }, { status: 500 });
        }

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content ?? "No response from AI.";

        return NextResponse.json({
            role: "assistant",
            content,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "AI request failed" }, { status: 500 });
    }
}
