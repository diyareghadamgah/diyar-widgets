// نسخه را با هر تغییر مهم بالا ببرید تا کش قدیمی پاک شود
const CACHE = 'diyar-calendar-v3';
const CORE = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/registry.js', './js/shared.js', './js/app.js', './js/accordion.js',
  './js/templates/royal.js', './js/templates/classic.js', './js/templates/light.js',
  './js/templates/blackgold.js', './js/templates/ribbon.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // صفحه: اول شبکه (همیشه آخرین نسخه)، اگر آفلاین بود از کش
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // بقیه (فونت، jszip، qrcode): اول کش، بعد شبکه و ذخیره
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
      return r;
    }))
  );
});
