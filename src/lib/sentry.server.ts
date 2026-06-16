import * as SentryNode from "@sentry/node";

const DSN = process.env.SENTRY_DSN || "";

/**
 * Initializes the Sentry Node SDK for server-side monitoring
 */
export function initSentry() {
  if (!DSN) {
    console.warn("[Sentry Server] SENTRY_DSN is missing. Node telemetry monitoring is inactive.");
    return;
  }

  try {
    SentryNode.init({
      dsn: DSN,
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV || "development",
    });
    console.log("[Sentry Server] SDK initialized successfully.");
  } catch (err) {
    console.error("[Sentry Server] Failed to initialize SDK:", err);
  }
}

/**
 * Captures an exception on the server and logs it to Sentry Node
 */
export function captureException(error: any, context?: Record<string, any>) {
  console.error("[Server Captured Exception]:", error, context);
  if (!DSN) return;

  try {
    SentryNode.captureException(error, { extra: context });
  } catch (err) {
    console.error("[Sentry Server] Error capturing exception:", err);
  }
}

/**
 * Captures a text message on the server and logs it to Sentry Node
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: Record<string, any>) {
  console.log(`[Server Captured Message - ${level}]:`, message, context);
  if (!DSN) return;

  try {
    SentryNode.captureMessage(message, { level: level as any, extra: context });
  } catch (err) {
    console.error("[Sentry Server] Error capturing message:", err);
  }
}
