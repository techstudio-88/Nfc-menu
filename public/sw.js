/* TapMenu service worker: instant repeat loads + graceful offline screen. API calls are never cached. */
const VERSION = "tapmenu-v1";
const OFFLINE = "/offline.html";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(caches.open(VERSION).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { c.put(req, r.clone()); return r; })));
    return;
  }
  if (req.mode === "navigate") e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
});
