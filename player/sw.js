const VERSION='diyar-player-v1.3.0';
const SHELL=[
  './','./index.html','./style.css','./script.js','./playlist.json','./manifest.json',
  './covers/default-cover.png','./covers/c.png','./assets/images/diyar-logo-source.png',
  './icons/icon-192.png','./icons/icon-512.png'
];

self.addEventListener('install',e=>
  e.waitUntil(
    caches.open(VERSION)
      .then(c=>c.addAll(SHELL))
      .then(()=>self.skipWaiting())
  )
);

self.addEventListener('activate',e=>
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k.startsWith('diyar-player-')&&k!==VERSION)
            .map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  )
);

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;

  const u=new URL(r.url);

  // Media files must keep network/Range support.
  if(u.pathname.includes('/music/')){
    e.respondWith(fetch(r));
    return;
  }

  // Always prefer the latest playlist, with cached fallback for offline use.
  if(u.pathname.endsWith('/playlist.json')){
    e.respondWith(
      fetch(r,{cache:'no-store'})
        .then(res=>{
          if(res.ok){
            const cp=res.clone();
            caches.open(VERSION).then(c=>c.put(r,cp));
          }
          return res;
        })
        .catch(()=>caches.match(r))
    );
    return;
  }

  e.respondWith(
    caches.match(r)
      .then(c=>c||fetch(r).then(res=>{
        if(res.ok){
          const cp=res.clone();
          caches.open(VERSION).then(x=>x.put(r,cp));
        }
        return res;
      }).catch(()=>caches.match('./index.html')))
  );
});
