// In-memory fixed-window rate limiter for production api security.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { success: boolean; retryAfter: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // New window or expired record
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true, retryAfter: 0 };
  }

  if (record.count >= limit) {
    return {
      success: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000), // in seconds
    };
  }

  record.count++;
  return { success: true, retryAfter: 0 };
}
