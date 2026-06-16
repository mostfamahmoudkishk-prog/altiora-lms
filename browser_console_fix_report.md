# Altiora LMS - Browser Console Fix Report

## 1. Root Causes & Fixes

### 1. manifest.json 401 Unauthorized / Fetch Failure
- **Root Cause**: The static file router in `src/server.ts` looked for public files only under `./public` relative to the current working directory. On Vercel deployments, the current directory structure is nested within `.output/server`, and the static files are uploaded to different directories or served directly by Vercel edge/CDN. When the file request fell through, TanStack Start treated it as a page request, triggering authentication checks and returning a `401 Unauthorized` response to the service worker and browser.
- **Fix**: Refactored the asset route handler in [server.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/server.ts) to check multiple possible fallback directories recursively (including local public, process.cwd(), Vercel's `.output/public`, and `/var/task/public`). The file is now read and served with standard headers, bypassing routing middleware, and returning a `200 OK` status.

### 2. Service Worker scheme 'chrome-extension' is unsupported
- **Root Cause**: The service worker (`sw.js`) fetch listener was intercepting all `GET` requests, including those triggered by browser extensions (e.g., Chrome, Edge, and Firefox extensions) starting with `chrome-extension://`, `moz-extension://`, etc. Running `cache.put()` on these unsupported schemes caused browser exceptions.
- **Fix**: Refactored [sw.js](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/public/sw.js) to only intercept and cache requests starting with `http://` or `https://`. In addition, all cache operations (`cache.put`, `caches.open`, `caches.keys`, etc.) were wrapped in try-catch blocks and promise `.catch()` handlers to guarantee that the service worker never crashes the client session.

### 3. [Sentry Client] VITE_SENTRY_DSN is missing warning
- **Root Cause**: If Sentry's DSN environment variable (`VITE_SENTRY_DSN` or `SENTRY_DSN`) was missing, the Sentry initializer was explicitly running `console.warn`, polluting the developer console.
- **Fix**: Modified [sentry.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%85%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/lib/sentry.ts) and [sentry.server.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%85%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/lib/sentry.server.ts) to return silently without logs or warnings if the DSN variable is not present. Sentry now disables itself gracefully.

### 4. <meta name="apple-mobile-web-app-capable"> is deprecated
- **Root Cause**: The root layout was specifying deprecated iOS-specific meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`), which triggered browser warnings.
- **Fix**: Replaced the deprecated tags with the standard `<meta name="mobile-web-app-capable" content="yes">` inside [__root.tsx](file:///d:/%D9%85%D8%B5%D8%B7%D9%85%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/routes/__root.tsx).

---

## 2. Files Modified
- **[server.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/server.ts)**: Static asset resolver fallback.
- **[sw.js](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/public/sw.js)**: Filter out extension schemes and wrap cache operations in try-catch blocks.
- **[sentry.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/lib/sentry.ts)**: Removed missing client DSN warning.
- **[sentry.server.ts](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/lib/sentry.server.ts)**: Removed missing server DSN warning.
- **[__root.tsx](file:///d:/%D9%85%D8%B5%D8%B7%D9%81%D9%89/altiora-path-forward-main/altiora-path-forward-main/src/routes/__root.tsx)**: Replaced deprecated Apple meta tags with `mobile-web-app-capable`.

---

## 3. Final QA Status
- **TypeScript Verification (`npx tsc --noEmit`)**: Passes successfully with **0 errors**.
- **Production Build (`npm run build`)**: Compiles successfully with a fully optimized package.
- **Console Warnings / Errors**: Cleared.
- **Sentry Status**: Disables itself gracefully without printing warnings.
- **PWA Registry & Offline Cache**: Fully operational.
