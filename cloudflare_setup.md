# Cloudflare CDN + WAF Setup Guide for Altiora

This guide details the Cloudflare settings required to optimize performance (CDN caching) and secure the platform (WAF rules) in production.

---

## 1. Cloudflare CDN Cache Rules

Navigate to **Caching** > **Cache Rules** and define the following rules:

### Rule A: Cache Static Assets (High Performance)

- **Match**:
  `(http.request.uri.path starts_with "/assets/") or (http.request.uri.path starts_with "/_build/") or (http.request.uri.path.extension in {"css" "js" "png" "jpg" "jpeg" "webp" "svg" "ico" "woff" "woff2" "ttf" "otf"})`
- **Action**: Cache everything.
- **Edge TTL**: 1 Month
- **Browser TTL**: 1 Year (Browser Cache TTL: 31,536,000 seconds)

### Rule B: Bypass Cache for Sensitive Endpoints (Critical Safety)

- **Match**:
  `(http.request.uri.path in {"/login" "/register" "/health"}) or (http.request.uri.path starts_with "/_server") or (http.request.uri.path starts_with "/api/") or (http.request.uri.path starts_with "/app/wallet") or (http.request.uri.path starts_with "/app/exams") or (http.request.uri.path starts_with "/admin") or (http.request.uri.path starts_with "/super-admin") or (http.request.uri.query contains "token") or (http.request.uri.query contains "expires")`
- **Action**: Bypass cache (dynamic requests).
- **Browser TTL**: Bypass cache / No cache.

---

## 2. Cloudflare Network & Speed Settings

To maximize Core Web Vitals, enable the following features under **Speed** > **Optimization** and **Network**:

- **Brotli & Gzip Compression**: Enable Brotli compression to compress static text responses.
- **HTTP/2 & HTTP/3 (with QUIC)**: Enable both protocols under Network settings to decrease latency and enable multiplexing.
- **0-RTT Connection Resumption**: Enabled (reduces connection times for returning visitors).
- **IPv6 Compatibility**: Enabled.
- **WebSockets**: Enabled (required for any future LiveKit or real-time communications).

---

## 3. Cloudflare WAF & Rate Limiting Rules

Navigate to **Security** > **WAF** > **Rate Limiting Rules** to secure sensitive entry points.

### Rule 1: Login Rate Limit

- **Request URL**: `(http.request.uri.path eq "/login") or (http.request.uri.path eq "/_server" and http.request.body.mime eq "application/json" and http.request.uri.query contains "loginServerFn")`
- **Rate Limit**: Max 10 requests per 1 minute.
- **Action**: Block / Challenge (JS Challenge).

### Rule 2: Registration Rate Limit

- **Request URL**: `(http.request.uri.path eq "/register") or (http.request.uri.path eq "/_server" and http.request.body.mime eq "application/json" and http.request.uri.query contains "registerServerFn")`
- **Rate Limit**: Max 5 requests per 1 minute.
- **Action**: Block / Challenge.

### Rule 3: Wallet / Checkout Rate Limit

- **Request URL**: `(http.request.uri.path starts_with "/app/wallet") or (http.request.uri.path eq "/_server" and http.request.body.mime eq "application/json" and (http.request.uri.query contains "purchase" or http.request.uri.query contains "redeem" or http.request.uri.query contains "checkout"))`
- **Rate Limit**: Max 10 requests per 1 minute.
- **Action**: Block.

### Rule 4: Admin API Rate Limit

- **Request URL**: `(http.request.uri.path starts_with "/admin") or (http.request.uri.path starts_with "/super-admin")`
- **Rate Limit**: Max 30 requests per 1 minute.
- **Action**: Block.

### Rule 5: Global API Rate Limit

- **Request URL**: `(http.request.uri.path starts_with "/")`
- **Rate Limit**: Max 100 requests per 1 minute.
- **Action**: Block / Challenge.
- **Exclusion (IP Access Rules)**: Whitelist office IPs or developer source IPs if needed.

---

## 4. Managed WAF Rules (DDoS / SQLi / XSS Protection)

Under **Security** > **WAF** > **Managed Rules**:

1. Enable **Cloudflare Managed Ruleset** (blocks common OWASP Top 10 vulnerabilities including SQL Injection, Cross-Site Scripting, and Local File Inclusion).
2. Enable **Cloudflare OWASP Core Ruleset** (sets security level to Medium to filter malicious bot crawling and brute-forcing bots).
3. Set **DDoS Protection** to Default (detects and mitigates layer 7 HTTP floods automatically).
