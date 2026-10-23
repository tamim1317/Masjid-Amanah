/**
 * Simple in-process rate limiter for API routes.
 * NOT a substitute for edge/WAF rate limiting in production.
 * Verified only within a single Node process; multi-instance deployments
 * need Redis / edge rate limits (documented as remaining risk).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(input.key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return { ok: true };
  }

  if (bucket.count >= input.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true };
}

/** Test helper */
export function _resetRateLimitForTests(): void {
  buckets.clear();
}
