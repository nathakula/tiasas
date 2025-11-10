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

export async function chatJson<T = any>({ system, user, model, schema, temperature = 0.2 }: ChatJsonParams): Promise<T> {
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const mdl = model || process.env.OPENAI_MODEL || "gpt-4o-mini";

  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
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

