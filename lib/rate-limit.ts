// Fixed-window rate limiter kept in process memory.
//
// Limits apply per server instance: on a single Node server that is exact, but on serverless
// or multi-instance hosting each instance counts separately. Callers only use `rateLimit()`,
// so moving to a shared store (Redis/Upstash) later is a change to this file alone.

interface Entry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

const globalForLimiter = globalThis as unknown as { rateLimitStore?: Map<string, Entry> };
const store = (globalForLimiter.rateLimitStore ??= new Map<string, Entry>());

const MAX_TRACKED_KEYS = 10_000;

function prune(now: number) {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
  // Still too big after dropping expired keys: drop the oldest so memory stays bounded.
  while (store.size > MAX_TRACKED_KEYS) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > MAX_TRACKED_KEYS) prune(now);
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

// Behind a trusted proxy/CDN (Vercel, Cloudflare) the first x-forwarded-for entry is the client.
// Without one (local dev) every request shares the "unknown" bucket.
export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
