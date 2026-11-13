/* نغمه — سرویس‌ورکر. برای انتشار نسخه‌ی جدید، VERSION را تغییر دهید. */
const VERSION='naghme-v2.3.4-iptv-quality',SHELL=['./','index.html','style.css','app.js','tags.js','platform.js','hls.min.js','manifest.json','icon-192.png','icon-512.png','icon-maskable-512.png','favicon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL))));   // عمداً skipWaiting خودکار نداریم: به‌روزرسانی با تأیید کاربر
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting()});
/* شبکه‌اول (همیشه جدیدترین فایل‌ها)، در نبود اینترنت از کش */
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))))});
