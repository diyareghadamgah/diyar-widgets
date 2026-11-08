'use strict';
const $=s=>document.querySelector(s),au=$('#au');
const fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>{s=Math.max(0,s|0);return fa(Math.floor(s/60)+':'+String(s%60).padStart(2,'0'))};
const MB=b=>fa((b/1048576).toFixed(b>1e9?0:1))+' مگابایت';
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2600)};
/* ---------- IndexedDB ---------- */
const db=new Promise((res,rej)=>{const r=indexedDB.open('naghme',2);r.onupgradeneeded=()=>{const d=r.result;for(const n of ['songs','covers'])if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:'id'});if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('blocked'))});
const tx=async(st,m,f)=>{const d=await db;return new Promise((res,rej)=>{const t=d.transaction(st,m);let q;try{q=f(t.objectStore(st))}catch(e){t.abort();return rej(e)}t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('abort'))})};
const kvGet=k=>tx('kv','readonly',s=>s.get(k)),kvSet=(k,v)=>tx('kv','readwrite',s=>s.put(v,k)).catch(e=>console.warn('kvSet',k,e));
const putMany=a=>tx('songs','readwrite',s=>{a.forEach(x=>s.put(x))}),delSong=id=>tx('songs','readwrite',s=>s.delete(id)),putCovers=a=>tx('covers','readwrite',s=>{a.forEach(x=>s.put(x))});
const replaceSongs=a=>tx('songs','readwrite',s=>{s.clear();a.forEach(x=>s.put(x))});
const delCovers=ids=>tx('covers','readwrite',s=>{ids.forEach(i=>s.delete(i))});

