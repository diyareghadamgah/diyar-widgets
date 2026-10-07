const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `music-player-${CACHE_VERSION}`;
const BASE = new URL('./', self.location).pathname;
const STATIC_ASSETS = [
  'index.html', 'style.css', 'script.js', 'playlist.json', 'manifest.json', 'covers/c.png',
  'icons/icon-192.png', 'icons/icon-512.png'
].map(path => new URL(path, self.location).toString());

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('music-player-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Range requests must stay network-first; caching partial 206 responses can break seeking.
  if (request.headers.has('range')) return;

  const isAudio = url.pathname.startsWith(`${BASE}music/`);
  const isImage = url.pathname.startsWith(`${BASE}covers/`);
  const isAppShell = url.pathname.startsWith(BASE);

  if (isAudio || isImage) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  if (isAppShell) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(response => {
          if (response.ok && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
