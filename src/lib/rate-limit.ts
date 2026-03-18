/**
 * Simple in-memory rate limiter for API routes.
 * For production at scale, replace with Redis-backed solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60s to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000).unref();

interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  entry.count++;
  if (entry.count > config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/** Pre-configured rate limits for different route types */
export const RATE_LIMITS = {
  /** AI/LLM routes — expensive, rate limit aggressively */
  ai: { limit: 20, windowSeconds: 60 },
  /** Standard API reads */
  read: { limit: 120, windowSeconds: 60 },
  /** Mutations (POST/PATCH/DELETE) */
  write: { limit: 60, windowSeconds: 60 },
  /** Heavy operations (process, batch ingest) */
  heavy: { limit: 5, windowSeconds: 60 },
} as const;
