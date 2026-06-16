import * as SentryReact from "@sentry/react";

const DSN = import.meta.env?.VITE_SENTRY_DSN || "";

/**
 * Initializes the Sentry React SDK for client-side monitoring
 */
export function initSentry() {
  if (!DSN) {
    return;
  }

  try {
    SentryReact.init({
      dsn: DSN,
      tracesSampleRate: 1.0,
      environment: import.meta.env.MODE || "development",
    });
    console.log("[Sentry Client] SDK initialized successfully.");
  } catch (err) {
    console.error("[Sentry Client] Failed to initialize SDK:", err);
  }
}

/**
 * Captures an exception on the client and logs it to Sentry React
 */
export function captureException(error: any, context?: Record<string, any>) {
  console.error("[Client Captured Exception]:", error, context);
  if (!DSN) return;

  try {
    SentryReact.captureException(error, { extra: context });
  } catch (err) {
    console.error("[Sentry Client] Error capturing exception:", err);
  }
}

/**
 * Captures a text message on the client and logs it to Sentry React
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: Record<string, any>) {
  console.log(`[Client Captured Message - ${level}]:`, message, context);
  if (!DSN) return;

  try {
    SentryReact.captureMessage(message, { level: level as any, extra: context });
  } catch (err) {
    console.error("[Sentry Client] Error capturing message:", err);
  }
}
