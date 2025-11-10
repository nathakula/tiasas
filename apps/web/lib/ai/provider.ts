// OpenAI-compatible JSON helper with pluggable base URL/model
// Reads env: OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL

type JsonSchema = Record<string, any>;

export type ChatJsonParams = {
  system: string;
  user: string;
  model?: string;
  schema?: { name: string; schema: JsonSchema } | null;
  temperature?: number;
};

function buildChatUrl(baseUrlEnv?: string) {
  const base = (baseUrlEnv || "https://api.openai.com/v1").replace(/\/+$/, "");
  if (base.endsWith("/chat/completions") || base.endsWith("/responses")) return base;
  if (/\/v\d(\w+)?$/.test(base)) return base + "/chat/completions";
  return base + "/v1/chat/completions";
}

export async function chatJson<T = any>({ system, user, model, schema, temperature = 0.2 }: ChatJsonParams): Promise<T> {
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const mdl = model || process.env.OPENAI_MODEL || "gpt-4o-mini";

  const url = buildChatUrl(baseUrl);
  const body: any = {
    model: mdl,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
  };
  if (schema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: schema.name || "Result",
        schema: schema.schema,
        strict: true,
      },
    };
  } else {
    body.response_format = { type: "json_object" };
  }

  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  // Retry once without JSON schema if provider doesn't support it
  if (!res.ok && schema) {
    const errText = await res.text().catch(() => "");
    // Retry with json_object and a stronger instruction
    const fallbackBody = { ...body, response_format: { type: "json_object" }, messages: [
      { role: "system", content: (system || "") + "\nYou must return VALID JSON only." },
      { role: "user", content: user },
    ] };
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(fallbackBody),
    });
    if (!res.ok) throw new Error(`LLM error ${res.status}: ${errText}`);
  } else if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${errText}`);
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  return coerceJson<T>(content);
}

export function coerceJson<T = any>(text: string): T {
  try { return JSON.parse(text) as T; } catch {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) as T; } catch {}
  }
  throw new Error("LLM did not return valid JSON");
}
