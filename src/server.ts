import "./lib/error-capture";
import { initSentry, captureException } from "./lib/sentry.server";
initSentry();

import fs from "node:fs";
import path from "node:path";
import { prisma } from "./lib/db";
import { dbService } from "./lib/dbService";
import { logger } from "./lib/logger";
import { checkRateLimit } from "./lib/rateLimiter";
import { checkRateLimitTokenBucket } from "./lib/redis";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function injectSecurityHeaders(response: Response, requestUrl?: string): Response {
  const headers = new Headers(response.headers);

  // 1. Content Security Policy (Bunny Stream, Supabase, Google Fonts, Cloudflare friendly)
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https: wss:; frame-src 'self' https://iframe.mediadelivery.net https://*.mediadelivery.net; frame-ancestors 'none';",
  );

  // 2. Strict Transport Security
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // 3. X-Frame-Options DENY
  headers.set("X-Frame-Options", "DENY");

  // 4. X-Content-Type-Options nosniff
  headers.set("X-Content-Type-Options", "nosniff");

  // 5. Referrer Policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 6. Permissions Policy
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // 7. Cross-Origin Embedder/Opener/Resource Policies for Bunny Stream & compliance
  headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  // 7. Anti-Back Button Security Cache-Control Headers for Protected Routes
  if (requestUrl) {
    try {
      const urlObj = new URL(requestUrl);
      const path = urlObj.pathname;
      if (
        path.startsWith("/app") ||
        path.startsWith("/teacher") ||
        path.startsWith("/admin") ||
        path.startsWith("/super-admin")
      ) {
        headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
        headers.set("Pragma", "no-cache");
        headers.set("Expires", "0");
      }
    } catch {
      /* ignore */
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // --- SERVE PUBLIC PWA & STATIC ASSETS DIRECTLY ---
    const publicFiles = [
      "/manifest.json",
      "/sw.js",
      "/favicon.ico",
      "/favicon.png",
      "/apple-touch-icon.png",
      "/favicon-16x16.png",
      "/favicon-32x32.png",
      "/icon-192.png",
      "/icon-512.png",
      "/maskable-icon-512.png",
    ];

    const isPublicAsset =
      publicFiles.includes(url.pathname) ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/screenshots/");

    if (isPublicAsset) {
      try {
        const filePath = path.join(path.resolve("./public"), url.pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const fileBuffer = fs.readFileSync(filePath);
          let contentType = "application/octet-stream";
          
          if (url.pathname.endsWith(".json")) {
            contentType = "application/json; charset=utf-8";
          } else if (url.pathname.endsWith(".js")) {
            contentType = "application/javascript; charset=utf-8";
          } else if (url.pathname.endsWith(".ico")) {
            contentType = "image/x-icon";
          } else if (url.pathname.endsWith(".png")) {
            contentType = "image/png";
          } else if (url.pathname.endsWith(".html")) {
            contentType = "text/html; charset=utf-8";
          }

          return injectSecurityHeaders(
            new Response(fileBuffer, {
              status: 200,
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400",
              },
            }),
            request.url
          );
        }
      } catch (err) {
        console.error("Failed to serve public asset directly:", url.pathname, err);
      }
    }

    // --- CSRF DOUBLE-SUBMIT VERIFICATION ---
    if (request.method === "POST" || request.method === "PUT" || request.method === "DELETE") {
      const csrfCookie = getCookie(request, "altiora_csrf_token");
      const csrfHeader = request.headers.get("x-csrf-token");
      
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        logger.warn("SECURITY", `CSRF validation failed: cookie=${csrfCookie}, header=${csrfHeader} from IP=${ip}`);
        return injectSecurityHeaders(
          new Response(
            JSON.stringify({
              error: "ERR_CSRF: رمز الحماية (CSRF) غير صالح أو مفقود. يرجى إعادة تحميل الصفحة."
            }),
            {
              status: 403,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
              },
            }
          ),
          request.url
        );
      }
    }

    // --- RATE LIMITING MIDDLEWARE ---
    const isWhitelisted =
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "localhost" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.pathname === "/health";

    if (!isWhitelisted) {
      // 1. Global limit (100 requests per minute)
      const globalLimit = await checkRateLimitTokenBucket(`global_${ip}`, 100, 100 / 60);
      if (!globalLimit.success) {
        return injectSecurityHeaders(
          new Response(
            "لقد تجاوزت الحد الأقصى للطلبات المسموح بها. يرجى الانتظار دقيقة قبل المحاولة مجدداً. (Global Rate Limit)",
            {
              status: 429,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Retry-After": globalLimit.retryAfter.toString(),
              },
            },
          ),
          request.url,
        );
      }

      const serverFnId = url.searchParams.get("_serverFnId") || "";

      // 2. Login limit (10 attempts per minute)
      const isLoginRequest = url.pathname === "/login" || serverFnId.includes("loginServerFn");
      if (isLoginRequest) {
        const limitRes = await checkRateLimitTokenBucket(`login_${ip}`, 10, 10 / 60);
        if (!limitRes.success) {
          return injectSecurityHeaders(
            new Response(
              "تنبيه أمني: لقد تجاوزت الحد الأقصى لمحاولات تسجيل الدخول (10 محاولات في الدقيقة). يرجى الانتظار.",
              {
                status: 429,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8",
                  "Retry-After": limitRes.retryAfter.toString(),
                },
              },
            ),
            request.url,
          );
        }
      }

      // 3. Register limit (5 attempts per minute)
      const isRegisterRequest =
        url.pathname === "/register" || serverFnId.includes("registerServerFn");
      if (isRegisterRequest) {
        const limitRes = await checkRateLimitTokenBucket(`register_${ip}`, 5, 5 / 60);
        if (!limitRes.success) {
          return injectSecurityHeaders(
            new Response(
              "تنبيه أمني: لقد تجاوزت الحد الأقصى لإنشاء الحسابات (5 محاولات في الدقيقة). يرجى الانتظار.",
              {
                status: 429,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8",
                  "Retry-After": limitRes.retryAfter.toString(),
                },
              },
            ),
            request.url,
          );
        }
      }

      // 4. OTP / Verification limit (5 attempts per minute)
      const isOtpRequest = serverFnId.includes("verify") || serverFnId.includes("otp") || url.pathname.includes("otp");
      if (isOtpRequest) {
        const limitRes = await checkRateLimitTokenBucket(`otp_${ip}`, 5, 5 / 60);
        if (!limitRes.success) {
          return injectSecurityHeaders(
            new Response(
              "تنبيه أمني: لقد تجاوزت الحد الأقصى لمحاولات التحقق (5 محاولات في الدقيقة). يرجى الانتظار.",
              {
                status: 429,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8",
                  "Retry-After": limitRes.retryAfter.toString(),
                },
              },
            ),
            request.url,
          );
        }
      }

      // 5. Password Reset limit (5 attempts per minute)
      const isResetRequest = serverFnId.includes("resetPassword") || serverFnId.includes("forgotPassword") || url.pathname.includes("reset-password");
      if (isResetRequest) {
        const limitRes = await checkRateLimitTokenBucket(`reset_${ip}`, 5, 5 / 60);
        if (!limitRes.success) {
          return injectSecurityHeaders(
            new Response(
              "تنبيه أمني: لقد تجاوزت الحد الأقصى لطلب إعادة تعيين كلمة المرور (5 محاولات في الدقيقة). يرجى الانتظار.",
              {
                status: 429,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8",
                  "Retry-After": limitRes.retryAfter.toString(),
                },
              },
            ),
            request.url,
          );
        }
      }

      // 6. Checkout / Wallet limit (10 requests per minute)
      const isCheckoutRequest =
        url.pathname.startsWith("/app/wallet") ||
        serverFnId.includes("purchase") ||
        serverFnId.includes("redeem") ||
        serverFnId.includes("checkout");
      if (isCheckoutRequest) {
        const limitRes = await checkRateLimitTokenBucket(`checkout_${ip}`, 10, 10 / 60);
        if (!limitRes.success) {
          return injectSecurityHeaders(
            new Response(
              "تنبيه أمني: لقد تجاوزت الحد الأقصى لطلبات الدفع والشحن (10 محاولات في الدقيقة). يرجى الانتظار.",
              {
                status: 429,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8",
                  "Retry-After": limitRes.retryAfter.toString(),
                },
              },
            ),
            request.url,
          );
        }
      }

      // 7. Admin / Super Admin limit (30 requests per minute)
      const isAdminRequest =
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/super-admin") ||
        serverFnId.includes("admin") ||
        serverFnId.includes("superAdmin");
      if (isAdminRequest) {
        const limitRes = await checkRateLimitTokenBucket(`admin_${ip}`, 30, 30 / 60);
        if (!limitRes.success) {
          return injectSecurityHeaders(
            new Response(
              "تنبيه أمني: لقد تجاوزت الحد الأقصى للعمليات الإدارية (30 محاولة في الدقيقة).",
              {
                status: 429,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8",
                  "Retry-After": limitRes.retryAfter.toString(),
                },
              },
            ),
            request.url,
          );
        }
      }
    }

    // Handle health checks
    if (url.pathname === "/health") {
      let database = "healthy";
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        database = "unhealthy";
      }

      let storage = "healthy";
      try {
        const testDir = path.resolve("./private/uploads/health-test");
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        const testFile = path.join(testDir, "write_test.txt");
        fs.writeFileSync(testFile, "OK", "utf-8");
        fs.unlinkSync(testFile);
      } catch (err) {
        storage = "unhealthy";
      }

      const health = {
        database,
        storage,
        redis: "not_configured",
        uptime: process.uptime(),
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      };

      const isHealthy = database === "healthy" && storage === "healthy";
      const status = isHealthy ? 200 : 500;

      if (!isHealthy) {
        logger.critical(
          "SECURITY",
          `Health check failure: database=${database}, storage=${storage}`,
        );
      }

      return injectSecurityHeaders(
        new Response(JSON.stringify(health), {
          status,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }),
        request.url,
      );
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      const duration = Date.now() - startTime;

      // Log requests in non-blocking manner (ignoring static assets)
      if (
        !url.pathname.includes("/assets/") &&
        !url.pathname.includes("/_build/") &&
        !url.pathname.includes("favicon")
      ) {
        logger.info(
          "REQUEST",
          `${request.method} ${url.pathname} -> ${normalized.status} (${duration}ms)`,
          {
            method: request.method,
            path: url.pathname,
            status: normalized.status,
            durationMs: duration,
            ip,
            userAgent,
          },
        );
      }

      return injectSecurityHeaders(normalized, request.url);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.critical(
        "ERROR",
        `Uncaught server error on ${request.method} ${url.pathname}: ${(error as Error)?.message || error}`,
        {
          method: request.method,
          path: url.pathname,
          durationMs: duration,
          error: (error as Error)?.stack || String(error),
          ip,
          userAgent,
        },
      );

      captureException(error, {
        method: request.method,
        path: url.pathname,
        ip,
        userAgent,
        durationMs: duration,
      });

      return injectSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request.url,
      );
    }
  },
};
