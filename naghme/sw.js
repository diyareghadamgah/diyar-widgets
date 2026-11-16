/* نغمه — سرویس‌ورکر v2.3.34-fast (بهینه‌شده)
   - اضافه شدن همه فایل‌های جدید به SHELL (radio, iptv-web-controls, mode-shell, video, player-settings, iptv-native, native-player)
   - استراتژی cache-first برای فایل‌های استاتیک (بارگذاری سریع)
   - skipWaiting خودکار
*/
const VERSION = 'naghme-v2.3.34-fast';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'tags.js',
  'platform.js',
  'hls.min.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'favicon.png',
  'radio.js',
  'iptv-web-controls.js',
  'native-player.js',
  'iptv-native.js',
  'video.js',
  'player-settings.js',
  'mode-shell.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL).catch(err => console.warn('SW install partial fail:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  if (new URL(r.url).origin !== location.origin) return;
  const path = new URL(r.url).pathname;
  const isStatic = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot|m3u|m3u8|webmanifest)$/i.test(path)
    || path.endsWith('/') || path.endsWith('/index.html');

  if (isStatic) {
    e.respondWith(
      caches.match(r, { ignoreSearch: true }).then(cached => {
        if (cached) {
          // به‌روزرسانی پس‌زمینه
          fetch(r).then(res => { if (res && res.ok) caches.open(VERSION).then(c => c.put(r, res.clone())); }).catch(()=>{});
          return cached;
        }
        return fetch(r).then(res => {
          if (res && res.ok) caches.open(VERSION).then(c => c.put(r, res.clone()));
          return res;
        });
      }).catch(() => caches.match('index.html'))
    );
  } else {
    e.respondWith(
      fetch(r).then(res => {
        if (res && res.ok) caches.open(VERSION).then(c => c.put(r, res.clone()));
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
    );
  }
});