/* ---------- State ---------- */
const DEF_PATS='حلیه,حلیة,المتقین,halyat,quran,قرآن,voice,recorder,recording,ضبط,پیام صوتی,PTT';
const S={songs:[],map:new Map(),files:new Map(),covers:new Map(),pl:[],imgs:{},hist:[],listen:0,q:[],qi:-1,shuffle:false,rep:0,view:{t:'home'},filter:'all',sort:'title',lim:100,dups:new Set(),eq:{on:true,p:'Normal',g:[0,0,0,0,0],pre:1,bal:0},cfg:{conc:3,skip:true,pats:DEF_PATS,min:0},scan:null,counted:false,pos:null,resume:null,loadedId:null};
const ctx={main:[],pop:[]};
const reidx=()=>S.map=new Map(S.songs.map(s=>[s.id,s]));
const cu=new Map();
const blobURL=(k,b)=>{let u=cu.get(k);if(!u){u=URL.createObjectURL(b);cu.set(k,u)}return u};
const freeURLs=keep=>{for(const [k,u] of [...cu]){if(!keep.has(k)){URL.revokeObjectURL(u);cu.delete(k)}}};   // آزادسازی URLهای موقت در هر رندر
const hue=t=>[...String(t)].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
const ph=(t,g)=>`<div class="cv ph" style="--h:${hue(t)}">${esc(g)}</div>`;
const cov=(s)=>{const b=s&&s.cid&&S.covers.get(s.cid);return b?`<img class="cv" loading="lazy" alt="" src="${blobURL('c:'+s.cid,b)}">`:ph(s?s.title:'','♪')};
const aimg=n=>S.imgs[n]?`<img class="cv" loading="lazy" alt="" src="${blobURL('a:'+n,S.imgs[n])}">`:ph(n,[...String(n)][0]||'؟');   // تصویر هنرمند هرگز از کاور آلبوم گرفته نمی‌شود
const anyCov=a=>a.find(s=>s.cid&&S.covers.has(s.cid))||a[0];
const hash53=u=>{let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<u.length;i++){const c=u[i];h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (4294967296*(2097151&h2)+(h1>>>0)).toString(36)};
const coverId=async b=>b.size.toString(36)+'-'+hash53(new Uint8Array(await b.arrayBuffer()));   // کاورهای یکسان فقط یک‌بار ذخیره می‌شوند
async function thumb(b){try{if(!window.createImageBitmap)return b.size<6e5?b:null;const bm=await createImageBitmap(b);const w=Math.min(300,bm.width),h=Math.max(1,Math.round(bm.height*w/bm.width));const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#1c1c1c';x.fillRect(0,0,w,h);x.drawImage(bm,0,0,w,h);bm.close&&bm.close();return await new Promise(r=>c.toBlob(r,'image/jpeg',.85))}catch{return null}}
const probe=f=>new Promise(r=>{const a=new Audio(),u=URL.createObjectURL(f);const done=v=>{clearTimeout(tm);a.onloadedmetadata=a.onerror=null;a.removeAttribute('src');a.load();URL.revokeObjectURL(u);r(v)};const tm=setTimeout(()=>done(null),8000);a.preload='metadata';a.onloadedmetadata=()=>done(isFinite(a.duration)?a.duration:0);a.onerror=()=>done(null);a.src=u});
/* ---------- Scan ---------- */
const EXT=/\.(mp3|m4a|aac|flac|ogg|opus|wav|wma)$/i;
const pats=()=>S.cfg.skip?S.cfg.pats.split(/[,،\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean):[];
function prepare(list){const P=pats(),q=[];let skipped=0,noext=0;
 for(const f of list){if(!EXT.test(f.name)){noext++;continue}const p=(f.webkitRelativePath||f.name).toLowerCase();if(P.some(x=>p.includes(x))){skipped++;continue}q.push(f)}
 const roots=new Set([...list].map(f=>(f.webkitRelativePath||'').split('/')[0]).filter(Boolean));
 return {q,skipped,noext,root:[...roots].join('، ')}}
function start(list){list=[...list];if(!list.length)return;
 if(S.scan&&S.scan.running)return toast('اسکن در حال اجراست');
 const sig=list.length+'|'+list.slice(0,20).map(f=>f.name+f.size).join('|'),now=Date.now();if(S.lastSig===sig&&now-S.lastSigT<1500)return;S.lastSig=sig;S.lastSigT=now;   // جلوگیری از اجرای دوباره‌ی یک انتخاب
 const p=prepare(list);if(!p.q.length)return toast('فایل صوتی پشتیبانی‌شده‌ای پیدا نشد'+(p.skipped?' ('+fa(p.skipped)+' فایل با فیلتر محافظ رد شد)':''));
 const dl=/^(download|downloads|دانلود|دانلودها)$/i.test(p.root.trim());
 sheet('تأیید افزودن به کتابخانه',[['افزودن '+fa(p.q.length)+' فایل',()=>runScan(p)],['لغو',()=>{}]],
  `پوشه: ${p.root||'فایل‌های انتخاب‌شده'}\nفایل صوتی: ${fa(p.q.length)}\nردشده با فیلتر محافظ (قرآن/ضبط/گفتاری): ${fa(p.skipped)}\nفایل غیرصوتی: ${fa(p.noext)}`+(dl?'\n\n⚠ این پوشه‌ی دانلود است و ممکن است فایل غیرموسیقی داشته باشد.':'')+'\nهیچ فایلی تغییر نمی‌کند.')}
const scanStats=s=>`جدید: ${fa(s.ok)} • خراب: ${fa(s.bad)} • قبلاً در کتابخانه: ${fa(s.dup)} • ردشده: ${fa(s.skip+s.short)} • خطا: ${fa(s.err)}`;
async function runScan(p,resume){
 if(!resume)S.scan={q:p.q,i:0,n:0,ok:0,bad:0,dup:0,skip:p.skipped,short:0,err:0,t:p.q.length};
 const sc=S.scan;sc.running=true;sc.stop=false;sc.quota=sc.mem=false;S.view={t:'scan'};render();
 try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch{}
 let buf=[],cbuf=[],last=0;
 const flush=async()=>{const b=buf,c=cbuf;buf=[];cbuf=[];if(c.length)await putCovers(c);if(b.length)await putMany(b)};
 const upd=(force)=>{const n=Date.now();if(!force&&n-last<150)return;last=n;const e=$('#sp');if(!e)return;e.value=sc.n;$('#sn').textContent=fa(Math.floor(sc.n/sc.t*100))+'٪ — '+fa(sc.n)+' از '+fa(sc.t);$('#sc').textContent=scanStats(sc)};
 const one=async f=>{const path=f.webkitRelativePath||f.name,id=path+'|'+f.size;S.files.set(id,f);
  if(S.map.has(id)){sc.dup++;return}
  const parts=path.split('/'),dir=parts.slice(0,-1),tg=await window.NaghmeTags.readTags(f),dur=await probe(f);
  if(dur!==null&&dur>0&&dur<S.cfg.min){sc.short++;return}
  let cid='';if(tg.cover){const th=await thumb(tg.cover);if(th){cid=await coverId(th);if(!S.covers.has(cid)){S.covers.set(cid,th);cbuf.push({id:cid,blob:th})}}}
  const s={id,name:f.name,path,dir:dir.join('/'),size:f.size,fmt:f.name.split('.').pop().toLowerCase(),title:tg.title||f.name.replace(/\.[^.]+$/,''),artist:tg.artist||dir[dir.length-1]||'نامشخص',album:tg.album||'',year:tg.year||'',track:tg.track||0,genre:tg.genre||'',composer:tg.composer||'',lyricist:tg.lyricist||'',cid,tagged:!!(tg.title||tg.artist),dur:dur||0,bad:dur===null,added:Date.now(),fav:false,plays:0,last:0};
  S.songs.push(s);S.map.set(id,s);buf.push(s);dur===null?sc.bad++:sc.ok++;if(buf.length>=25)await flush()};
 const work=async()=>{while(sc.i<sc.q.length&&!sc.stop){const f=sc.q[sc.i++];
  try{await one(f)}catch(e){sc.err++;if(e&&e.name==='QuotaExceededError'){sc.stop=true;sc.quota=true}else if(e instanceof RangeError){sc.stop=true;sc.mem=true}}   // خطای یک فایل اسکن بقیه را متوقف نمی‌کند
  sc.n++;upd()}};
 await Promise.all(Array.from({length:S.cfg.conc},work));
 try{await flush()}catch(e){sc.quota=true}
 sc.running=false;upd(true);
 if(sc.quota)toast('فضای ذخیره‌سازی مرورگر پر است؛ اطلاعات تا این‌جا ذخیره شد. فضا آزاد کنید و «ادامه» را بزنید');
 else if(sc.mem)toast('حافظه‌ی مرورگر کم است؛ اسکن متوقف شد. برنامه‌های دیگر را ببندید و «ادامه» را بزنید');
 if(sc.i>=sc.q.length&&!sc.stop){const msg='اسکن کامل شد — '+scanStats(sc);S.scan=null;S.view={t:'songs'};S.lim=100;render();toast(msg)}
 else render()}
/* ---------- Audio / EQ ---------- */
const BANDS=[60,230,910,3600,14000],PRE={Normal:[0,0,0,0,0],Pop:[-1,2,4,2,-1],Rock:[4,2,-1,3,4],Classical:[4,3,-2,3,4],Jazz:[3,2,-2,2,4],Vocal:[-2,0,4,3,0],'Bass Boost':[7,5,1,0,0],Acoustic:[4,3,2,3,2]};
function ensureAudio(){if(S.ctx){S.ctx.resume();return}const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=S.ctx=new C(),src=c.createMediaElementSource(au);
 S.f=BANDS.map((f,i)=>{const n=c.createBiquadFilter();n.type=i===0?'lowshelf':i===4?'highshelf':'peaking';n.frequency.value=f;n.Q.value=1;return n});
 S.gain=c.createGain();S.pan=c.createStereoPanner?c.createStereoPanner():null;const lim=c.createDynamicsCompressor();
 let n=src;[...S.f,S.gain,...(S.pan?[S.pan]:[]),lim].forEach(x=>{n.connect(x);n=x});n.connect(c.destination);applyEQ()}
function applyEQ(){if(!S.ctx)return;const e=S.eq;S.f.forEach((n,i)=>n.gain.value=e.on?e.g[i]:0);S.gain.gain.value=e.on?e.pre:1;if(S.pan)S.pan.pan.value=e.on?e.bal:0;kvSet('eq',e)}
/* ---------- Player ---------- */
const cur=()=>S.map.get(S.q[S.qi]);
function play(ids,i=0){S.q=ids.slice();S.qi=i;S.resume=null;load(true)}
function load(go){const s=cur();if(!s)return;const f=S.files.get(s.id);
 if(!f){au.pause();au.removeAttribute('src');S.loadedId=null;ui();toast('فایل این آهنگ در دسترس نیست؛ از «＋ افزودن» همان پوشه را دوباره انتخاب کنید');return}
 if(S.resume&&S.resume.id!==s.id)S.resume=null;                       // زمان ذخیره‌شده‌ی آهنگ دیگر روی این آهنگ اعمال نمی‌شود
 if(S.url)URL.revokeObjectURL(S.url);S.url=URL.createObjectURL(f);S.loadedId=s.id;S.pos=null;lastT=0;au.src=S.url;S.counted=false;ensureAudio();
 if(go)au.play().catch(()=>{});ui();media(s);saveLast()}
function next(auto){if(!S.q.length)return;if(S.rep===2&&auto){au.currentTime=0;au.play();return}let i;
 if(S.shuffle&&S.q.length>1){do i=Math.floor(Math.random()*S.q.length);while(i===S.qi)}else i=S.qi+1;
 if(i>=S.q.length){if(S.rep===1)i=0;else{au.pause();return}}S.qi=i;S.resume=null;load(true)}
function prev(){if(au.currentTime>3){au.currentTime=0;return}S.qi=Math.max(0,S.qi-1);S.resume=null;load(true)}
function tog(){if(!S.q.length)return toast('ابتدا آهنگی را انتخاب کنید');const s=cur();if(!au.getAttribute('src')||!s||S.loadedId!==s.id)load(true);else au.paused?(ensureAudio(),au.play().catch(()=>{})):au.pause()}
function saveLast(){const s=cur();let t=0;if(s){if(S.resume&&S.resume.id===s.id)t=S.resume.t;else if(S.pos&&S.pos.id===s.id)t=S.pos.t}
 kvSet('last',{q:S.q,qi:S.qi,id:s?s.id:null,t,shuffle:S.shuffle,rep:S.rep,vol:au.volume})}
function media(s){if(!('mediaSession'in navigator)||!s)return;try{const art=(s.cid&&S.covers.get(s.cid))?[{src:blobURL('c:'+s.cid,S.covers.get(s.cid)),sizes:'300x300',type:'image/jpeg'}]:[];navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:s.artist,album:s.album,artwork:art});
 const h=(a,f)=>{try{navigator.mediaSession.setActionHandler(a,f)}catch{}};h('play',()=>{au.paused&&tog()});h('pause',()=>{au.paused||au.pause()});h('previoustrack',prev);h('nexttrack',()=>next());h('seekto',e=>{au.currentTime=e.seekTime});h('seekbackward',()=>{au.currentTime-=10});h('seekforward',()=>{au.currentTime+=10})}catch{}}
function ui(){const s=cur();$('#mt').textContent=s?s.title:'—';$('#ma').textContent=s?s.artist:'';$('#mc').innerHTML=cov(s);$('#nc').innerHTML=cov(s);$('#nt').textContent=s?s.title:'';$('#na').textContent=s?[s.artist,s.album].filter(Boolean).join(' • '):'';
 document.querySelectorAll('.pt').forEach(b=>b.textContent=au.paused?'▶':'⏸');$('#bs').classList.toggle('act',S.shuffle);$('#br').classList.toggle('act',S.rep>0);$('#br').textContent=S.rep===2?'⟳¹':'⟳';
 $('#qu').innerHTML=S.q.map((id,i)=>{const x=S.map.get(id);return x?`<div class="row ${i===S.qi?'cur':''}"><div class="m" data-a="qplay" data-i="${i}"><b>${esc(x.title)}</b><span>${esc(x.artist)}</span></div><button class="ib" data-a="qup" data-i="${i}" aria-label="بالا">▲</button><button class="ib" data-a="qdn" data-i="${i}" aria-label="پایین">▼</button><button class="ib" data-a="qrm" data-i="${i}" aria-label="حذف از صف">✕</button></div>`:''}).join('')}
let lastT=0,sv=0;
au.onplay=au.onpause=ui;au.onended=()=>next(true);
au.onerror=()=>{if(!au.getAttribute('src'))return;toast('خطا در پخش این فایل');const s=S.map.get(S.loadedId);if(s){s.bad=true;putMany([s])}};
au.onloadedmetadata=()=>{const r=S.resume,s=cur();                      // اعمال زمان فقط وقتی شناسه‌ی آهنگ، متادیتا و مدت معتبرند
 if(r&&s&&r.id===s.id&&S.loadedId===s.id&&isFinite(au.duration)&&r.t>0&&r.t<au.duration-1)au.currentTime=r.t;
 if(r&&s&&r.id===S.loadedId)S.resume=null};
au.ontimeupdate=()=>{const d=au.duration||0,t=au.currentTime,s=cur();if(d&&isFinite(d)){$('#seek').value=t/d*1000;$('#mp').style.width=t/d*100+'%'}$('#te').textContent=fmt(t);$('#tr').textContent='-'+fmt((isFinite(d)?d:0)-t);
 if(!s||S.loadedId!==s.id)return;if(!S.resume)S.pos={id:s.id,t};
 const dt=t-lastT;if(dt>0&&dt<2)S.listen+=dt;lastT=t;
 if(!S.counted&&t>=Math.min(30,(d||60)/2)){S.counted=true;s.plays++;s.last=Date.now();putMany([s]);S.hist.push({id:s.id,t:s.last});S.hist=S.hist.slice(-500);kvSet('hist',S.hist)}
 if(Date.now()-sv>5000){sv=Date.now();saveLast();kvSet('listen',S.listen)}
 if('mediaSession'in navigator&&navigator.mediaSession.setPositionState&&d&&isFinite(d)){try{navigator.mediaSession.setPositionState({duration:d,position:Math.min(t,d),playbackRate:au.playbackRate})}catch{}}};
au.onvolumechange=()=>saveLast();
$('#seek').oninput=e=>{if(au.duration&&isFinite(au.duration))au.currentTime=e.target.value/1000*au.duration};$('#vol').oninput=e=>{au.volume=+e.target.value;au.muted=false};
addEventListener('pagehide',()=>{saveLast();kvSet('listen',S.listen)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){saveLast();kvSet('listen',S.listen)}});
/* ---------- Views ---------- */
const row=(s)=>`<div class="row ${cur()&&cur().id===s.id?'cur':''}" data-a="play" data-id="${esc(s.id)}">${cov(s)}<div class="m"><b>${esc(s.title)}</b><span>${esc(s.artist)}${s.album?' • '+esc(s.album):''}</span></div><span class="d">${s.dur?fmt(s.dur):''}</span><button class="ib" data-a="fav" data-id="${esc(s.id)}" aria-label="موردعلاقه">${s.fav?'♥':'♡'}</button><button class="ib" data-a="menu" data-id="${esc(s.id)}" aria-label="گزینه‌ها">⋮</button></div>`;
const list=(a,c='main',bar=true)=>{ctx[c]=a.map(s=>s.id);return (bar?`<div class="bar"><button class="pri" data-a="playall" data-c="${c}">▶ پخش همه</button><button data-a="shufall" data-c="${c}">⤮ تصادفی</button><span class="d">${fa(a.length)} آهنگ</span></div>`:'')+`<div data-ctx="${c}">`+a.slice(0,S.lim).map(row).join('')+'</div>'+(a.length>S.lim?'<button class="more" data-a="more">نمایش بیشتر</button>':'')};
const card=(img,t,sub,ty,v,c='')=>`<div class="card ${c}" data-a="open" data-t="${ty}" data-v="${esc(v)}">${img}<b>${esc(t)}</b><span>${esc(sub)}</span></div>`;
const group=(k)=>{const g=new Map();S.songs.forEach(s=>{const key=k(s);if(key)(g.get(key)||g.set(key,[]).get(key)).push(s)});return g};
const albKey=s=>s.album?s.artist+'\u0001'+s.album:'';
function filtered(){let a=S.songs;const q=$('#q').value.trim().toLowerCase();if(q)a=a.filter(s=>[s.title,s.artist,s.album,s.dir,s.year,s.genre,s.fmt,s.name].join('\u0001').toLowerCase().includes(q));
 const F={fav:s=>s.fav,new:s=>Date.now()-s.added<7*864e5,recent:s=>s.last,top:s=>s.plays>0,nocover:s=>!s.cover,notag:s=>!s.tagged,dup:s=>S.dups.has(s.id),bad:s=>s.bad}[S.filter];if(F)a=a.filter(F);
 const l=(x,y,k)=>String(x[k]).localeCompare(String(y[k]),'fa');const C={title:(x,y)=>l(x,y,'title'),artist:(x,y)=>l(x,y,'artist'),album:(x,y)=>l(x,y,'album'),year:(x,y)=>(+x.year||0)-(+y.year||0),dur:(x,y)=>x.dur-y.dur,added:(x,y)=>y.added-x.added,plays:(x,y)=>y.plays-x.plays};
 return [...a].sort(S.filter==='recent'?(x,y)=>y.last-x.last:S.filter==='top'?C.plays:C[S.sort])}
