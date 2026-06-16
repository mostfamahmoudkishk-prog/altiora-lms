# Sentry Application Error Monitoring Integration Report

This report outlines the design, initialization flow, and configuration implemented to enable full-stack application telemetry and error tracking using Sentry in Altiora.

---

## 1. Environment Configurations

All Sentry operations are securely driven by:
*   `SENTRY_DSN`: The unique client/server ingestion DSN endpoint (`https://3c4ff91525506f9a1cc83ace880d0955@o4511573338357760.ingest.us.sentry.io/4511573369683968`).
*   **Vite environment injection**: For browser compliance, client routes will dynamically detect this value.

---

## 2. Full-Stack Initialization Architecture

The [sentry.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/lib/sentry.ts) abstraction initializes the appropriate SDK depending on the execution context:

*   **Node.js Server Context**:
    *   Initializes `@sentry/node` on the server startup in `src/server.ts`.
    *   Traces transaction sample rate is configured to `1.0` (100% of events) for thorough tracking of API calls, auth transactions, and database query timings.
*   **React Browser Client Context**:
    *   Initializes `@sentry/react` inside the root TanStack router layout `src/routes/__root.tsx`.
    *   Monitors uncaught client runtime errors, network timeouts, and component loading failures.

---

## 3. Telemetry Ingestion API

The Sentry wrapper exposes:
*   `initSentry()`: Checks environmental DSN presence, maps environment labels (e.g. `production` vs `development`), and starts Sentry logs.
*   `captureException(error, context)`: Sends detailed stack traces and system context payloads (IP addresses, request URL paths, durations) to the Sentry dashboard.
*   `captureMessage(message, level, context)`: Logs system anomalies, warnings, and notifications that don't throw fatal errors.

---

## 4. Hooked Telemetry Touchpoints

1.  **Server Routing Middleware**: Global try/catch handler inside `src/server.ts` routes all uncaught exceptions directly to Sentry before rendering a 500 error page.
2.  **TanStack Router Boundaries**: Global error boundaries capture react lifecycle crashes and bundle mismatches, recording context parameters before presenting recovery options.
3.  **API Mutation Handlers**: Critical operations (e.g., checkout payments, database backups) record validation failures.
