/**
 * In-memory sliding-window rate limiter (per server instance). PRD §9.3: 100 req/min per user,
 * 1000 req/min per IP. Good enough for a single Node process; swap for Redis when scaling out.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const since = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > since);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= since)) buckets.delete(k);
    }
  }
  return true;
}

export function resetRateLimits() {
  buckets.clear();
}

export const LIMITS = {
  perUserPerMinute: 100,
  perIpPerMinute: 1000,
  authPerIpPerMinute: 10,
} as const;