const CH=[['all','همه'],['fav','♥ موردعلاقه'],['new','تازه‌ها'],['recent','اخیراً پخش‌شده'],['top','پرپخش'],['nocover','بدون کاور'],['notag','بدون اطلاعات'],['dup','تکراری'],['bad','خراب']];
const empty=()=>`<div style="text-align:center;margin-top:12vh"><h2>کتابخانه خالی است</h2><p class="d">پوشه یا فایل‌های موسیقی را اضافه کنید. فایل‌ها هرگز آپلود نمی‌شوند.</p><div class="bar" style="justify-content:center"><button class="pri" data-a="add">＋ افزودن موسیقی</button></div></div>`;
const V={
 home(){if(!S.songs.length)return empty();const h=new Date().getHours(),g=h<12?'صبح بخیر':h<18?'روز بخیر':'شب بخیر';
  const rec=[...S.songs].filter(s=>s.last).sort((a,b)=>b.last-a.last).slice(0,12),nw=[...S.songs].sort((a,b)=>b.added-a.added).slice(0,12);
  const ta=[...group(s=>s.plays?s.artist:'')].map(([n,a])=>[n,a.reduce((x,s)=>x+s.plays,0)]).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const sec=(t,a)=>a.length?`<h3>${t}</h3><div class="grid">${a.map(s=>card(cov(s),s.title,s.artist,'play',s.id)).join('')}</div>`:'';
  const sg=ta[0]?[...S.songs.filter(s=>s.artist===ta[0][0]&&!s.plays)].slice(0,12):[];
  return `<h2>${g} 👋</h2>`+(S.q.length&&cur()?`<div class="bar"><button class="pri" data-a="tog">▶ ادامه پخش: ${esc(cur().title)}</button></div>`:'')+sec('اخیراً پخش‌شده‌ها',rec)+(ta.length?`<h3>هنرمندان محبوب</h3><div class="grid">${ta.map(([n])=>card(aimg(n),n,'','artist',n,'ar')).join('')}</div>`:'')+sec('تازه اضافه‌شده‌ها',nw)+sec('پیشنهاد از تاریخچه‌ی شما (شنیده‌نشده‌ها از محبوب‌ترین هنرمند)',sg)},
 songs(){return `<div class="chips">${CH.map(([k,n])=>`<button data-a="chip" data-f="${k}" class="${S.filter===k?'on':''}">${n}</button>`).join('')}</div><div class="bar"><select id="sort">${[['title','الفبایی'],['artist','خواننده'],['album','آلبوم'],['year','سال'],['dur','مدت'],['added','تاریخ افزودن'],['plays','تعداد پخش']].map(([k,n])=>`<option value="${k}" ${S.sort===k?'selected':''}>${n}</option>`).join('')}</select></div>`+(S.songs.length?list(filtered()):empty())},
 artists(){const g=group(s=>s.artist);return `<div class="grid">${[...g].sort((a,b)=>a[0].localeCompare(b[0],'fa')).map(([n,a])=>card(aimg(n),n,fa(a.length)+' آهنگ','artist',n,'ar')).join('')}</div>`||empty()},
 artist(){const n=S.view.v,a=S.songs.filter(s=>s.artist===n),al=[...group(albKey)].filter(([k])=>k.startsWith(n+'\u0001'));
  return `<div class="hero ar">${aimg(n)}<div><h2>${esc(n)}</h2><p class="d">${fa(a.length)} آهنگ • ${fa(al.length)} آلبوم</p><div class="bar"><button data-a="aimg" data-v="${esc(n)}">انتخاب تصویر</button>${S.imgs[n]?`<button data-a="aimgx" data-v="${esc(n)}">حذف تصویر</button>`:''}</div></div></div>`+
  (al.length?`<h3>آلبوم‌ها</h3><div class="grid">${al.map(([k,x])=>card(cov(anyCov(x)),x[0].album,x[0].year,'album',k)).join('')}</div>`:'')+(a.some(s=>s.plays)?'<h3>محبوب‌ترین‌ها</h3>'+list(a.filter(s=>s.plays).sort((x,y)=>y.plays-x.plays).slice(0,5),'pop',false):'')+'<h3>همه آثار</h3>'+list(a)},
 albums(){return `<div class="grid">${[...group(albKey)].sort((a,b)=>a[1][0].album.localeCompare(b[1][0].album,'fa')).map(([k,x])=>card(cov(anyCov(x)),x[0].album,x[0].artist,'album',k)).join('')}</div>`},
 album(){const a=S.songs.filter(s=>albKey(s)===S.view.v).sort((x,y)=>x.track-y.track),f=a[0];if(!f)return '';
  return `<div class="hero">${cov(anyCov(a))}<div><h2>${esc(f.album)}</h2><p class="d">${esc(f.artist)} • ${fa(f.year||'—')} • ${fa(a.length)} آهنگ • ${fmt(a.reduce((x,s)=>x+s.dur,0))}</p></div></div>`+list(a)},
 folders(){const p=S.view.v||'',pre=p?p+'/':'',kids=new Map();S.songs.forEach(s=>{if(s.dir===p||s.dir.startsWith(pre)){if(p&&s.dir===p)return;const r=s.dir.slice(pre.length).split('/')[0];if(r)kids.set(r,(kids.get(r)||0)+1)}});
  const here=S.songs.filter(s=>s.dir===p).sort((a,b)=>a.name.localeCompare(b.name,'fa',{numeric:true}));return `<div class="bar">${p?`<button data-a="fopen" data-v="${esc(p.split('/').slice(0,-1).join('/'))}">↩ بازگشت</button>`:''}<span class="d">${esc(p||'ریشه')}</span></div>`+[...kids].map(([n,c])=>`<div class="row" data-a="fopen" data-v="${esc(pre+n)}"><div class="cv">📁</div><div class="m"><b>${esc(n)}</b><span>${fa(c)} آهنگ</span></div></div>`).join('')+(here.length?list(here):(ctx.main=[],''))},
 playlists(){return `<div class="bar"><button class="pri" data-a="plnew">＋ فهرست جدید</button><button data-a="plimp">وارد کردن</button></div><div class="grid">${[['fav','♥ موردعلاقه‌ها'],['recent','اخیراً پخش‌شده'],['top','پرپخش‌ترین‌ها'],['new','آهنگ‌های جدید']].map(([f,n])=>card('<div class="cv">★</div>',n,'خودکار','smart',f)).join('')}${S.pl.map(p=>card(p.img?`<img class="cv" alt="" src="${blobURL('p'+p.id,p.img)}">`:'<div class="cv">♫</div>',p.name,fa(p.ids.length)+' آهنگ','pl',p.id)).join('')}</div>`},
 pl(){const p=S.pl.find(x=>x.id===S.view.v);if(!p)return '';const a=p.ids.map(i=>S.map.get(i)).filter(Boolean);
  return `<h2>${esc(p.name)}</h2><p class="d">${esc(p.desc||'')}</p><div class="bar"><button data-a="plren">تغییر نام/توضیح</button><button data-a="plimg">تصویر</button><button data-a="plcopy">کپی</button><button data-a="plmerge">ادغام</button><button data-a="plexp">خروجی</button><button data-a="pldel">حذف فهرست</button></div>`+list(a)+'<p class="d">برای حذف آهنگ از فهرست: ⋮ ← حذف از این فهرست</p>'},
 stats(){const ar=[...group(s=>s.plays?s.artist:'')].map(([n,a])=>[n,a.reduce((x,s)=>x+s.plays,0)]).sort((a,b)=>b[1]-a[1]).slice(0,8),ge=[...group(s=>s.genre)].map(([n,a])=>[n,a.length]).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const bars=a=>a.length?a.map(([n,c])=>`<div class="st"><span>${esc(n)}</span><div class="bw"><i style="width:${c/a[0][1]*100}%"></i></div><span>${fa(c)}</span></div>`).join(''):'<p class="d">هنوز داده‌ای نیست</p>';
  const tot=S.songs.reduce((x,s)=>x+s.size,0);return `<h2>آمار</h2><p>${fa(S.songs.length)} آهنگ • ${fa(group(s=>s.artist).size)} هنرمند • ${fa(group(albKey).size)} آلبوم • ${MB(tot)}</p><p>مدت گوش‌دادن: ${fa(Math.floor(S.listen/3600))} ساعت و ${fa(Math.floor(S.listen%3600/60))} دقیقه</p><h3>هنرمندان پرشنیده</h3>${bars(ar)}<h3>سبک‌ها</h3>${bars(ge)}<h3>تاریخچه‌ی پخش</h3>`+[...S.hist].reverse().slice(0,20).map(h=>{const s=S.map.get(h.id);return s?`<div class="m"><b>${esc(s.title)}</b><span>${esc(s.artist)} — ${new Date(h.t).toLocaleString('fa-IR')}</span></div>`:''}).join('')},
 settings(){const e=S.eq,c=S.cfg,cp=CAPS();const yn=(b,t,f)=>`<li>${b?'✓':'✗'} ${b?t:f}</li>`;
  return `<h2>اکولایزر</h2>${cp.audio?'':'<p class="d">⚠ اکولایزر در این مرورگر پشتیبانی نمی‌شود (Web Audio ندارد)؛ پخش عادی کار می‌کند.</p>'}<div class="bar"><label><input type="checkbox" id="eqon" ${e.on?'checked':''}> فعال</label><select id="eqp">${Object.keys(PRE).map(k=>`<option ${e.p===k?'selected':''}>${k}</option>`).join('')}<option ${e.p==='Custom'?'selected':''} value="Custom">Custom</option></select><button data-a="eqsave">ذخیره به‌عنوان Custom</button></div>
  <div class="eq">${BANDS.map((f,i)=>`<label>${fa(e.g[i])}<input type="range" min="-12" max="12" step="1" value="${e.g[i]}" data-eq="${i}" orient="vertical" aria-label="${f}Hz">${fa(f)}Hz</label>`).join('')}</div>
  <div class="bar"><label>تقویت <input type="range" id="eqpre" min="0.5" max="1.5" step="0.05" value="${e.pre}"></label><label>بالانس <input type="range" id="eqbal" min="-1" max="1" step="0.1" value="${e.bal}"></label></div>
  <h2>کتابخانه و اسکن</h2><div class="bar"><button class="pri" data-a="add">＋ افزودن موسیقی</button><button data-a="dups">یافتن تکراری‌ها (SHA-256)</button><button data-a="clear">پاک‌کردن کتابخانه</button></div>
  <div class="bar"><label>هم‌زمانی اسکن <select id="cfgconc">${[1,2,3,4,6].map(n=>`<option ${c.conc===n?'selected':''}>${n}</option>`).join('')}</select></label><label>حداقل مدت (ثانیه) <input type="number" id="cfgmin" min="0" max="600" value="${c.min}" style="width:80px"></label><label><input type="checkbox" id="cfgskip" ${c.skip?'checked':''}> فیلتر محافظ فایل‌های غیرموسیقی</label></div>
  <textarea id="cfgpats" rows="2" style="width:100%" aria-label="الگوهای ردشده">${esc(c.pats)}</textarea><p class="d">فایلی که مسیرش شامل یکی از این عبارت‌ها (با کاما جدا) باشد وارد کتابخانه نمی‌شود. فقط فایل‌هایی که خودتان انتخاب می‌کنید بررسی می‌شوند؛ پوشه‌ی Download هرگز خودکار اسکن نمی‌شود.</p>
  <h2>پشتیبان‌گیری</h2><div class="bar"><button class="pri" data-a="bk">خروجی JSON</button><button data-a="rs">بازیابی</button><select id="rem" aria-label="یادآوری"><option value="0">بدون یادآوری</option><option value="7">یادآوری هفتگی</option><option value="30">یادآوری ماهانه</option></select></div><p class="d">پشتیبان شامل اطلاعات آهنگ‌ها، هنرمندان و آلبوم‌ها (که از اطلاعات آهنگ‌ها ساخته می‌شوند)، فهرست‌ها، علاقه‌مندی‌ها، تصویر هنرمندان، کاورها (با کنترل حجم) و تنظیمات است. <b>فایل‌های صوتی اصلی در پشتیبان نیستند.</b></p>
  <h2>وضعیت پشتیبانی این مرورگر</h2><ul class="d">${yn(cp.dir,'انتخاب پوشه','انتخاب پوشه پشتیبانی نمی‌شود؛ از «انتخاب چند فایل» استفاده کنید')}${yn(cp.audio,'اکولایزر (Web Audio)','اکولایزر پشتیبانی نمی‌شود')}${yn(cp.ms,'کنترل از اعلان/صفحه‌ی قفل (Media Session)','کنترل از صفحه‌ی قفل پشتیبانی نمی‌شود')}${yn(cp.sw,'حالت آفلاین/نصب PWA','سرویس‌ورکر در دسترس نیست (نیاز به HTTPS یا localhost)')}${yn(cp.persist,'درخواست ذخیره‌سازی پایدار','ذخیره‌سازی پایدار پشتیبانی نمی‌شود')}</ul><div class="bar"><button data-a="inst">نصب برنامه</button></div>`},
 scan(){const s=S.scan;if(!s)return V.songs();return `<h2>${s.running?'در حال اسکن…':'اسکن متوقف شد'}</h2><progress id="sp" max="${s.t}" value="${s.n}" style="width:100%"></progress><p id="sn">${fa(Math.floor(s.n/s.t*100))}٪ — ${fa(s.n)} از ${fa(s.t)}</p><p id="sc" class="d">${scanStats(s)}</p><div class="bar">${s.running?'<button data-a="stop">⏹ توقف</button>':'<button class="pri" data-a="scont">▶ ادامه</button><button data-a="srestart">شروع مجدد از اول</button><button data-a="sclose">بستن</button>'}</div>`}
};
const NAV=[['home','خانه'],['songs','آهنگ‌ها'],['artists','هنرمندان'],['albums','آلبوم‌ها'],['folders','پوشه‌ها'],['playlists','فهرست‌ها'],['stats','آمار'],['settings','تنظیمات']];
$('#nav').innerHTML=NAV.map(([k,n])=>`<button data-a="nav" data-v="${k}">${n}</button>`).join('');
const CAPS=()=>({dir:'webkitdirectory' in document.createElement('input'),audio:!!(window.AudioContext||window.webkitAudioContext),ms:'mediaSession' in navigator,sw:'serviceWorker' in navigator,persist:!!(navigator.storage&&navigator.storage.persist)});
let vsT;function render(){const t=S.view.t,c=cur();freeURLs(new Set(c&&c.cid?['c:'+c.cid]:[]));document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===t||(t==='artist'&&b.dataset.v==='artists')||(t==='album'&&b.dataset.v==='albums')||(t==='pl'&&b.dataset.v==='playlists')));$('#view').innerHTML=(V[t]||V.home)();
 if(t!=='scan'){clearTimeout(vsT);vsT=setTimeout(()=>kvSet('view',{v:S.view,filter:S.filter,sort:S.sort}),300)}}
