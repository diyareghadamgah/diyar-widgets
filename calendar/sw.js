// نسخه را با هر تغییر مهم بالا ببرید تا کش قدیمی پاک شود
const CACHE = 'diyar-calendar-v19';
const CORE = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/registry.js', './js/events.js', './js/vendor/jszip.min.js', './js/shared.js', './js/themed.js', './js/app.js', './js/accordion.js',
  './js/templates/royal.js', './js/templates/nightsky.js', './js/templates/turquoise.js', './js/templates/rosegold.js',
  './js/templates/occasions/ramadan.js', './js/templates/occasions/muharram.js', './js/templates/occasions/eid.js', './js/templates/occasions/ghadir.js', './js/templates/occasions/shaban15.js', './js/templates/occasions/milad.js', './js/templates/occasions/shahadat.js', './js/templates/occasions/fatemiyeh.js', './js/templates/occasions/qadr.js', './js/templates/occasions/jome.js', './js/templates/occasions/nowruz.js', './js/templates/occasions/yalda.js', './js/templates/occasions/melli.js', './js/templates/occasions/mothersday.js', './js/templates/occasions/fathersday.js', './js/templates/classic.js', './js/templates/light.js',
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
