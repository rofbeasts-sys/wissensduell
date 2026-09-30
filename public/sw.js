/* Service Worker fuer Brain Pulse als installierbare PWA.
 *
 * Bewusst ZURUECKHALTEND: das Spiel aendert sich haeufig (neue Features,
 * Bugfixes) und der Server schickt HTML/JS deshalb schon mit "no-cache", um
 * NIE eine veraltete Version auszuliefern. Der Service Worker darf das nicht
 * unterlaufen - deshalb "network-first" fuer die Kernseite: online gibt es
 * IMMER die aktuelle Version vom Server, der Cache ist nur ein Auffangnetz
 * fuer den Fall, dass gerade keine Verbindung besteht (z.B. Funkloch).
 * API-Aufrufe, Audiodateien und WebSockets werden NIE abgefangen -
 * Live-Daten sollen immer echt vom Server kommen.
 */
const CACHE_NAME = "brain-pulse-shell-v1";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

function isAppShellRequest(url) {
  // Die Startseite selbst sowie das eine JS-Modul, das sie laedt.
  return url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/achievements.js";
}
function isStaticAsset(url) {
  return url.pathname.startsWith("/icons/") || url.pathname === "/manifest.json";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST (/api/...) nie abfangen
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fremde Herkunft: nicht anfassen

  // Alles andere (API, Audiodateien, Fragen-Datensaetze usw.) laeuft
  // unveraendert direkt zum Server - kein Eingriff, keine Zwischenspeicherung.
  if (!isAppShellRequest(url) && !isStaticAsset(url)) return;

  if (isAppShellRequest(url)) {
    // Network-first: online immer die frischeste Version, Cache nur als
    // Rueckfallebene ohne Verbindung.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Statische Icons/Manifest: cache-first (aendern sich praktisch nie),
  // Netzwerk nur als Nachladen beim allerersten Aufruf.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
