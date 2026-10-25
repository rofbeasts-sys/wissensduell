// Minimaler Service Worker nur fuer die Installierbarkeit der Admin-App. Cached nichts (Live-Daten).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
