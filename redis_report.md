# Upstash Redis Protection & Caching Integration Report

This report outlines the design, implementation, and operational integration of Upstash Redis for distributed rate limiting and cache layering in Altiora.

---

## 1. Environment Configurations

All Redis connection parameters are securely loaded from system environment variables:
*   `UPSTASH_REDIS_REST_URL`: The secure HTTPS endpoint hosted by Upstash (`https://settled-silkworm-88693.upstash.io`).
*   `UPSTASH_REDIS_REST_TOKEN`: The bearer token used to authenticate commands.

---

## 2. API Design & Zero-Dependency Client

The client [redis.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/lib/redis.ts) is implemented using native `fetch` POST requests:
*   **Performance**: Extremely lightweight REST interface, avoiding the need for native socket connections (TCP/TLS) or heavy thick clients.
*   **Fail-Open High Availability**: If Redis experiences an outage, all rate-limiting and caching operations catch the error and fail-open. This ensures that the main website remains fully operational even during external service outages.

---

## 3. Distributed Rate Limiting (Token Bucket Algorithm)

Instead of basic static counters, we implemented a distributed **Token Bucket algorithm**:
*   **Capacity ($C$)**: The maximum burst allowance of requests.
*   **Refill Rate ($R$)**: The rate at which tokens are added back to the bucket (calculated in fractions of tokens per second).
*   **State Tracking**: Each IP is allocated two keys:
    1.  `rate_limit:<key>:tokens`: Current token count.
    2.  `rate_limit:<key>:last`: Timestamp of last request.
*   **Math Formulation**: On every request, the number of refilled tokens is calculated:
    $$\text{currentTokens} = \min(C, \text{tokens} + (T_{\text{now}} - T_{\text{last}}) \times R)$$
    If $\text{currentTokens} \geq 1$, the request is permitted, and the state is decremented and saved. Otherwise, a 429 response is returned with a calculated `Retry-After` header.

### Protected API Gateways

| Endpoint Type | Key Signature | Capacity | Refill Rate | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Global Limit** | `global_<ip>` | 100 | 1.67 / sec | Protects overall site traffic from abuse |
| **Login Gate** | `login_<ip>` | 10 | 0.167 / sec | Mitigates brute-force credential stuffing |
| **Register Gate** | `register_<ip>` | 5 | 0.083 / sec | Prevents spam registration bots |
| **OTP Verification** | `otp_<ip>` | 5 | 0.083 / sec | Secures OTP verification attempts |
| **Password Reset** | `reset_<ip>` | 5 | 0.083 / sec | Prevents password reset loop abuse |
| **Checkout / Wallet**| `checkout_<ip>` | 10 | 0.167 / sec | Secures payment creations and wallet reloads |

---

## 4. Cache Layer Mappings

We added cache layering to speed up database response times:
1.  **Public Course Listings (`public_courses_list`)**:
    *   *Operation*: Cached inside `getCoursesFn` for **300 seconds (5 minutes)**.
    *   *Invalidation*: Cache is immediately purged on mutations (`createCourseFn`, `updateCourseFn`, `softDeleteCourseFn`).
2.  **Dashboard Statistics (`dashboard_stats`)**:
    *   *Operation*: Cached inside `getDashboardStatsFn` for **60 seconds (1 minute)** to prevent heavy count aggregates on Postgres.
