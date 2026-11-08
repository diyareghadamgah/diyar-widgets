// آزمون مسیر «اندروید/Capacitor» در Chromium با یک پلاگین ساختگی (mock) که همان رابط NaghmeStorage را روی فایل‌های واقعی پیاده می‌کند.
// این آزمون منطق جاوااسکریپت (platform.js و اتصال آن به app.js) را می‌سنجد؛ کد جاوا و Android واقعی در آن شرکت ندارند.
const {chromium}=require(process.env.PW||'/opt/npm-tools/node_modules/playwright');
const fs=require('fs'),FIX=process.env.FIX||'/home/claude/t',BASE=process.env.BASE||'http://localhost:8765/index.html';
const results=[];const rec=(n,ok,d='')=>{results.push({n,ok});console.log((ok?'PASS ':'FAIL ')+n+(d?'  — '+d:''))};
const T=async(n,f)=>{try{const r=await f();rec(n,r===undefined||r===true||(r&&r.ok),r&&r.d||'')}catch(e){rec(n,false,String(e.message).split('\n')[0])}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const walk=(d,b='')=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name,b+e.name+'/'):[b+e.name]);
const manifest=walk(FIX+'/lib').map(rel=>({rel,size:fs.statSync(FIX+'/lib/'+rel).size,lastModified:1}));
function mockInit(a){
 window.__manifest=a.manifest;window.__revoked=false;window.__calls=[];window.__pickFiles=[];const cache=new Map();
 const src=m=>m.src||('lib/'+m.rel),enc=p=>'/__fx/'+encodeURIComponent(p).replace(/%2F/g,'/');
 const find=u=>{const rel=decodeURIComponent(u.replace('content://mock/doc/',''));return [...window.__manifest,...window.__pickFiles].find(m=>m.rel===rel)};
 const bytes=async u=>{const m=find(u);let b=cache.get(m.rel);if(!b){b=new Uint8Array(await (await fetch(enc(src(m)))).arrayBuffer());cache.set(m.rel,b)}return b};
 const item=m=>({uri:'content://mock/doc/'+encodeURIComponent(m.rel),name:m.rel.split('/').pop(),size:m.size,lastModified:1,rel:m.rel});
 window.Capacitor={isNativePlatform:()=>true,registerPlugin:()=>({
  async pickDirectory(){__calls.push('pickDirectory');return {uri:'content://mock/tree/lib',name:'lib'}},
  async listAudio(){__calls.push('listAudio');if(window.__treeLost)throw new Error('permission denied');return {files:window.__manifest.map(item)}},
  async pickFiles(){__calls.push('pickFiles');return {files:window.__pickFiles.map(item)}},
  async readChunk({uri,offset,length}){__calls.push('readChunk');if(window.__revoked)throw new Error('permission denied');const s=(await bytes(uri)).subarray(offset,offset+length);let bin='';for(let i=0;i<s.length;i+=8192)bin+=String.fromCharCode.apply(null,s.subarray(i,i+8192));return {data:btoa(bin),length:s.length}},
  async duration({uri}){const b=await bytes(uri);return new Promise((res,rej)=>{const au=new Audio(),u=URL.createObjectURL(new Blob([b],{type:'audio/mpeg'}));au.onloadedmetadata=()=>res({duration:au.duration});au.onerror=()=>rej(new Error('bad'));setTimeout(()=>rej(new Error('timeout')),8000);au.src=u})},
  async getPersisted(){return {trees:[]}},async releaseTree(){}})};
}
(async()=>{
 const br=await chromium.launch({args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const errs=[];
 const mk=async(extra=[])=>{const ctx=await br.newContext({acceptDownloads:true});await ctx.route('**/__fx/**',r=>{const rel=decodeURIComponent(new URL(r.request().url()).pathname.replace('/__fx/',''));r.fulfill({path:FIX+'/'+rel})});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.addInitScript(mockInit,{manifest:manifest.concat(extra)});await p.goto(BASE);await p.waitForSelector('#nav button');p._ctx=ctx;return p};
 const done=p=>p.waitForFunction(()=>!S.scan&&S.view.t!=='scan',null,{timeout:120000});
 const btn=(p,txt)=>p.click(`dialog[open] button:has-text("${txt}")`);
 const confirm=async(p,copy=false)=>{const s=`dialog[open] button:has-text("${copy?'و کپی داخل برنامه':'بدون کپی'}")`;await p.waitForSelector(s);await p.click(s)};
 const folder=async(p,copy=false)=>{await p.click('#add');await p.waitForSelector('dialog[open]');await btn(p,'انتخاب پوشه (دسترسی دائمی)');await confirm(p,copy);await done(p)};
 const p=await mk();

 await T('اندروید: NaghmePlatform.isNative و دکمه‌های «دسترسی دائمی» (بدون input وب)',async()=>{let fc=0;p.on('filechooser',()=>fc++);await p.click('#add');await p.waitForSelector('dialog[open]');const t=await p.textContent('dialog[open]');const nat=await p.evaluate(()=>NaghmePlatform.isNative);await p.evaluate(()=>document.querySelector('dialog').close());await sleep(300);return {ok:nat&&t.includes('انتخاب پوشه (دسترسی دائمی)')&&t.includes('انتخاب چند فایل (دسترسی دائمی)')&&t.includes('لینک')&&fc===0,d:'filechooser='+fc}});
 await T('اندروید: انتخاب پوشه ← تأیید ← اسکن از طریق NativeFile (تگ، کاور، مدت، خراب، فیلتر محافظ)',async()=>{await folder(p);const r=await p.evaluate(()=>({n:S.songs.length,bad:S.songs.filter(s=>s.bad).length,cov:S.songs.filter(s=>s.cid).length,cvs:S.covers.size,uri:S.songs.every(s=>/^content:\/\/mock\/doc\//.test(s.uri)),tree:S.trees.length&&S.trees[0].name,moon:(S.songs.find(s=>s.title==='Moon')||{}).artist,calls:[...new Set(__calls)].join(),skipped:S.songs.some(s=>/حلیه|Voice/.test(s.path)),path:S.songs[0].path.split('/')[0]}));
  return {ok:r.n===11&&r.bad===2&&r.cov===7&&r.cvs===3&&r.uri&&r.tree==='lib'&&r.moon==='Maryam'&&!r.skipped&&r.path==='lib'&&r.calls.includes('pickDirectory')&&r.calls.includes('listAudio')&&r.calls.includes('readChunk'),d:JSON.stringify(r)}});
 await T('اندروید ★ هدف اصلی: بعد از بستن/بازکردن، آهنگ‌ها خودکار به فایل وصل‌اند و بدون انتخاب دوباره پخش می‌شوند',async()=>{await p.reload();await p.waitForSelector('#nav button');await sleep(700);
  const pre=await p.evaluate(()=>({files:S.files.size,songs:S.songs.length,trees:S.trees.length}));await p.click('#nav [data-v=songs]');await p.locator('.row[data-id]',{hasText:'Moon'}).first().click();await sleep(2200);
  const r=await p.evaluate(()=>({t:au.currentTime,paused:au.paused,title:$('#mt').textContent,toast:$('#toast').textContent,imgs:[...document.querySelectorAll('#view img.cv')].filter(i=>i.naturalWidth>0).length}));
  return {ok:pre.files===11&&pre.songs===11&&pre.trees===1&&r.t>0.8&&!r.paused&&r.title==='Moon'&&!/دسترس/.test(r.toast)&&r.imgs>0,d:JSON.stringify({pre,r})}});
 await T('اندروید: «اسکن مجدد پوشه‌های ذخیره‌شده» — بدون تکراری؛ فایل جدید اضافه می‌شود',async()=>{const sz=fs.statSync(FIX+'/big/t00001.mp3').size;await p.evaluate(s=>window.__manifest.push({rel:'extra/new1.mp3',src:'big/t00001.mp3',size:s,lastModified:1}),sz);
  await sleep(1700);await p.click('#nav [data-v=settings]');await p.click('[data-a=rescan]');await confirm(p);await done(p);const r=await p.evaluate(()=>({n:S.songs.length,nw:S.songs.some(s=>s.title==='Track 00001')}));return {ok:r.n===12&&r.nw,d:JSON.stringify(r)}});
 await T('اندروید: از دست رفتن مجوز → پیام فارسی و بدون خطا؛ پس از بازگشت مجوز خودبه‌خود درمان می‌شود',async()=>{await p.evaluate(()=>{window.__revoked=true});const n0=errs.length;await p.click('#nav [data-v=songs]');await p.locator('.row[data-id]',{hasText:'Sun'}).first().click();await sleep(900);const toast=await p.textContent('#toast');await p.evaluate(()=>{window.__revoked=false});await p.reload();await p.waitForSelector('#nav button');await sleep(600);await p.click('#nav [data-v=songs]');await p.locator('.row[data-id]',{hasText:'Sun'}).first().click();await sleep(1800);const r=await p.evaluate(()=>({t:au.currentTime,title:$('#mt').textContent}));
  return {ok:/در دسترس نیست/.test(toast)&&errs.length===n0&&r.title==='Sun'&&r.t>0.5,d:toast+' | '+JSON.stringify(r)}});
 await T('اندروید: فایل بزرگ‌تر از چند تکه (۱ مگابایت) درست و کامل خوانده می‌شود (تطبیق بایت‌به‌بایت)',async()=>{const buf=Buffer.alloc(2500000);for(let i=0;i<buf.length;i++)buf[i]=(i*7+13)&255;fs.writeFileSync(FIX+'/big_one.bin',buf);
  await p.evaluate(s=>window.__manifest.push({rel:'extra/big.bin',src:'big_one.bin',size:s}),buf.length);
  const r=await p.evaluate(async sz=>{const f=new NaghmePlatform.NativeFile({name:'x.mp3',size:sz,uri:'content://mock/doc/'+encodeURIComponent('extra/big.bin'),path:'x.mp3'});const mid=Array.from(new Uint8Array(await f.slice(1000000,1000010).arrayBuffer()));const tail=Array.from(new Uint8Array(await f.slice(sz-4).arrayBuffer()));const all=new Uint8Array(await (await f.toBlob()).arrayBuffer());let bad=0;for(let i=0;i<all.length;i++)if(all[i]!==((i*7+13)&255)){bad++;break}return {len:all.length,bad,mid,tail}},buf.length);
  const exp=i=>(i*7+13)&255;return {ok:r.len===2500000&&r.bad===0&&r.mid.every((v,k)=>v===exp(1000000+k))&&r.tail.every((v,k)=>v===exp(2500000-4+k)),d:'len='+r.len+' badbyte='+r.bad}});
 await p._ctx.close();

 const q=await mk();
 await T('اندروید: «کپی داخل برنامه» با فایل بومی — بعد از از دست رفتن کامل مجوز هم پخش می‌شود',async()=>{await folder(q,true);const r=await q.evaluate(async()=>({st:S.songs.filter(s=>s.stored).length,idb:(await storedIds()).length,size:((await getStored(S.songs.find(s=>s.title==='Moon').id)).blob||{}).size,msize:S.songs.find(s=>s.title==='Moon').size}));
  await q.evaluate(()=>{window.__revoked=true;window.__treeLost=true});await q.reload();await q.waitForSelector('#nav button');await sleep(600);await q.evaluate(()=>{window.__revoked=true});await q.click('#nav [data-v=songs]');await q.locator('.row[data-id]',{hasText:'Moon'}).first().click();await sleep(2000);const p2=await q.evaluate(()=>({t:au.currentTime,title:$('#mt').textContent}));
  return {ok:r.st===9&&r.idb===9&&r.size===r.msize&&p2.title==='Moon'&&p2.t>0.8,d:JSON.stringify({r,p2})}});
 await T('اندروید: مهاجرت از نسخه‌ی وب — آهنگ‌های بدون uri با انتخاب همان پوشه به فایل بومی وصل می‌شوند (بدون رکورد تکراری)',async()=>{await q.evaluate(async()=>{window.__revoked=false;window.__treeLost=false;for(const s of S.songs){delete s.uri;delete s.tree}await putMany(S.songs);S.files.clear()});await q.reload();await q.waitForSelector('#nav button');await sleep(500);const pre=await q.evaluate(()=>S.files.size);await sleep(1600);
  await folder(q);const r=await q.evaluate(()=>({n:S.songs.length,withUri:S.songs.filter(s=>s.uri).length,files:S.files.size}));return {ok:pre===0&&r.n===11&&r.withUri===11&&r.files===11,d:JSON.stringify({pre,r})}});
 await T('اندروید: پشتیبان JSON شامل uri آهنگ‌هاست',async()=>{await q.click('#nav [data-v=settings]');const [dl]=await Promise.all([q.waitForEvent('download'),q.click('[data-a=bk]')]);const o=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));return {ok:o.songs.length===11&&o.songs.every(s=>/^content:/.test(s.uri)),d:'songs='+o.songs.length}});
 await T('اندروید: سرویس‌ورکر ثبت نمی‌شود (کش اضافی در WebView ندارد)',async()=>{await sleep(1200);const n=await q.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length);return {ok:n===0,d:'registrations='+n}});
 await T('اندروید: تنظیمات — بخش «پوشه‌های دائمی» و حذف دسترسی',async()=>{await q.click('#nav [data-v=settings]');const t=await q.textContent('#view');await q.click('[data-a=untree]');await sleep(400);const n=await q.evaluate(()=>S.trees.length);return {ok:t.includes('پوشه‌های دائمی')&&t.includes('lib')&&n===0,d:'trees after='+n}});
 await q._ctx.close();

 const f=await mk([]);
 await T('اندروید: انتخاب چند فایل — مسیر بدون پوشه، نام ریشه در پنجره‌ی تأیید نمی‌آید',async()=>{const sz=fs.statSync(FIX+'/moon.mp3').size;await f.evaluate(s=>{window.__pickFiles=[{rel:'03 Moon.mp3',src:'lib/آرشیو موسیقی/خوانندگان/Maryam/Night/03 Moon.mp3',size:s},{rel:'05 Star.mp3',src:'lib/آرشیو موسیقی/خوانندگان/Maryam/Night/05 Star.mp3',size:s}]},sz);
  await f.click('#add');await f.waitForSelector('dialog[open]');await btn(f,'انتخاب چند فایل (دسترسی دائمی)');await f.waitForSelector('dialog[open] p');const t=await f.textContent('dialog[open]');await confirm(f);await done(f);const r=await f.evaluate(()=>({n:S.songs.length,paths:S.songs.map(s=>s.path).sort().join('|')}));return {ok:r.n===2&&r.paths==='03 Moon.mp3|05 Star.mp3'&&!/پوشه: 03/.test(t),d:JSON.stringify(r)+' | '+t.replace(/\s+/g,' ').slice(0,90)}});
 await T('بدون خطای JavaScript در تمام اجرا',async()=>({ok:errs.length===0,d:errs.slice(0,3).join(' | ')}));
 const pass=results.filter(r=>r.ok).length;console.log(`\n${pass} PASS / ${results.length-pass} FAIL`);await br.close();process.exit(pass===results.length?0:1);
})();
