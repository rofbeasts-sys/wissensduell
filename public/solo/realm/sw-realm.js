/* Realm of Brain – schlanker Service Worker (nur damit Chrome die App anbietet; cached nichts) */
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(){});