/* ---------- Dialogs & helpers ---------- */
const dlg=$('#dlg');
const sheet=(t,b,body='')=>{if(dlg.open)dlg.close();dlg._t=Date.now();dlg.innerHTML=`<h3>${esc(t)}</h3>`+(body?`<p class="d" style="white-space:pre-line;margin-bottom:8px">${esc(body)}</p>`:'')+b.map((x,i)=>`<button data-k="${i}">${esc(x[0])}</button>`).join('')+'<button data-k="x" class="ghost">بستن</button>';dlg._b=b;dlg.showModal()};
dlg.onclick=e=>{const k=e.target.dataset&&e.target.dataset.k;if(k===undefined){if(e.target===dlg&&Date.now()-(dlg._t||0)>500)dlg.close();return}   // کلیک دوم یک دبل‌کلیک پنجره را نمی‌بندد
 dlg.close();if(k!=='x'&&dlg._b[k])dlg._b[k][1]()};
const savePl=()=>kvSet('pl',S.pl),uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const dl=(o,n)=>{const u=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)};
const b2d=b=>new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=()=>j(f.error);f.readAsDataURL(b)});
const d2b=async d=>(await fetch(d)).blob();
const pick=s=>{const i=$(s);i.value='';i.click()};
function openAdd(){if(dlg.open)return;const b=[];const cp=CAPS();
 if(cp.dir)b.push(['انتخاب پوشه (همراه زیرپوشه‌ها)',()=>pick('#fDir')]);
 b.push(['انتخاب چند فایل',()=>pick('#fFiles')]);
 sheet('افزودن موسیقی',b,cp.dir?'اگر انتخاب پوشه در مرورگر شما کار نکرد، «انتخاب چند فایل» را بزنید و همه‌ی آهنگ‌ها را انتخاب کنید.':'این مرورگر انتخاب پوشه را پشتیبانی نمی‌کند؛ چند فایل را هم‌زمان انتخاب کنید.')}
