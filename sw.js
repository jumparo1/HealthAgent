const CACHE = 'ha-v3';
const SHELL = ['./', 'manifest.json', 'firebase-sync.js'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetched = fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return response;
      }).catch(function() { return cached; });
      return cached || fetched;
    })
  );
});
