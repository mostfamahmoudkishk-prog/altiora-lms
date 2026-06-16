const CACHE_NAME = "altiora-cache-v1";
const OFFLINE_URL = "/offline.html";

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/mogenix-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Listener for update skipWaiting message from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // CRITICAL: SERVICE WORKER SAFETY
  // Never cache authentication, session APIs, server actions/functions, Supabase database calls,
  // signed URLs, Bunny Stream iframes/videos, or dynamic pages/data.
  const isExcluded =
    url.pathname.includes("/_server") ||
    url.pathname.includes("/api/") ||
    url.hostname.includes("supabase") ||
    url.hostname.includes("mediadelivery.net") ||
    url.searchParams.has("token") ||
    url.searchParams.has("expires") ||
    url.pathname.startsWith("/app/exams") ||
    url.pathname.startsWith("/app/wallet") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/super-admin");

  if (isExcluded) {
    // Let network handle directly without touching the service worker cache
    return;
  }

  // Caching constraints: Cache ONLY static assets, images, fonts, CSS, and JS bundles.
  const isCacheable =
    url.pathname.includes("/assets/") ||
    url.pathname.includes("/_build/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ttf") ||
    url.pathname.endsWith(".otf") ||
    url.pathname === OFFLINE_URL ||
    url.pathname === "/favicon.png";

  if (!isCacheable) {
    // For general navigations and other files, go to network
    event.respondWith(
      fetch(event.request).catch(() => {
        // If navigation fails, return the offline fallback page
        if (event.request.mode === "navigate") {
          return caches.match(OFFLINE_URL);
        }
      }),
    );
    return;
  }

  // Stale-While-Revalidate only for static cacheable resources
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version immediately
        // Fetch new version in background to update cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            /* Ignore network errors offline */
          });

        return cachedResponse;
      }

      // Not in cache, fetch and store
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return default icons/fallback if offline
          if (event.request.destination === "image") {
            return caches.match("/favicon.png");
          }
        });
    }),
  );
});