const addToPl=id=>sheet('افزودن به فهرست',[...S.pl.map(p=>[p.name,()=>{if(!p.ids.includes(id))p.ids.push(id);savePl();toast('اضافه شد')}]),['＋ فهرست جدید',()=>{const n=prompt('نام فهرست:');if(n){S.pl.push({id:uid(),name:n,desc:'',ids:[id]});savePl();toast('فهرست ساخته شد')}}]]);
async function gcCovers(){const used=new Set(S.songs.map(s=>s.cid).filter(Boolean)),dead=[...S.covers.keys()].filter(k=>!used.has(k));if(dead.length){dead.forEach(k=>S.covers.delete(k));try{await delCovers(dead)}catch{}}}
function menu(id){const s=S.map.get(id);if(!s)return;const inPl=S.view.t==='pl';sheet(s.title,[['پخش',()=>play([id])],['پخش بعدی',()=>{S.q.splice(S.qi+1,0,id);if(S.qi<0)S.qi=0;ui();toast('به‌عنوان بعدی اضافه شد')}],['افزودن به صف',()=>{S.q.push(id);if(S.qi<0)S.qi=0;ui();toast('به صف اضافه شد')}],[s.fav?'حذف از موردعلاقه‌ها':'افزودن به موردعلاقه‌ها',()=>fav(id)],['افزودن به فهرست…',()=>addToPl(id)],
 ...(inPl?[['حذف از این فهرست',()=>{const p=S.pl.find(x=>x.id===S.view.v);p.ids=p.ids.filter(x=>x!==id);savePl();render()}]]:[]),['اطلاعات',()=>alert(`${s.title}\n${s.artist} — ${s.album}\n${s.year} ${s.genre}\n${s.path}\n${s.fmt} • ${MB(s.size)} • ${fmt(s.dur)}`)],['حذف از کتابخانه (فایل حذف نمی‌شود)',async()=>{if(confirm('فقط از کتابخانه‌ی نغمه حذف شود؟ فایل روی گوشی دست‌نخورده می‌ماند.')){S.songs=S.songs.filter(x=>x.id!==id);reidx();await delSong(id);await gcCovers();render()}}]])}
