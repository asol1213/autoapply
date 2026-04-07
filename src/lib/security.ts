/**
 * Simple in-memory rate limiter and input sanitizer.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request from the given IP is within rate limits.
 * @param ip - The client IP address
 * @param maxRequests - Maximum requests allowed in the window (default: 60)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns { allowed: boolean; remaining: number; resetAt: number }
 */
export function rateLimit(
  ip: string,
  maxRequests = 60,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count += 1;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Strip HTML tags from a string to prevent XSS in stored data.
 */
export function sanitize(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize all string values in an object (shallow, one level deep).
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === "string") {
      (result as Record<string, unknown>)[key] = sanitize(result[key] as string);
    }
  }
  return result;
}
