import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import type { DeepDiveResult } from "@/lib/ai/types";
import { chatJson } from "@/lib/ai/provider";
import { deepDivePrompt, systemGuard } from "@/lib/ai/prompts";

const Schema = z.object({ ticker: z.string().min(1), focus: z.string().optional() });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { ticker, focus } = parsed.data;
  const dataJson = { fundamentals: null, earnings: [], tech: {}, multiples: {}, comps: [] };
  try {
    const prompt = deepDivePrompt({ ticker, focus, dataJson });
    const schema = {
      name: "DeepDiveResult",
      schema: {
        type: "object",
        properties: {
          ticker: { type: "string" },
          overview: { type: "string" },
          recentResults: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
          technicalZones: {
            type: "object",
            properties: {
              supports: { type: "array", items: { type: "object", properties: { price: { type: "number" }, note: { type: "string" } }, required: ["price"], additionalProperties: true } },
              resistances: { type: "array", items: { type: "object", properties: { price: { type: "number" }, note: { type: "string" } }, required: ["price"], additionalProperties: true } },
              momentumNote: { type: "string" }
            },
            required: ["supports","resistances"],
          },
          valuationContext: { type: "string" },
          comps: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
          alternativeCases: { type: "array", items: { type: "string" } },
          checklist: { type: "array", items: { type: "string" } },
          sources: { type: "array", items: { type: "string" } },
          disclaimer: { type: "string" },
        },
        required: ["ticker","overview","technicalZones","valuationContext","risks","alternativeCases","checklist","disclaimer"],
        additionalProperties: true,
      },
    } as const;
    const out = await chatJson<DeepDiveResult>({ system: systemGuard, user: prompt, schema });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "LLM failed" }, { status: 500 });
  }
}