const fav=id=>{const s=S.map.get(id);s.fav=!s.fav;putMany([s]);render()};
async function sha(f){const h=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function findDups(){if(!(window.crypto&&crypto.subtle))return toast('SHA-256 در این مرورگر در دسترس نیست (نیاز به HTTPS یا localhost)');
 const g=group(s=>S.files.has(s.id)?s.size:'');const cand=[...g.values()].filter(a=>a.length>1).flat();if(!cand.length)return toast('فایل تکراری پیدا نشد (فقط فایل‌های انتخاب‌شده در همین نشست بررسی می‌شوند)');
 toast('در حال محاسبه‌ی SHA-256 برای '+fa(cand.length)+' فایل هم‌اندازه…');const h=new Map(),ch=[];
 for(const s of cand){try{if(s.size>3e8)continue;if(!s.hash){s.hash=await sha(S.files.get(s.id));ch.push(s)}(h.get(s.hash)||h.set(s.hash,[]).get(s.hash)).push(s.id)}catch{}}   // هش ذخیره می‌شود و دوباره محاسبه نمی‌شود
 if(ch.length)await putMany(ch);S.dups=new Set([...h.values()].filter(a=>a.length>1).flat());S.filter='dup';S.view={t:'songs'};render();toast(fa(S.dups.size)+' فایل تکراری')}
async function backup(){try{const imgs={},covers={};let total=0;for(const b of S.covers.values())total+=b.size;let withCov=true;
 if(total>25e6)withCov=confirm('حجم کاورها حدود '+MB(total)+' است. کاورها هم در پشتیبان قرار بگیرند؟ (لغو = بدون کاور)');
 for(const k in S.imgs)imgs[k]=await b2d(S.imgs[k]);if(withCov)for(const [k,b] of S.covers)covers[k]=await b2d(b);
 const pl=[];for(const p of S.pl)pl.push({...p,img:p.img?await b2d(p.img):null});
 dl({naghme:1,v:2,app:'NAGHME MUSIC STUDIO',date:Date.now(),songs:S.songs,pl,eq:S.eq,cfg:S.cfg,imgs,covers,hist:S.hist,listen:S.listen},'naghme-backup-'+new Date().toISOString().slice(0,10)+'.json');kvSet('lastBackup',Date.now());toast('پشتیبان ساخته شد')}catch(e){toast('ساخت پشتیبان ناموفق بود')}}
function validBackup(o){if(!o||o.naghme!==1||![1,2].includes(o.v)||!Array.isArray(o.songs))return 'نسخه یا ساختار فایل پشتیبان ناسازگار است';
 if(!o.songs.every(s=>s&&typeof s.id==='string'&&typeof s.title==='string'&&typeof s.artist==='string'))return 'اطلاعات آهنگ‌ها در فایل پشتیبان نامعتبر است';
 if(o.pl&&!(Array.isArray(o.pl)&&o.pl.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Array.isArray(p.ids))))return 'فهرست‌های پخش در فایل پشتیبان نامعتبر است';return ''}
async function restore(file){let o;try{o=JSON.parse(await file.text())}catch{return toast('فایل پشتیبان نامعتبر است؛ اطلاعات فعلی دست‌نخورده ماند')}
 const bad=validBackup(o);if(bad)return toast(bad+'؛ اطلاعات فعلی دست‌نخورده ماند');
 sheet('بازیابی از پشتیبان',[['ادغام با اطلاعات فعلی (پیشنهادی)',()=>applyRestore(o,'merge')],['جایگزینی کامل اطلاعات فعلی',()=>{if(confirm('همه‌ی اطلاعات فعلی کتابخانه، فهرست‌ها و تنظیمات جایگزین می‌شود. ادامه می‌دهید؟'))applyRestore(o,'replace')}],['لغو',()=>{}]],
  `پشتیبان شامل ${fa(o.songs.length)} آهنگ، ${fa((o.pl||[]).length)} فهرست و ${fa(Object.keys(o.imgs||{}).length)} تصویر هنرمند است.\nتاریخ: ${o.date?new Date(o.date).toLocaleString('fa-IR'):'نامشخص'}`)}
