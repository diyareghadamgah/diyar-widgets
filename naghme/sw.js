/* نغمه — سرویس‌ورکر بهبودیافته v2.3.7-direct-section-navigation-fast
   تغییرات:
   - اضافه شدن همه فایل‌های جدید (mode-shell, video, player-settings, iptv-native, native-player) به SHELL
   - استراتژی cache-first برای فایل‌های ثابت (بارگذاری سریع)
   - skipWaiting خودکار (به‌روزرسانی فوری)
   - حفظ نام نسخه قبلی برای سازگاری
*/
const VERSION = 'naghme-v2.3.9-illustrated-home-preserve-web';

const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'tags.js',
  'platform.js',
  'hls.min.js',
  'native-player.js',
  'iptv-native.js',
  'video.js',
  'player-settings.js',
  'mode-shell.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'favicon.png'
];

// نصب: کش کردن فایل‌های ثابت + فعال‌سازی فوری
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL).catch(err => {
        console.warn('SW: some files failed to cache:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// فعال‌سازی: پاک کردن کش‌های قدیمی
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skip') self.skipWaiting();
});

// استراتژی fetch:
// - فایل‌های استاتیک → cache-first (سریع، بعد به‌روزرسانی در پس‌زمینه)
// - بقیه → network-first
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  if (new URL(r.url).origin !== location.origin) return;

  const url = new URL(r.url);
  const path = url.pathname;
  const isStatic = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot|m3u|m3u8|webmanifest)$/i.test(path)
    || path.endsWith('/')
    || path.endsWith('/index.html');

  if (isStatic) {
    // Cache-first: از کش سرو کن، در پس‌زمینه به‌روزرسانی کن
    e.respondWith(
      caches.match(r, { ignoreSearch: true }).then(cached => {
        if (cached) {
          // به‌روزرسانی در پس‌زمینه (بدون بلاک کردن)
          fetch(r).then(res => {
            if (res && res.ok) caches.open(VERSION).then(c => c.put(r, res.clone()));
          }).catch(() => {});
          return cached;
        }
        return fetch(r).then(res => {
          if (res && res.ok) caches.open(VERSION).then(c => c.put(r, res.clone()));
          return res;
        });
      }).catch(() => caches.match('index.html'))
    );
  } else {
    // Network-first برای داده‌های پویا
    e.respondWith(
      fetch(r).then(res => {
        if (res && res.ok) caches.open(VERSION).then(c => c.put(r, res.clone()));
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
    );
  }
});
