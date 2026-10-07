const VERSION='diyar-player-v1.2.0';
const SHELL=[
  './','./index.html','./style.css','./script.js','./playlist.json','./manifest.json',
  './covers/default-cover.png','./covers/c.png','./assets/images/diyar-logo-source.png',
  './icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('diyar-player-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  const u=new URL(r.url);
  // Never cache media responses: Range requests must reach the network reliably.
  if(u.pathname.includes('/music/')){e.respondWith(fetch(r));return}
  e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(x=>x.put(r,cp))}return res}).catch(()=>caches.match('./index.html'))));
});