async function applyRestore(o,mode){try{
 const cv=new Map(),im={};for(const k in o.covers||{})cv.set(k,await d2b(o.covers[k]));for(const k in o.imgs||{})im[k]=await d2b(o.imgs[k]);
 const pl=[];for(const p of o.pl||[])pl.push({...p,img:p.img?await d2b(p.img):null});
 const songs=o.songs.map(s=>{const x={...s};delete x.cover;return x});            // کاورِ نسخه‌ی ۱ در پشتیبان وجود ندارد؛ با اسکن دوباره بازسازی می‌شود
 if(mode==='replace'){await replaceSongs(songs);S.songs=songs;S.map=new Map(songs.map(s=>[s.id,s]));S.pl=pl;S.imgs=im;S.hist=o.hist||[];S.listen=o.listen||0;if(o.eq)Object.assign(S.eq,o.eq);if(o.cfg)Object.assign(S.cfg,o.cfg);
  const add=[];for(const [k,b] of cv)if(!S.covers.has(k)){S.covers.set(k,b);add.push({id:k,blob:b})}if(add.length)await putCovers(add)}
 else{const add=[],ac=[];for(const s of songs){const old=S.map.get(s.id);if(!old){S.songs.push(s);S.map.set(s.id,s);add.push(s)}else{old.fav=old.fav||s.fav;old.plays=Math.max(old.plays||0,s.plays||0);if(!old.cid&&s.cid)old.cid=s.cid;add.push(old)}}
  for(const [k,b] of cv)if(!S.covers.has(k)){S.covers.set(k,b);ac.push({id:k,blob:b})}if(ac.length)await putCovers(ac);if(add.length)await putMany(add);
  for(const p of pl)if(!S.pl.some(x=>x.id===p.id))S.pl.push(p);for(const k in im)if(!S.imgs[k])S.imgs[k]=im[k];
  const seen=new Set(S.hist.map(h=>h.id+'@'+h.t));for(const h of o.hist||[])if(!seen.has(h.id+'@'+h.t))S.hist.push(h);S.hist.sort((a,b)=>a.t-b.t);S.listen=Math.max(S.listen,o.listen||0)}
 S.songs=[...S.map.values()];S.hist=S.hist.slice(-500);savePl();kvSet('imgs',S.imgs);kvSet('hist',S.hist);kvSet('listen',S.listen);kvSet('eq',S.eq);kvSet('cfg',S.cfg);reidx();await gcCovers();S.view={t:'songs'};render();toast('بازیابی انجام شد؛ برای پخش، پوشه‌ی موسیقی را دوباره اضافه کنید')}
 catch(e){console.error(e);toast('بازیابی ناموفق بود؛ اطلاعات پیشین حفظ شد')}}
/* ---------- Events ---------- */
const guard={};const once=(k,ms=300)=>{const n=Date.now();if(guard[k]&&n-guard[k]<ms)return false;guard[k]=n;return true};   // جلوگیری از دوبار کلیک ناخواسته
let dip;addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e});
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a,d=el.dataset,id=d.id;if(['tog','next','prev','add'].includes(a)&&!once(a))return;
 const A={nav(){S.view={t:d.v};S.lim=100;if(d.v==='songs'){}render()},play(){const c=el.closest('[data-ctx]'),ids=ctx[(c&&c.dataset.ctx)||'main'],i=ids.indexOf(id);i<0?play([id]):play(ids,i)},   // انتخاب با شناسه‌ی یکتا، نه اندیس
 fav(){e.stopPropagation();fav(id)},menu(){e.stopPropagation();menu(id)},more(){S.lim+=200;render()},
 playall(){const l=ctx[d.c||'main'];if(l.length)play(l,0)},shufall(){const l=ctx[d.c||'main'];if(l.length){S.shuffle=true;play(l,Math.floor(Math.random()*l.length))}},chip(){S.filter=d.f;S.lim=100;render()},
 open(){if(d.t==='play')return play([d.v]);if(d.t==='smart'){S.filter=d.v;S.view={t:'songs'}}else S.view={t:d.t,v:d.v};S.lim=100;render();$('#view').scrollTop=0},fopen(){S.view={t:'folders',v:d.v};S.lim=100;render()},
 add:openAdd,stop(){S.scan&&(S.scan.stop=true)},scont(){S.scan&&!S.scan.running&&runScan(null,true)},srestart(){if(S.scan&&!S.scan.running){S.scan.i=0;S.scan.n=S.scan.ok=S.scan.bad=S.scan.dup=S.scan.short=S.scan.err=0;runScan(null,true)}},sclose(){S.scan=null;S.view={t:'songs'};render()},
 inst(){dip?dip.prompt():toast('نصب: منوی Chrome ← Install app / افزودن به صفحه‌ی اصلی')},
 np(){$('#np').hidden=false;ui()},npx(){$('#np').hidden=true},tog,prev,next(){next()},shuf(){S.shuffle=!S.shuffle;ui();saveLast()},rep(){S.rep=(S.rep+1)%3;ui();saveLast()},b10(){au.currentTime-=10},f10(){au.currentTime+=10},mute(){au.muted=!au.muted;$('#bm').textContent=au.muted?'🔇':'🔊'},
 qplay(){S.qi=+d.i;load(true)},qrm(){const i=+d.i,was=!au.paused;S.q.splice(i,1);if(i<S.qi)S.qi--;else if(i===S.qi){if(!S.q.length){au.pause();au.removeAttribute('src');S.qi=-1;S.loadedId=null;S.resume=null}else{S.qi=Math.min(i,S.q.length-1);S.resume=null;load(was)}}ui();saveLast()},
 qup(){const i=+d.i;if(i>0){[S.q[i-1],S.q[i]]=[S.q[i],S.q[i-1]];if(S.qi===i)S.qi--;else if(S.qi===i-1)S.qi++;ui()}},qdn(){const i=+d.i;if(i<S.q.length-1){[S.q[i+1],S.q[i]]=[S.q[i],S.q[i+1]];if(S.qi===i)S.qi++;else if(S.qi===i+1)S.qi--;ui()}},
 aimg(){S.target=d.v;$('#fImg').click()},aimgx(){delete S.imgs[d.v];kvSet('imgs',S.imgs);render()},
 plnew(){const n=prompt('نام فهرست:');if(n){S.pl.push({id:uid(),name:n,desc:'',ids:[]});savePl();render()}},plimp(){S.imp='pl';$('#fJson').click()},
 plren(){const p=S.pl.find(x=>x.id===S.view.v),n=prompt('نام:',p.name);if(n){p.name=n;p.desc=prompt('توضیحات:',p.desc)||'';savePl();render()}},plimg(){S.target='pl';$('#fImg').click()},
 plcopy(){const p=S.pl.find(x=>x.id===S.view.v);S.pl.push({...p,id:uid(),name:p.name+' (کپی)',ids:[...p.ids]});savePl();toast('کپی شد')},
 plmerge(){const p=S.pl.find(x=>x.id===S.view.v);sheet('ادغام با…',S.pl.filter(x=>x!==p).map(x=>[x.name,()=>{x.ids.forEach(i=>p.ids.includes(i)||p.ids.push(i));savePl();render()}]))},
 plexp(){const p=S.pl.find(x=>x.id===S.view.v);dl({naghme:1,type:'playlist',name:p.name,desc:p.desc,items:p.ids.map(i=>{const s=S.map.get(i);return s&&{id:s.id,title:s.title,artist:s.artist}}).filter(Boolean)},'playlist-'+p.name+'.json')},
 pldel(){if(confirm('این فهرست حذف شود؟ (آهنگ‌ها حذف نمی‌شوند)')){S.pl=S.pl.filter(x=>x.id!==S.view.v);savePl();S.view={t:'playlists'};render()}},
 eqsave(){S.eq.p='Custom';applyEQ();render()},dups(){findDups()},bk(){backup()},rs(){S.imp='bk';$('#fJson').click()},
 clear(){if(confirm('اطلاعات کتابخانه‌ی نغمه پاک شود؟ فایل‌های موسیقی دست‌نخورده می‌مانند.')){replaceSongs([]).then(()=>{S.songs=[];S.files.clear();reidx();return gcCovers()}).then(render)}}};
 A[a]&&A[a]()});
