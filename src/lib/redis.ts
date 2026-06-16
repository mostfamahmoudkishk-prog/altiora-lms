/**
 * Upstash Redis Service Client
 */

/**
 * Executes a raw command on the Upstash Redis REST API
 */
export async function execRedisCommand(args: (string | number)[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[Redis] Credentials not configured. Command was bypassed.");
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      console.error(`[Redis] Upstash API Error: ${await response.text()}`);
      return null;
    }

    const data: any = await response.json();
    return data.result;
  } catch (error) {
    console.error("[Redis] Failed to connect to Upstash Redis:", error);
    return null;
  }
}

/**
 * Token Bucket Rate Limiter
 * 
 * Capacity: Maximum burst allowance.
 * RefillRatePerSecond: Speed at which tokens are added back.
 */
export async function checkRateLimitTokenBucket(
  key: string,
  capacity: number,
  refillRatePerSecond: number
): Promise<{ success: boolean; retryAfter: number }> {
  const now = Math.floor(Date.now() / 1000);
  const tokensKey = `rate_limit:${key}:tokens`;
  const lastKey = `rate_limit:${key}:last`;

  try {
    const [tokensVal, lastVal] = await Promise.all([
      execRedisCommand(["GET", tokensKey]),
      execRedisCommand(["GET", lastKey]),
    ]);

    let tokens = tokensVal !== null ? parseFloat(tokensVal) : capacity;
    const lastUpdated = lastVal !== null ? parseInt(lastVal, 10) : now;

    // Calculate refill amount based on time elapsed
    const elapsed = Math.max(0, now - lastUpdated);
    const refill = elapsed * refillRatePerSecond;
    let currentTokens = Math.min(capacity, tokens + refill);

    if (currentTokens >= 1) {
      currentTokens -= 1;

      // Persist new token state
      await Promise.all([
        execRedisCommand(["SET", tokensKey, currentTokens, "EX", 86400]),
        execRedisCommand(["SET", lastKey, now, "EX", 86400]),
      ]);

      return { success: true, retryAfter: 0 };
    } else {
      // Bucket is empty, calculate seconds until next token is available
      const retryAfter = Math.ceil((1 - currentTokens) / refillRatePerSecond);
      return { success: false, retryAfter };
    }
  } catch (error) {
    console.error("[Redis Rate Limit] Error processing rate limit:", error);
    // Fail-open for high availability: allow request if Redis goes down
    return { success: true, retryAfter: 0 };
  }
}

/**
 * Retrieves cached data from Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await execRedisCommand(["GET", `cache:${key}`]);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error(`[Redis Cache] GET failed for key ${key}:`, error);
    return null;
  }
}

/**
 * Sets cached data in Redis with a custom TTL (Time-To-Live)
 */
export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  try {
    await execRedisCommand(["SET", `cache:${key}`, JSON.stringify(value), "EX", ttlSeconds]);
  } catch (error) {
    console.error(`[Redis Cache] SET failed for key ${key}:`, error);
  }
}

/**
 * Deletes cached data from Redis
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await execRedisCommand(["DEL", `cache:${key}`]);
  } catch (error) {
    console.error(`[Redis Cache] DEL failed for key ${key}:`, error);
  }
}
