// Single source of truth for cache version. Bump this on every deploy that
// ships breaking SW changes — `activate` then clears every cache whose key
// doesn't include this version. Closes BUG-080: previously three independent
// constants meant bumping one would leave the others stale.
const SW_VERSION = "v2";
const STATIC_CACHE = `gympro-static-${SW_VERSION}`;
const DYNAMIC_CACHE = `gympro-dynamic-${SW_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip Convex API calls (they handle their own caching)
  if (url.hostname.includes("convex.cloud") || url.pathname.includes("/api/")) {
    return;
  }

  // Static assets: cache-first
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
      }),
    );
    return;
  }

  // HTML pages: network-first with cache fallback
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match("/");
          });
        }),
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    }),
  );
});

// Background sync for offline mutations
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(syncPendingMutations());
  }
});

async function syncPendingMutations() {
  // Convex handles offline mutations automatically via its client SDK
  // This is a placeholder for any additional sync logic if needed
  console.log("[SW] Background sync triggered");
}

// Push notifications. Closes BUG-026: a malformed push payload used to throw
// inside this listener and (silently) prevent the SW from handling any
// subsequent pushes. Try/catch + text() fallback ensures we always surface
// SOMETHING and never crash the SW.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    if (event.data) {
      try {
        data = event.data.json();
      } catch {
        // Non-JSON payload — fall back to plain text body.
        data = { body: event.data.text?.() || "Time for your workout!" };
      }
    }
  } catch (err) {
    console.error("[SW] push event payload parse failed", err);
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "GymPro", {
      body: data.body || "Time for your workout!",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/icon-72x72.png",
      vibrate: [200, 100, 200],
      tag: data.tag || "gympro-notification",
      data: { url: data.url || "/user/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/user/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if none exists
      return self.clients.openWindow(url);
    }),
  );
});
