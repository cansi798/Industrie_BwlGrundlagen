// Service Worker: speichert App und alle Fragen für die Offline-Nutzung.
// Änderungen kommen beim nächsten Öffnen an (stale-while-revalidate).
// CACHE erhöhen, wenn Dateien hinzukommen oder wegfallen und nach jedem
// neuen Auslesen der Fragen (tools/extract.py) – dann lädt jedes Gerät beim
// nächsten Start alle Fragen neu, auch Sessions, die es selten öffnet.
const CACHE = "m094-v6";

const APP = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/app.js",
  "js/lib/quiz.js",
  "js/lib/store.js",
  "js/lib/data.js",
  "js/lib/dom.js",
  "js/lib/frage.js",
  "js/lib/farben.js",
  "js/views/start.js",
  "js/views/session.js",
  "js/views/pruefung-setup.js",
  "js/views/pruefung.js",
  "js/views/ergebnis.js",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "data/index.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP);
    const index = await (await cache.match("data/index.json")).json();
    const dateien = index.teile.flatMap((t) => t.tage.flatMap((d) => d.sessions.map((s) => s.datei)));
    await cache.addAll(dateien);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Stale-while-revalidate: sofort aus dem Cache, im Hintergrund aktualisieren.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    const network = fetch(event.request).then((res) => {
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    });
    if (cached) {
      event.waitUntil(network.catch(() => {}));
      return cached;
    }
    return network;
  })());
});
