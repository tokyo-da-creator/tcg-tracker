/* PokeSnipr service worker — offline cache + push notifications.
 * This file doubles as the OneSignal service worker when configured.
 * OneSignal requires the first line to import their SDK. */
try {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
} catch (_) { /* push notifications need OneSignal App ID configured */ }

const CACHE = "pokesnipr-v2";
const PRECACHE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/css/vault-theme.css",
  "/favicon.svg",
  "/icon-192.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(PRECACHE).catch(() => {})
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Only cache same-origin requests
  if (url.hostname !== self.location.hostname) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

// Push notification handler (fallback when OneSignal is not configured)
self.addEventListener("push", (e) => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch { data = { title: "PokeSnipr", body: e.data.text() }; }
  e.waitUntil(
    self.registration.showNotification(data.title || "PokeSnipr Alert", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/alerts.html" },
      tag: data.tag || "pokesnipr",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