document.addEventListener('change',e=>{const t=e.target,E=S.eq;
 if(t.id==='sort'){S.sort=t.value;render()}else if(t.id==='eqon'){E.on=t.checked;applyEQ()}else if(t.id==='eqp'){if(PRE[t.value])E.g=[...PRE[t.value]];E.p=t.value;applyEQ();render()}else if(t.id==='rem')kvSet('rem',+t.value);
 else if(t.id==='cfgconc'){S.cfg.conc=+t.value;kvSet('cfg',S.cfg)}else if(t.id==='cfgmin'){S.cfg.min=Math.max(0,+t.value||0);kvSet('cfg',S.cfg)}else if(t.id==='cfgskip'){S.cfg.skip=t.checked;kvSet('cfg',S.cfg)}else if(t.id==='cfgpats'){S.cfg.pats=t.value;kvSet('cfg',S.cfg)}});
document.addEventListener('input',e=>{const t=e.target,E=S.eq;if(t.dataset.eq!==undefined){E.g[+t.dataset.eq]=+t.value;E.p='Custom';applyEQ()}else if(t.id==='eqpre'){E.pre=+t.value;applyEQ()}else if(t.id==='eqbal'){E.bal=+t.value;applyEQ()}});
const onPick=e=>{const l=[...e.target.files];e.target.value='';if(l.length)start(l)};$('#fDir').onchange=onPick;$('#fFiles').onchange=onPick;   // لغو پنجره‌ی انتخاب = بدون رویداد و بدون خطا
$('#fImg').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const b=(await thumb(f))||(f.type.startsWith('image/')&&f.size<4e6?f:null);if(!b)return toast('این تصویر خوانده نشد');
 if(S.target==='pl'){S.pl.find(x=>x.id===S.view.v).img=b;savePl()}else{S.imgs[S.target]=b;kvSet('imgs',S.imgs)}render()};
$('#fJson').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(S.imp==='bk')return restore(f);
 try{const o=JSON.parse(await f.text());if(o.type!=='playlist')throw 0;const ids=[];let miss=0;o.items.forEach(it=>{const s=S.map.get(it.id)||S.songs.find(x=>x.title===it.title&&x.artist===it.artist);s?ids.push(s.id):miss++});S.pl.push({id:uid(),name:o.name,desc:o.desc||'',ids});savePl();render();toast(miss?fa(miss)+' آهنگ در کتابخانه پیدا نشد':'وارد شد')}catch{toast('فایل فهرست نامعتبر است')}};
$('#add').onclick=openAdd;
$('#q').oninput=()=>{if(!['songs'].includes(S.view.t))S.view={t:'songs'};S.lim=100;render()};
$('#theme').onclick=()=>{const l=document.documentElement.dataset.theme!=='light';document.documentElement.dataset.theme=l?'light':'dark';kvSet('theme',l?'light':'dark')};
addEventListener('keydown',e=>{if(e.target.matches('input,select'))return;if(e.code==='Space'){e.preventDefault();tog()}});

addEventListener('error',e=>{const x=e.target;if(x&&x.tagName==='IMG'&&x.classList.contains('cv')){const d=document.createElement('div');d.className='cv ph';d.textContent='♪';x.replaceWith(d)}},true);   // تصویر خراب = تصویر جایگزین
addEventListener('offline',()=>toast('آفلاین هستید؛ همه‌ی امکانات برنامه بدون اینترنت کار می‌کند'));
/* ---------- Boot ---------- */
(async()=>{try{
 S.songs=await tx('songs','readonly',s=>s.getAll())||[];
 for(const c of await tx('covers','readonly',s=>s.getAll())||[])S.covers.set(c.id,c.blob);
 const mig=[],cb=[];                                    // مهاجرت از نسخه‌ی ۱: کاورِ داخل رکورد آهنگ ← مخزن کاورهای یکتا
 for(const s of S.songs){if('cover' in s){try{if(s.cover instanceof Blob){const cid=await coverId(s.cover);if(!S.covers.has(cid)){S.covers.set(cid,s.cover);cb.push({id:cid,blob:s.cover})}s.cid=cid}else s.cid=s.cid||''}catch{s.cid=''}delete s.cover;mig.push(s)}}
 if(cb.length)await putCovers(cb);if(mig.length)await putMany(mig);reidx();
 S.pl=await kvGet('pl')||[];Object.assign(S.eq,await kvGet('eq')||{});Object.assign(S.cfg,await kvGet('cfg')||{});S.imgs=await kvGet('imgs')||{};S.hist=await kvGet('hist')||[];S.listen=await kvGet('listen')||0;
 document.documentElement.dataset.theme=await kvGet('theme')||'dark';
 const l=await kvGet('last');
 if(l&&Array.isArray(l.q)){S.q=l.q.filter(i=>S.map.has(i));const ci=l.id?S.q.indexOf(l.id):-1;S.shuffle=!!l.shuffle;S.rep=[0,1,2].includes(l.rep)?l.rep:0;
  if(ci>=0){S.qi=ci;if(typeof l.t==='number'&&isFinite(l.t)&&l.t>0)S.resume={id:l.id,t:l.t}}else S.qi=S.q.length?0:-1;   // آهنگ ذخیره‌شده پیدا نشد ← بدون خطا رد می‌شود
  if(typeof l.vol==='number'&&l.vol>=0&&l.vol<=1){au.volume=l.vol;$('#vol').value=l.vol}}
 const v=await kvGet('view');
 if(v&&v.v&&V[v.v.t]&&v.v.t!=='scan'){const t=v.v;const ok=t.t==='artist'?S.songs.some(s=>s.artist===t.v):t.t==='album'?S.songs.some(s=>albKey(s)===t.v):t.t==='pl'?S.pl.some(p=>p.id===t.v):true;if(ok){S.view=t;S.filter=v.filter||'all';S.sort=v.sort||'title'}}
 const r=await kvGet('rem'),lb=await kvGet('lastBackup')||0;if(r&&S.songs.length&&Date.now()-lb>r*864e5)setTimeout(()=>toast('زمان پشتیبان‌گیری رسیده است (تنظیمات ← پشتیبان‌گیری)'),1500);
 if(S.songs.length&&!S.files.size)setTimeout(()=>toast('برای پخش، پوشه‌ی موسیقی را دوباره با «＋ افزودن» انتخاب کنید (اطلاعات شما حفظ شده است)'),2500);
}catch(e){console.error(e);toast('خطا در خواندن پایگاه داده')}
 render();ui();
 if('serviceWorker'in navigator&&location.protocol!=='file:'){const had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg=>{
   const ask=w=>sheet('نسخه‌ی جدید برنامه آماده است',[['به‌روزرسانی اکنون',()=>w.postMessage('skip')],['بعداً',()=>{}]],'پس از به‌روزرسانی، صفحه دوباره بارگذاری می‌شود.');
   if(reg.waiting&&navigator.serviceWorker.controller)ask(reg.waiting);
   reg.addEventListener('updatefound',()=>{const w=reg.installing;w&&w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)ask(w)})});
   let rf=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!had||rf)return;rf=true;location.reload()});
   reg.update().catch(()=>{})}).catch(()=>{})}
})();
