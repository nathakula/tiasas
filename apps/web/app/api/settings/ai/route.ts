
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { db as prisma } from "@/lib/db";

const UpdateSchema = z.object({
    provider: z.enum(["openai", "anthropic", "gemini", "openrouter", "ollama", "custom"]).optional(),
    baseUrl: z.string().optional(), // Allow any string for flexibility (some providers don't use URLs)
    apiKey: z.string().optional(),
    model: z.string().min(1).optional(),
    temperature: z.number().min(0).max(2).optional(),
});

// GET: Fetch current AI configuration
export async function GET() {
    const auth = await requireAuthOrgMembership();
    if ("error" in auth) return auth.error;
    const { orgId } = auth;

    const config = await prisma.aiConfig.findUnique({
        where: { orgId },
        select: {
            provider: true,
            baseUrl: true,
            model: true,
            temperature: true,
            // Never expose API key in response
            apiKey: false,
        },
    });

    // Return defaults if no config exists
    if (!config) {
        return NextResponse.json({
            provider: "openai",
            baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0.2,
            hasApiKey: !!process.env.OPENAI_API_KEY,
        });
    }

    return NextResponse.json({
        ...config,
        hasApiKey: !!config || !!process.env.OPENAI_API_KEY,
    });
}

// PUT: Update AI configuration
export async function PUT(req: Request) {
    const auth = await requireAuthOrgMembership();
    if ("error" in auth) return auth.error;
    const { orgId } = auth;

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const config = await prisma.aiConfig.upsert({
        where: { orgId },
        create: {
            orgId,
            provider: data.provider || "openai",
            baseUrl: data.baseUrl || "https://api.openai.com/v1",
            apiKey: data.apiKey || null,
            model: data.model || "gpt-4o-mini",
            temperature: data.temperature ?? 0.2,
        },
        update: {
            ...(data.provider && { provider: data.provider }),
            ...(data.baseUrl && { baseUrl: data.baseUrl }),
            ...(data.apiKey !== undefined && { apiKey: data.apiKey || null }),
            ...(data.model && { model: data.model }),
            ...(data.temperature !== undefined && { temperature: data.temperature }),
        },
        select: {
            provider: true,
            baseUrl: true,
            model: true,
            temperature: true,
        },
    });

    return NextResponse.json(config);
}

// POST: Test connection
export async function POST(req: Request) {
    const auth = await requireAuthOrgMembership();
    if ("error" in auth) return auth.error;
    const { orgId } = auth;

    const body = await req.json().catch(() => ({}));
    const { baseUrl, apiKey, model, provider } = body;

    // Get from DB or use provided values
    const config = await prisma.aiConfig.findUnique({ where: { orgId } });
    const testProvider = provider || config?.provider || "openai";
    const testUrl = baseUrl || config?.baseUrl || "https://api.openai.com/v1";
    const testKey = apiKey || config?.apiKey || process.env.OPENAI_API_KEY;
    const testModel = model || config?.model || "gpt-4o-mini";

    if (!testKey) {
        return NextResponse.json({ success: false, error: "No API key configured" }, { status: 400 });
    }

    try {
        // Test based on provider
        if (testProvider === "gemini") {
            // For Gemini, test with the generative language API
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${testModel}?key=${testKey}`;
            const res = await fetch(url, { method: "GET" });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                return NextResponse.json({
                    success: false,
                    error: `Gemini API returned ${res.status}: ${text.slice(0, 200)}`
                });
            }
            return NextResponse.json({ success: true, message: "Connection successful" });
        } else if (testProvider === "anthropic") {
            // For Anthropic, test with a simple messages request
            const url = "https://api.anthropic.com/v1/messages";
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": testKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: testModel,
                    max_tokens: 10,
                    messages: [{ role: "user", content: "test" }],
                }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                return NextResponse.json({
                    success: false,
                    error: `Anthropic API returned ${res.status}: ${text.slice(0, 200)}`
                });
            }
            return NextResponse.json({ success: true, message: "Connection successful" });
        } else {
            // For OpenAI-compatible APIs (OpenAI, OpenRouter, Ollama, Custom)
            const url = testUrl.replace(/\/$/, "") + "/models";
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${testKey}`,
                },
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                return NextResponse.json({
                    success: false,
                    error: `API returned ${res.status}: ${text.slice(0, 200)}`
                });
            }
            return NextResponse.json({ success: true, message: "Connection successful" });
        }
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || "Connection failed" });
    }
}
