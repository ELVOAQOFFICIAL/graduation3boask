// In-memory rate limiter
// For production, replace with Redis (Upstash) for distributed rate limiting

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
let lastCleanupAt = 0;

function cleanupExpiredEntries(now: number) {
  // Run cleanup at most once per minute to avoid extra work on hot paths.
  if (now - lastCleanupAt < 60000) return;
  lastCleanupAt = now;

  store.forEach((entry, key) => {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  });
}

export function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  cleanupExpiredEntries(now);
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  }

  entry.count++;
  store.set(key, entry);

  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxAttempts - entry.count, resetAt: entry.resetAt };
}
