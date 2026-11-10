// آزمون صفحه‌ی تلویزیون اینترنتی (v2.2.8) در Chromium واقعی با داده‌ی ساختگی.
// اجرا: PW=/مسیر/playwright FIX=/tmp/t node iptv.test.js   (سرور ایستا روی پورت ۸۷۶۵ برای پوشه‌ی پروژه؛ ویدئوهای آزمایشی: FIX/tv/red.webm)
// محدودیت‌ها: فهرست M3U و CDN مربوط به hls.js شبیه‌سازی می‌شوند (شبکه نیست)؛ hls.js یک «کلاس ساختگی» است که فقط چرخه‌ی عمر (ساخت/نابودی) را می‌سنجد،
// نه رمزگشایی واقعی HLS. پخش واقعی با فایل WebM محلی سنجیده می‌شود. Android WebView / دستگاه واقعی در این آزمون نیست.
const {chromium}=require(process.env.PW||'/opt/npm-tools/node_modules/playwright');
const fs=require('fs');const BASE=process.env.BASE||'http://localhost:8765/index.html',FIX=process.env.FIX||'/tmp/t';
const results=[];const rec=(n,ok,d='')=>{results.push({n,ok});console.log((ok?'PASS ':'FAIL ')+n+(d?'  — '+d:''))};
const T=async(n,f)=>{try{const r=await f();rec(n,r===undefined||r===true||(r&&r.ok),r&&r.d||'')}catch(e){rec(n,false,String(e.message).split('\n')[0])}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const N=3000;
// ---- داده‌ی ساختگی ----
const groups=['News','Sports','Music','Kids'];
let m3u='#EXTM3U\n';
for(let i=0;i<N;i++){
 const url=i%2===0?`https://tv.test/a${i}.webm`:`https://tv.test/h${i}.m3u8`;
 let attrs='';
 if(i%10===0)attrs+=' tvg-country="IR" tvg-language="Persian"';
 if(i%10===1)attrs+=` tvg-id="Show${i}.uk"`;
 m3u+=`#EXTINF:-1${attrs} group-title="${groups[i%4]}",Channel ${i}\n${url}\n`;
}
m3u+='#EXTINF:-1 group-title="Kids",BadChan\nhttps://tv.test/bad.webm\n';
const TOTAL=N+1;
const stubHls=`window.Hls=class{static isSupported(){return true}static get Events(){return {ERROR:'e',MANIFEST_PARSED:'m'}}static get ErrorTypes(){return {NETWORK_ERROR:'n',MEDIA_ERROR:'d'}}
constructor(){const s=window.__hls=window.__hls||{created:0,destroyed:0,live:new Set(),loads:[]};this.id=++s.created;s.live.add(this.id);this.h={}}
on(e,f){this.h[e]=f}loadSource(u){window.__hls.loads.push(u)}attachMedia(v){setTimeout(()=>this.h.m&&this.h.m(),10)}destroy(){window.__hls.destroyed++;window.__hls.live.delete(this.id)}startLoad(){}recoverMediaError(){}};`;
const init=()=>{const o=HTMLMediaElement.prototype.canPlayType;HTMLMediaElement.prototype.canPlayType=function(t){return /mpegurl/i.test(t)?'':o.call(this,t)};   // Chromium بدون HLS بومی، مثل اکثر WebViewها
 window.__vrem=0;new MutationObserver(ms=>{for(const m of ms)for(const n of m.removedNodes)if(n.nodeType===1&&(n.id==='iptvVideo'||(n.querySelector&&n.querySelector('#iptvVideo'))))window.__vrem++}).observe(document,{childList:true,subtree:true})};
(async()=>{
 const br=await chromium.launch({args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 let fetches=0;const errs=[];
 const mkCtx=async(opts)=>{const ctx=await br.newContext(opts);
  await ctx.route('https://iptv-org.github.io/iptv/index.m3u',r=>{fetches++;r.fulfill({status:200,contentType:'text/plain',headers:{'access-control-allow-origin':'*'},body:m3u})});
  await ctx.route(/https:\/\/(cdn\.jsdelivr\.net|unpkg\.com)\/.*hls.*/,r=>r.fulfill({status:200,contentType:'application/javascript',body:stubHls}));
  await ctx.route('https://tv.test/bad.webm',r=>r.fulfill({status:404,body:'no'}));
  await ctx.route(/https:\/\/tv\.test\/a\d+\.webm/,r=>r.fulfill({status:200,contentType:'video/webm',path:FIX+'/tv/red.webm'}));
  return ctx};
 const mk=async(ctx)=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.addInitScript(init);await p.goto(BASE);await p.waitForSelector('#nav button');return p};
 const R=(p,sel)=>p.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return {t:r.top,b:r.bottom,l:r.left,r:r.right,w:r.width,h:r.height}},sel);
 const nav=(p,v)=>p.click(`#nav [data-v=${v}]`);
 const openTv=async p=>{await nav(p,'iptv');await p.waitForSelector('#iptvResults .tvrow',{timeout:10000})};
 const playing=(p,ms=8000)=>p.waitForFunction(()=>{const v=document.getElementById('iptvVideo');return v&&!v.paused&&v.currentTime>0.6},null,{timeout:ms});
 const st=p=>p.evaluate(()=>{const v=document.getElementById('iptvVideo'),l=document.getElementById('iptvResults');return {t:v.currentTime,paused:v.paused,src:v.getAttribute('src')||'',same:v===window.__v,ls:l.scrollTop,sy:window.scrollY,se:document.scrollingElement.scrollTop,sh:document.scrollingElement.scrollHeight,ih:innerHeight,vrem:window.__vrem,rows:l.querySelectorAll('.tvrow').length,on:l.querySelectorAll('.tvrow.on').length}});
 const hlsS=p=>p.evaluate(()=>{const s=window.__hls||{created:0,destroyed:0,live:new Set(),loads:[]};return {c:s.created,d:s.destroyed,live:s.live.size,loads:s.loads.length}});
 const visibleRow=(p,parity)=>p.evaluate(par=>{const l=document.getElementById('iptvResults'),lr=l.getBoundingClientRect(),rows=[...l.querySelectorAll('.tvrow')];for(let i=0;i<rows.length;i++){const r=rows[i].getBoundingClientRect(),m=rows[i].querySelector('b').textContent.match(/Channel (\d+)/);if(!m)continue;if(r.top>=lr.top+4&&r.bottom<=lr.bottom-4&&(+m[1])%2===par)return i}return -1},parity);
 const cnt=p=>p.evaluate(()=>IPTV.filtered.length);
 const sameRect=(a,b)=>['t','b','l','w','h'].every(k=>Math.abs(a[k]-b[k])<0.6);

 // ================= موبایل (۳۹۰×۷۸۰، لمسی) =================
 const mctx=await mkCtx({viewport:{width:390,height:780},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const page=await mk(mctx);
 await T('۱: ورود به صفحه‌ی تلویزیون، دریافت خودکار فهرست از منبع IPTV-org و نمایش (بدون خطای JS)',async()=>{await openTv(page);const c=await cnt(page),rows=await page.locator('#iptvResults .tvrow').count();return {ok:c===TOTAL&&fetches===1&&rows===150&&!errs.length,d:`channels=${c} fetches=${fetches} rows=${rows} errs=${errs.join('|')}`}});
 await T('۲: چیدمان سه‌بخشی: پخش بالا، جست‌وجو+دسته‌ها، سپس فهرست؛ فهرست زیر نوار موزیک/ناوبری نمی‌رود؛ ارتفاع مناسب',async()=>{
  const pl=await R(page,'.tvplayer'),se=await R(page,'#iptvSearch'),ch=await R(page,'#tvChips'),li=await R(page,'#iptvResults'),mi=await R(page,'#mini'),sd=await R(page,'#side'),s=await st(page);
  const ok=pl.t<se.t&&se.t<ch.t&&ch.t<li.t&&li.b<=mi.t+1&&mi.b<=sd.t+1&&li.h>=200&&s.sh<=s.ih+1&&(await R(page,'#tvbox')).h<=0.30*780+1;
  return {ok,d:JSON.stringify({pl:[pl.t,pl.b],se:[se.t,se.b],ch:[ch.t,ch.b],li:[li.t,li.b,li.h],mini:[mi.t,mi.b],side:sd.t,sh:s.sh,ih:s.ih})}});
 await T('۳: انتخاب شبکه → ویدئو واقعاً پخش می‌شود (WebM محلی)، شبکه انتخاب‌شده مشخص و نام آن نمایش داده می‌شود',async()=>{
  await page.evaluate(()=>{window.__v=document.getElementById('iptvVideo')});
  await page.locator('#iptvResults .tvrow').nth(4).click();await playing(page);
  const r=await page.evaluate(()=>({name:document.getElementById('tvName').textContent,on:document.querySelectorAll('#iptvResults .tvrow.on').length,onTxt:(document.querySelector('#iptvResults .tvrow.on b')||{}).textContent,vis:!document.getElementById('iptvVideo').hidden,src:document.getElementById('iptvVideo').getAttribute('src')}));
  return {ok:r.name==='Channel 4'&&r.on===1&&r.onTxt==='Channel 4'&&r.vis&&/a4\.webm$/.test(r.src),d:JSON.stringify(r)}});
 let before;
 await T('۴-الف: اسکرول فهرست (چرخ؛ لمس واقعی آزمون نشد): پخش قطع/ریست نمی‌شود، ویدئو/جست‌وجو/دسته‌ها در جا می‌مانند، صفحه نمی‌پرد (اسکرول تو در تو ندارد)',async()=>{
  const a=await st(page),pa=await R(page,'#tvbox'),sa=await R(page,'#iptvSearch'),ca=await R(page,'#tvChips');before=a;
  const li=await R(page,'#iptvResults');
  await page.mouse.move(li.l+li.w/2,li.t+li.h/2);for(let i=0;i<5;i++){await page.mouse.wheel(0,220);await sleep(120)}await sleep(300);   // چرخ ماوس؛ حرکت لمسی CDP در این محیط حتی روی یک div ساده هم اسکرول نمی‌دهد (آزمون‌پذیر نیست)
  const b=await st(page),pb=await R(page,'#tvbox'),sb=await R(page,'#iptvSearch'),cb=await R(page,'#tvChips');
  const ok=b.ls>100&&b.same&&!b.paused&&b.t>=a.t&&b.src===a.src&&b.sy===0&&b.se===0&&sameRect(pa,pb)&&sameRect(sa,sb)&&sameRect(ca,cb)&&b.vrem===0;
  return {ok,d:`listScroll=${Math.round(b.ls)} t=${a.t.toFixed(1)}→${b.t.toFixed(1)} sameEl=${b.same} pageScroll=${b.sy}/${b.se} removed=${b.vrem}`}});
 await T('۴-ب: اسکرول با چرخ/ته فهرست (overscroll) صفحه یا بخش‌های ثابت را حرکت نمی‌دهد',async()=>{
  const pa=await R(page,'#tvbox');const li=await R(page,'#iptvResults');await page.mouse.move(li.l+li.w/2,li.t+li.h/2);
  for(let i=0;i<8;i++){await page.mouse.wheel(0,2500);await sleep(60)}await sleep(300);for(let i=0;i<4;i++){await page.mouse.wheel(0,-6000);await sleep(60)}
  const pb=await R(page,'#tvbox'),s=await st(page);return {ok:s.sy===0&&s.se===0&&sameRect(pa,pb)&&s.same&&!s.paused,d:`sy=${s.sy} se=${s.se}`}});
 await T('۵: بارگذاری تدریجی (۱۵۰تایی): با رسیدن به پایین ردیف‌های بیشتر اضافه می‌شود و جای اسکرول نمی‌پرد',async()=>{
  const li=await R(page,'#iptvResults');await page.mouse.move(li.l+li.w/2,li.t+li.h/2);
  const r0=await page.evaluate(()=>{const l=document.getElementById('iptvResults');l.scrollTop=l.scrollHeight;return {rows:l.querySelectorAll('.tvrow').length}});await sleep(300);
  const r1=await page.evaluate(()=>{const l=document.getElementById('iptvResults');return {rows:l.querySelectorAll('.tvrow').length,ls:l.scrollTop,shown:IPTV.shown}});
  return {ok:r1.rows>r0.rows&&r1.rows>=300&&r1.ls>1000,d:JSON.stringify({r0,r1})}});
 await page.evaluate(()=>{document.getElementById('iptvResults').scrollTop=2500});await sleep(200);
 await T('۶: انتخاب شبکه‌ی جدید وسط فهرست اسکرول‌شده: فقط منبع ویدئو عوض می‌شود؛ همان عنصر video، فهرست در جا، نمایش بدون پرش',async()=>{
  const a=await st(page),pa=await R(page,'#tvbox');const idx=await visibleRow(page,0);if(idx<0)return {ok:false,d:'no row'};
  const name=await page.evaluate(i=>document.querySelectorAll('#iptvResults .tvrow')[i].querySelector('b').textContent,idx);
  await page.locator('#iptvResults .tvrow').nth(idx).click();await page.waitForFunction(n=>document.getElementById('tvName').textContent===n,name);await playing(page);
  const b=await st(page),pb=await R(page,'#tvbox');
  return {ok:b.same&&b.ls===a.ls&&b.sy===0&&b.se===0&&b.src!==a.src&&b.on===1&&b.vrem===0&&sameRect(pa,pb),d:`name=${name} ls ${a.ls}→${b.ls} srcChanged=${b.src!==a.src} on=${b.on} removed=${b.vrem}`}});
 await T('۷: فراخوانی‌های render() (مثل تغییر آهنگ/وضعیت) هنگام تماشا: ویدئو، ردیف‌ها و اسکرول دست‌نخورده می‌مانند',async()=>{
  await page.evaluate(()=>{window.__row=document.querySelector('#iptvResults .tvrow')});const a=await st(page);
  await page.evaluate(()=>{for(let i=0;i<5;i++)render()});await sleep(500);const b=await st(page);const same=await page.evaluate(()=>window.__row===document.querySelector('#iptvResults .tvrow'));
  return {ok:b.same&&same&&b.ls===a.ls&&!b.paused&&b.t>a.t&&b.src===a.src&&b.vrem===0,d:`t ${a.t.toFixed(2)}→${b.t.toFixed(2)} rowSame=${same} removed=${b.vrem}`}});
 await T('۸: HLS (hls.js ساختگی): انتخاب پشت‌سرهم چند شبکه‌ی m3u8 → هرگز بیش از یک نمونه‌ی هم‌زمان؛ نمونه‌ی قبلی destroy می‌شود',async()=>{
  const h0=await hlsS(page);
  const keys=await page.evaluate(()=>IPTV.channels.filter(c=>/\.m3u8/.test(c.url)).slice(0,6).map(c=>c.key));
  await page.evaluate(k=>{for(const x of k)playIPTV(x)},keys);await sleep(300);const h1=await hlsS(page);   // ۶ انتخاب هم‌زمان پشت‌سرهم
  await page.evaluate(k=>playIPTV(k),keys[0]);await sleep(150);await page.evaluate(k=>playIPTV(k),keys[1]);await sleep(300);const h2=await hlsS(page);
  const s=await st(page);
  return {ok:h1.live===1&&h2.live===1&&h2.c-h2.d===1&&s.same&&s.vrem===0,d:JSON.stringify({h0,h1,h2})}});
 await T('۹: بازگشت از HLS به شبکه‌ی WebM: نمونه‌ی HLS نابود می‌شود (live=۰) و پخش واقعی ادامه می‌یابد',async()=>{
  const key=await page.evaluate(()=>IPTV.channels.find(c=>/\.webm$/.test(c.url)&&c.name!=='BadChan').key);await page.evaluate(k=>playIPTV(k),key);await playing(page);const h=await hlsS(page);return {ok:h.live===0,d:JSON.stringify(h)}});
 await T('۱۰: جست‌وجو بر اساس نام، کشور (کد/نام انگلیسی/فارسی، و کشور برگرفته از پسوند tvg-id) و زبان؛ هنگام جست‌وجو پخش ادامه دارد',async()=>{
  const a=await st(page);const out={};
  const q=async(t)=>{await page.fill('#iptvSearch',t);await sleep(250);return cnt(page)};
  out.name=await q('channel 12');out.lang=await q('persian');out.cEn=await q('iran');
  const faIR=await page.evaluate(()=>new Intl.DisplayNames(['fa'],{type:'region'}).of('IR'));out.cFa=await q(faIR);
  out.uk=await q('united kingdom');const faGB=await page.evaluate(()=>new Intl.DisplayNames(['fa'],{type:'region'}).of('GB'));out.ukFa=await q(faGB);
  out.none=await q('zzzzqq');out.cases=await q('CHANNEL 12');
  await page.fill('#iptvSearch','');await sleep(250);out.all=await cnt(page);
  const b=await st(page);
  return {ok:out.name===111&&out.cases===111&&out.lang===300&&out.cEn===300&&out.cFa===300&&out.uk===300&&out.ukFa===300&&out.none===0&&out.all===TOTAL&&b.same&&!b.paused&&b.t>a.t&&b.src===a.src,d:JSON.stringify(out)}});
 await T('۱۱: دسته‌بندی‌ها (همه/علاقه‌مندی‌ها/گروه‌ها) و ترکیب با جست‌وجو؛ chip فعال مشخص؛ پخش دست‌نخورده',async()=>{
  const a=await st(page);const out={};
  out.chips=await page.evaluate(()=>[...document.querySelectorAll('#tvChips button')].map(b=>b.textContent).slice(0,6));
  await page.click('#tvChips button[data-v="News"]');out.news=await cnt(page);out.on=await page.evaluate(()=>document.querySelector('#tvChips .on').dataset.v);
  await page.fill('#iptvSearch','channel 12');await sleep(250);out.newsQ=await cnt(page);
  await page.fill('#iptvSearch','');await sleep(250);
  await page.click('#tvChips button[data-v="Kids"]');out.kids=await cnt(page);
  await page.click('#tvChips button[data-v="موردعلاقه‌ها"]');out.fav=await cnt(page);
  await page.click('#tvChips button[data-v="همه"]');out.all=await cnt(page);
  const b=await st(page);
  return {ok:out.chips[0]==='همه'&&out.chips[1]==='موردعلاقه‌ها'&&out.news===750&&out.on==='News'&&out.newsQ===29&&out.kids===751&&out.fav===0&&out.all===TOTAL&&b.same&&!b.paused&&b.src===a.src&&b.t>a.t,d:JSON.stringify(out)}});
 await T('۱۲: علاقه‌مندی‌ها: افزودن/حذف بدون پرش اسکرول، ذخیره در IndexedDB، نمایش در دسته‌ی «موردعلاقه‌ها»',async()=>{
  await page.evaluate(()=>{document.getElementById('iptvResults').scrollTop=800});await sleep(150);const a=await st(page);
  const idx=await visibleRow(page,0);const key=await page.evaluate(i=>document.querySelectorAll('#iptvResults .tvrow')[i].dataset.v,idx);
  await page.locator('#iptvResults .tvrow').nth(idx).locator('[data-a=iptvfav]').click();await sleep(300);
  const b=await st(page);const heart=await page.evaluate(i=>document.querySelectorAll('#iptvResults .tvrow')[i].querySelector('[data-a=iptvfav]').textContent,idx);
  const saved=await page.evaluate(async k=>(await kvGet('iptvFav')||[]).includes(k),key);
  await page.click('#tvChips button[data-v="موردعلاقه‌ها"]');const favN=await cnt(page);
  await page.locator('#iptvResults .tvrow').first().locator('[data-a=iptvfav]').click();await sleep(300);const favN2=await cnt(page);
  await page.click('#tvChips button[data-v="همه"]');
  return {ok:heart==='♥'&&b.ls===a.ls&&saved&&favN===1&&favN2===0&&b.same&&!b.paused&&b.src===a.src,d:JSON.stringify({heart,ls:[a.ls,b.ls],saved,favN,favN2})}});
 await T('۱۳: علاقه‌مندی بعد از بارگذاری دوباره‌ی برنامه حفظ می‌شود',async()=>{
  const key=await page.evaluate(()=>IPTV.channels[7].key);await page.evaluate(k=>toggleIPTVFav(k),key);await sleep(300);
  await page.reload();await page.waitForSelector('#nav button');await openTv(page);
  const r=await page.evaluate(k=>({inFav:IPTV.favorites.includes(k),heart:[...document.querySelectorAll('#iptvResults .tvrow')].find(r=>r.dataset.v===k).querySelector('[data-a=iptvfav]').textContent}),key);return {ok:r.inFav&&r.heart==='♥',d:JSON.stringify(r)}});
 await T('۱۴: تمام‌صفحه: ورود (API بومی یا حالت CSS)، پوشش کل صفحه، خروج با ✕؛ پخش ادامه دارد',async()=>{
  await page.evaluate(()=>{window.__v=document.getElementById('iptvVideo')});
  await page.locator('#iptvResults .tvrow').nth(2).click();await playing(page);
  const a=await st(page);await page.click('#tvFs');await sleep(500);
  const r=await page.evaluate(()=>{const b=document.getElementById('tvbox'),v=document.getElementById('iptvVideo').getBoundingClientRect();return {css:b.classList.contains('tvfull'),native:!!(document.fullscreenElement||document.webkitFullscreenElement),w:v.width,h:v.height,iw:innerWidth,ih:innerHeight,x:!document.getElementById('tvfsx').hidden}});
  await page.click('#tvfsx');await sleep(400);
  const r2=await page.evaluate(()=>({css:document.getElementById('tvbox').classList.contains('tvfull'),native:!!(document.fullscreenElement||document.webkitFullscreenElement),x:document.getElementById('tvfsx').hidden}));
  const b=await st(page);
  return {ok:(r.css||r.native)&&r.w>=r.iw-1&&r.h>=r.ih-1&&r.x&&!r2.css&&!r2.native&&r2.x&&b.same&&!b.paused&&b.src===a.src,d:JSON.stringify({r,r2})}});
 await T('۱۵: شبکه‌ی خراب (۴۰۴): پیام خطای فارسی؛ دکمه‌ی «اتصال دوباره» کار می‌کند؛ برنامه خراب نمی‌شود',async()=>{
  const key=await page.evaluate(()=>IPTV.channels.find(c=>c.name==='BadChan').key);await page.evaluate(k=>playIPTV(k),key);
  await page.waitForFunction(()=>document.getElementById('iptvStatus').textContent.includes('نتوانست'),null,{timeout:8000});const m=await page.textContent('#iptvStatus');
  await page.click('#tvRetry');await page.waitForFunction(()=>document.getElementById('iptvStatus').textContent.includes('نتوانست'),null,{timeout:8000});
  const good=await page.evaluate(()=>IPTV.channels.find(c=>/a8\.webm$/.test(c.url)).key);await page.evaluate(k=>playIPTV(k),good);await playing(page);const st2=await page.textContent('#iptvStatus');
  return {ok:m.includes('نتوانست')&&st2===''&&!errs.length,d:`status="${m.slice(0,30)}…" after-good="${st2}" errs=${errs.join('|')}`}});
 await T('۱۶: خروج از صفحه‌ی IPTV: ویدئو متوقف و src حذف، HLS آزاد (live=۰)، #tvpage پنهان؛ صفحه‌ی آهنگ‌ها سالم',async()=>{
  const hk=await page.evaluate(()=>IPTV.channels.find(c=>/\.m3u8/.test(c.url)).key);await page.evaluate(k=>playIPTV(k),hk);await sleep(300);const h0=await hlsS(page);
  await nav(page,'songs');await sleep(300);
  const r=await page.evaluate(()=>{const v=document.getElementById('iptvVideo');return {paused:v.paused,src:v.getAttribute('src'),ns:v.networkState,hidden:document.getElementById('tvpage').hidden,mode:document.body.classList.contains('tvmode'),viewShown:getComputedStyle(document.getElementById('view')).display!=='none',viewTxt:document.getElementById('view').textContent.length>0}});
  const h=await hlsS(page);return {ok:h0.live===1&&h.live===0&&r.paused&&!r.src&&r.hidden&&!r.mode&&r.viewShown&&r.viewTxt,d:JSON.stringify({h0,h,r})}});
 await T('۱۷: بازگشت به IPTV: شبکه‌ی انتخاب‌شده و فهرست حفظ، دوباره‌پخش بدون دریافت مجدد فهرست؛ منبع فقط یک نمونه',async()=>{
  const f0=fetches;await openTv(page);await sleep(400);
  const r=await page.evaluate(()=>({on:document.querySelectorAll('#iptvResults .tvrow.on').length,name:document.getElementById('tvName').textContent,vis:!document.getElementById('iptvVideo').hidden,rows:document.querySelectorAll('#iptvResults .tvrow').length}));const h=await hlsS(page);
  return {ok:fetches===f0&&r.vis&&r.name.startsWith('Channel')&&h.live===1&&r.rows>0,d:JSON.stringify({r,h,fetches})}});
 await T('۱۸: بیرون‌رفتن و بازگشت پشت‌سرهم و سریع (۲۰ بار): نشت HLS ندارد',async()=>{
  for(let i=0;i<20;i++){await nav(page,i%2?'songs':'iptv');await sleep(40)}await openTv(page);await sleep(400);const h=await hlsS(page);return {ok:h.live<=1&&h.c-h.d===h.live,d:JSON.stringify(h)}});
 await T('۱۹: بدون خطای JavaScript در تمام آزمون موبایل',async()=>({ok:errs.length===0,d:errs.slice(0,3).join(' | ')}));
 await mctx.close();

 // ================= موبایل افقی (۷۸۰×۳۶۰) =================
 const lctx=await mkCtx({viewport:{width:780,height:360},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const lp=await mk(lctx);
 await T('۲۰: گوشی افقی: پخش و فهرست کنار هم، فهرست زیر نوار موزیک نمی‌رود، ارتفاع قابل‌استفاده، صفحه اسکرول ندارد',async()=>{
  await openTv(lp);await lp.locator('#iptvResults .tvrow').nth(2).click();await playing(lp);
  const pl=await R(lp,'.tvplayer'),li=await R(lp,'#iptvResults'),mi=await R(lp,'#mini'),vi=await R(lp,'#tvbox'),s=await st(lp);
  return {ok:li.h>=100&&li.b<=mi.t+1&&vi.t>=0&&vi.b<=mi.t&&s.sh<=s.ih+1&&(pl.r<=li.l+1||li.r<=pl.l+1),d:JSON.stringify({li:[li.t,li.b,li.h],mini:mi.t,video:[vi.t,vi.b],sh:s.sh,ih:s.ih})}});
 await lctx.close();

 // ================= دسکتاپ (۱۲۸۰×۸۰۰) =================
 const dctx=await mkCtx({viewport:{width:1280,height:800}});
 const dp=await mk(dctx);
 await T('۲۱: دسکتاپ: سرصفحه‌ی عمومی دیده می‌شود، فهرست فقط خودش اسکرول می‌خورد، جست‌وجوی عمومی (#q) هم فهرست IPTV را فیلتر می‌کند و کادر IPTV هم‌گام می‌شود',async()=>{
  await openTv(dp);const li=await R(dp,'#iptvResults'),s=await st(dp);const hd=await dp.evaluate(()=>getComputedStyle(document.querySelector('main>header')).display!=='none');
  await dp.fill('#q','persian');await sleep(300);const n=await cnt(dp),v=await dp.inputValue('#iptvSearch');
  return {ok:hd&&li.h>300&&s.sh<=s.ih+1&&n===300&&v==='persian',d:JSON.stringify({hd,h:li.h,sh:s.sh,n,v})}});
 await T('۲۲: دسکتاپ: بخش‌های ثابت هنگام اسکرول فهرست جابه‌جا نمی‌شوند',async()=>{
  await dp.fill('#q','');await dp.fill('#iptvSearch','');await sleep(300);const a=[await R(dp,'.tvplayer'),await R(dp,'#iptvSearch'),await R(dp,'#tvChips')];
  const li=await R(dp,'#iptvResults');await dp.mouse.move(li.l+li.w/2,li.t+li.h/2);for(let i=0;i<6;i++){await dp.mouse.wheel(0,1500);await sleep(50)}await sleep(300);
  const b=[await R(dp,'.tvplayer'),await R(dp,'#iptvSearch'),await R(dp,'#tvChips')];const s=await st(dp);
  return {ok:a.every((x,i)=>sameRect(x,b[i]))&&s.ls>500&&s.sy===0&&s.se===0,d:`ls=${Math.round(s.ls)}`}});
 await T('۲۳: بدون خطای JavaScript در کل آزمون',async()=>({ok:errs.length===0,d:errs.slice(0,3).join(' | ')}));
 await dctx.close();
 const p=results.filter(r=>r.ok).length;console.log(`\n${p} PASS / ${results.length-p} FAIL`);fs.writeFileSync('/tmp/iptv-results.json',JSON.stringify(results,null,1));await br.close();process.exit(p===results.length?0:1);
})();
