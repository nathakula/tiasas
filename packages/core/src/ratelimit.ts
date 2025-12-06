type Key = string;

const windowMs = 60_000; // 1 minute
const maxPerWindow = 60; // simple defaults

const buckets: Map<Key, { count: number; resetAt: number }> = new Map();

export function rateLimit(key: Key, max: number = maxPerWindow, windowMsOverride?: number) {
  const now = Date.now();
  const w = windowMsOverride ?? windowMs;
  const rec = buckets.get(key);
  if (!rec || rec.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + w });
    return { ok: true } as const;
  }
  if (rec.count >= max) return { ok: false, retryAfter: rec.resetAt - now } as const;
  rec.count++;
  return { ok: true } as const;
}
