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

const OUTBOX_DB = "tapmenu-offline-orders";
function openOutbox() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OUTBOX_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("orders")) req.result.createObjectStore("orders", { keyPath: "clientKey" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function flushOrderOutbox() {
  const db = await openOutbox();
  const rows = await new Promise((resolve, reject) => {
    const req = db.transaction("orders", "readonly").objectStore("orders").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  for (const row of rows) {
    let response;
    try {
      response = await fetch("/api/public/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(row.payload), credentials: "same-origin" });
    } catch { return; }
    if (!response.ok && response.status >= 500) return;
    const data = await response.json().catch(() => ({}));
    const store = await openOutbox();
    await new Promise((resolve, reject) => {
      const tx = store.transaction("orders", "readwrite");
      tx.objectStore("orders").delete(row.clientKey);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    store.close();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (response.ok && data.token) {
      for (const client of clients) client.postMessage({ type: "TAPMENU_ORDER_SYNCED", clientKey: row.clientKey, token: data.token, orderNo: data.orderNo });
      if (self.registration.showNotification) await self.registration.showNotification("Your TapMenu order was sent", { body: data.orderNo ? `Order #${data.orderNo} is now with the restaurant.` : "The restaurant has received your order.", icon: "/icon.svg", data: { url: `/r/${row.payload.slug}/track/${data.token}` } });
    } else {
      for (const client of clients) client.postMessage({ type: "TAPMENU_ORDER_FAILED", clientKey: row.clientKey, message: data.error || "Saved order could not be sent." });
    }
  }
}
self.addEventListener("sync", (event) => { if (event.tag === "tapmenu-order-outbox") event.waitUntil(flushOrderOutbox()); });
self.addEventListener("message", (event) => { if (event.data?.type === "TAPMENU_FLUSH_ORDER_OUTBOX") event.waitUntil(flushOrderOutbox()); });
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "TapMenu update", { body: data.body || "There is new restaurant activity.", icon: "/icon.svg", data: { url: data.url || "/dashboard" }, tag: data.tag || "tapmenu-push" }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    if (existing) { existing.navigate(target); return existing.focus(); }
    return self.clients.openWindow(target);
  }));
});
