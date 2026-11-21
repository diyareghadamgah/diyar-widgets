/* Naghme PWA shell v2.3.35
   Increase VERSION when publishing a later web release.
*/
'use strict';
const VERSION = 'naghme-v2.3.53-web-iptv-cors-proxy-country-iceland-unified-tv-manager';;;
const SHELL = [
  './','index.html','style.css','app.js','tags.js','platform.js','folder-shortcuts.js','hls.min.js',
  'manifest.json','icon-192.png','icon-512.png','icon-maskable-512.png','favicon.png',
  'radio.js','iptv-web-controls.js','native-player.js','iptv-native.js',
  'video.js','player-settings.js','mode-shell.js','home-cards.webp','public-radio.m3u','data/iran.m3u','sources/nexa-persian.m3u'
];
const STATIC_FILE = /\.(?:js|css|png|jpe?g|svg|ico|woff2?|ttf|eot|webmanifest)$/i;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('naghme-') && key !== VERSION).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('message', event => { if (event.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try { const response = await fetch(request); if (response && response.ok) await cache.put(request, response.clone()); return response; }
      catch { return (await cache.match(request)) || (await cache.match('index.html')); }
    })());
    return;
  }
  if (STATIC_FILE.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }
  event.respondWith((async () => {
    try { return await fetch(request); }
    catch { const cache = await caches.open(VERSION); return (await cache.match(request, { ignoreSearch: true })) || new Response('Offline', { status: 503, statusText: 'Offline' }); }
  })());
});
