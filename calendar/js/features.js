/* امکانات v9: ناوبری روزها، خروجی با مقیاس، تولید گروهی قابل لغو، ذخیرهٔ خودکار تنظیمات، پشتیبان JSON، اعتبارسنجی لینک.
   این فایل پس از app.js بارگذاری می‌شود و فقط کنترل‌های جدید را اضافه یا handler دکمه‌های خروجی را جایگزین می‌کند.
   نسخهٔ اصلاح‌شده: ابعاد خروجی از dimsOf(templateMode) گرفته می‌شود تا قالب A4 (1240×1754) هم پشتیبانی شود. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const isoOf=dt=>dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)+'-'+pad(dt.getUTCDate());
const statusEl=$('status');
let statusTimer=null;
function say(msg,kind,ms){
  statusEl.textContent=msg||'';statusEl.className='status'+(kind?' '+kind:'');
  clearTimeout(statusTimer);if(ms)statusTimer=setTimeout(()=>{statusEl.textContent='';statusEl.className='status';},ms);
}
window.__say=say;
const sizeText=b=>b>1048576?fa((b/1048576).toFixed(1))+' مگابایت':fa(Math.round(b/1024))+' کیلوبایت';
const safeName=s=>String(s).replace(/[^\w\u0600-\u06FF.-]+/g,'-').slice(0,60);
function stem(i){return 'calendar-'+i.s.y+'-'+pad(i.s.m)+'-'+pad(i.s.d)+'-'+safeName(templateMode);}
function scaleValue(){const v=parseInt($('exportScale').value,10);return [1,2,3].includes(v)?v:1;}
const scaleTag=s=>s>1?'@'+s+'x':'';

/* ---------- ناوبری تاریخ ---------- */
function setISO(iso){
  const [y,m,d]=iso.split('-').map(Number);
  const jy=parts(new Date(Date.UTC(y,m-1,d,12)),'persian').y;
  if(jy<1300||jy>1500){say('این تاریخ خارج از بازهٔ پشتیبانی‌شده (۱۳۰۰ تا ۱۵۰۰) است.','warn',4000);return;}
  dateEl.value=iso;dateEl.onchange();
}
function shiftDay(delta){const [y,m,d]=dateEl.value.split('-').map(Number);setISO(isoOf(new Date(Date.UTC(y,m-1,d+delta,12))));}
function goToday(){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{timeZone:'Asia/Tehran',year:'numeric',month:'numeric',day:'numeric'})
    .formatToParts(new Date()).filter(x=>x.type!=='literal'&&x.type!=='era').map(x=>[x.type,+x.value]));
  setISO(isoOf(jalaliToGregorian(p.year,p.month,p.day)));
}
$('prevDay').onclick=()=>shiftDay(-1);
$('nextDay').onclick=()=>shiftDay(1);
$('todayBtn').onclick=goToday;
document.addEventListener('keydown',e=>{
  const tag=(e.target&&e.target.tagName||'').toLowerCase();
  if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='s'){e.preventDefault();downloadPNG();}return;}
  if(['input','textarea','select'].includes(tag)||e.altKey||e.shiftKey)return;
  if(e.key==='ArrowRight'){e.preventDefault();shiftDay(-1);}      // راست‌چین: راست = روز قبل
  else if(e.key==='ArrowLeft'){e.preventDefault();shiftDay(1);}
});

/* ---------- فونت ---------- */
function fontAvailable(){
  try{
    const c=document.createElement('canvas').getContext('2d'),t='سلام دیار قدمگاه ۱۲۳ یَا رَبَّ';
    const w=f=>{c.font='700 40px '+f;return c.measureText(t).width;};
    const v=w('Vazirmatn, monospace'),a=w('monospace'),b=w('serif, monospace');
    return Math.abs(v-a)>0.5||Math.abs(w('Vazirmatn, serif')-b)>0.5;
  }catch(_){return true;}
}
fontsReady.then(()=>{if(!fontAvailable())say('فونت وزیرمتن بارگذاری نشده است (اینترنت لازم است یا فونت هنوز ذخیره نشده). خروجی با فونت جایگزین ساخته می‌شود.','warn');});

/* ---------- هستهٔ خروجی (با پشتیبانی از ابعاد پویای قالب) ---------- */
const EXPORT_BTNS=['download','downloadHTML','downloadSVG','zip','quickPng','copyText'];
function lockUI(b){window.__exporting=b;EXPORT_BTNS.forEach(id=>{const el=$(id);if(el)el.disabled=b;});}
async function paintScaled(i,scale){
  await fontsReady;
  const d=dimsOf(templateMode);
  cv.width=d.w*scale;cv.height=d.h*scale;       // تغییر اندازه، بوم را پاک می‌کند
  ctx.setTransform(scale,0,0,scale,0,0);
  await draw(i);
}
function restoreCanvas(){
  const d=dimsOf(templateMode);
  cv.width=d.w;cv.height=d.h;ctx.setTransform(1,0,0,1,0,0);
}
async function withExport(fn){
  if(window.__exporting)return;
  lockUI(true);
  try{await fn();}
  catch(err){console.error(err);say('خطا: '+(err&&err.message||'ساخت خروجی انجام نشد')+' — اگر اندازهٔ خروجی بزرگ است، «استاندارد» را انتخاب کنید.','err');}
  finally{restoreCanvas();lockUI(false);render();}
}
const needDate=()=>{const i=cur();if(!i)say('لطفاً ابتدا یک تاریخ انتخاب کنید.','err');return i;};

async function downloadPNG(){
  await withExport(async()=>{
    const i=needDate();if(!i)return;const sc=scaleValue();const d=dimsOf(templateMode);
    say('در حال ساخت تصویر…');
    await paintScaled(i,sc);
    const blob=await blobOf('image/png');
    if(!blob)throw new Error('مرورگر نتوانست تصویر را بسازد');
    save(blob,stem(i)+scaleTag(sc)+'.png');
    say('✔ PNG آماده شد ('+fa(d.w*sc)+'×'+fa(d.h*sc)+'، حدود '+sizeText(blob.size)+')','',7000);
  });
}
async function downloadSvgOrHtml(kind){
  await withExport(async()=>{
    const i=needDate();if(!i)return;const sc=scaleValue();
    say('در حال ساخت فایل…');
    await paintScaled(i,sc);
    const text=kind==='html'?buildHTML(i):buildSVG(i);
    const blob=new Blob([text],{type:kind==='html'?'text/html;charset=utf-8':'image/svg+xml;charset=utf-8'});
    save(blob,stem(i)+scaleTag(sc)+(kind==='html'?'.html':'.svg'));
    say('✔ '+(kind==='html'?'HTML':'SVG')+' آماده شد ('+sizeText(blob.size)+')','',7000);
  });
}
$('download').onclick=downloadPNG;$('quickPng').onclick=downloadPNG;
$('downloadHTML').onclick=()=>downloadSvgOrHtml('html');
$('downloadSVG').onclick=()=>downloadSvgOrHtml('svg');

/* ---------- متن آمادهٔ انتشار ---------- */
function publishText(i){
  const ev=getEvents(i).map(e=>(e.holiday?'تعطیل رسمی: ':'')+e.title);
  const [ar,tr]=DHIKR[i.wd];
  const url=validUrl(chUrlEl.value);
  const L=['📅 '+WD[i.wd]+' '+fa(i.s.d)+' '+FA_M[i.s.m-1]+' '+fa(i.s.y),
          '🌙 '+fa(i.h.d)+' '+AR_M[i.h.m-1]+' '+fa(i.h.y),
          '🌍 '+fa(i.g.d)+' '+EN_M[i.g.m-1]+' '+fa(i.g.y)];
  if(ev.length){L.push('');L.push('📌 مناسبت‌ها:');ev.forEach(t=>L.push('• '+t));}
  const nt=(noteEl.value||'').trim();if(nt){L.push('');L.push(nt);}
  L.push('');L.push('🕌 ذکر روز '+WD[i.wd]+':');L.push(ar);L.push(tr);
  L.push('');L.push('🏡 '+(chEl.value||'').replace('@',''));if(url)L.push(url);
  return L.join('\n');
}
async function copyToClipboard(text){
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true;}}catch(_){}
  const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;top:0';
  document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(_){}ta.remove();return ok;
}
$('copyText').onclick=async()=>{
  const i=needDate();if(!i)return;
  say((await copyToClipboard(publishText(i)))?'✔ متن آمادهٔ انتشار کپی شد.':'کپی انجام نشد؛ مرورگر اجازه نداد.',
      'ok',5000);
};

/* ---------- تولید گروهی ---------- */
let zipAbort=false;
$('n7').onclick=()=>{nEl.value=7;persistSoon();};
$('nMonthEnd').onclick=()=>{const i=cur();if(!i)return;nEl.value=jalaliMonthLength(i.s.y,i.s.m)-i.s.d+1;persistSoon();};
$('cancelZip').onclick=()=>{zipAbort=true;$('cancelZip').disabled=true;$('zipReport').textContent='در حال لغو…';};
$('zip').onclick=async()=>{
  if(window.__exporting)return;
  const i0=needDate();if(!i0)return;
  if(typeof JSZip==='undefined'){say('کتابخانهٔ ZIP در دسترس نیست. فایل js/vendor/jszip.min.js را بررسی کنید.','err');return;}
  const n=Math.max(1,Math.min(366,Math.floor(+nEl.value)||1));nEl.value=n;
  const sc=scaleValue();
  if(n*sc*sc>60&&!confirm('ساخت '+fa(n)+' کارت با کیفیت «'+fa(sc)+' برابر» ممکن است روی گوشی کند باشد یا حافظه کم بیاورد. ادامه می‌دهید؟'))return;
  const [y,m,d]=dateEl.value.split('-').map(Number),off=+offEl.value||0;
  const prog=$('zipProgress'),rep=$('zipReport'),cancel=$('cancelZip');
  const ok=[],bad=[];zipAbort=false;
  lockUI(true);cancel.hidden=false;cancel.disabled=false;prog.hidden=false;prog.max=n;prog.value=0;rep.textContent='';
  const zip=new JSZip();
  try{
    await fontsReady;
    const dScale=dimsOf(templateMode);
    cv.width=dScale.w*sc;cv.height=dScale.h*sc;
    for(let k=0;k<n&&!zipAbort;k++){
      const dt=new Date(Date.UTC(y,m-1,d+k,12));
      const i=info(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate(),off);
      rep.textContent='در حال ساخت '+fa(k+1)+' از '+fa(n)+' — موفق: '+fa(ok.length)+'، ناموفق: '+fa(bad.length);
      try{
        ctx.setTransform(sc,0,0,sc,0,0);ctx.clearRect(0,0,dScale.w,dScale.h);
        await draw(i);
        const blob=await blobOf('image/png');
        if(!blob)throw new Error('blob');
        const name=stem(i)+scaleTag(sc)+'.png';
        zip.file(name,blob);ok.push(name);
      }catch(err){console.error(err);bad.push(i.s.y+'/'+pad(i.s.m)+'/'+pad(i.s.d));}
      prog.value=k+1;
      await new Promise(r=>setTimeout(r,0));   // فرصت به رابط برای پاسخ‌گویی و لغو
    }
    if(zipAbort){rep.textContent='✖ عملیات لغو شد؛ فایلی دانلود نشد.';return;}
    if(!ok.length)throw new Error('هیچ کارتی ساخته نشد');
    cancel.hidden=true;rep.textContent='در حال فشرده‌سازی…';
    zip.file('گزارش.txt',['گزارش تولید گروهی — تقویم دیار قدمگاه','قالب: '+templateMode,'مقیاس: '+sc+'×','موفق: '+ok.length,'ناموفق: '+bad.length,'',...ok,...(bad.length?['','ناموفق:',...bad]:[])].join('\n'));
    const out=await zip.generateAsync({type:'blob',compression:'STORE'});
    save(out,'calendar-cards-'+safeName(templateMode)+'-'+fa(ok.length)+'.zip');
    rep.textContent='✔ ZIP آماده شد — موفق: '+fa(ok.length)+'، ناموفق: '+fa(bad.length)+(bad.length?' ('+bad.join('، ')+')':'')+' — حجم: '+sizeText(out.size);
  }catch(err){console.error(err);rep.textContent='خطا در ساخت ZIP: '+(err&&err.message||'نامشخص');}
  finally{restoreCanvas();cancel.hidden=true;prog.hidden=true;lockUI(false);render();}
};

/* ---------- اعتبارسنجی لینک ---------- */
const urlHint=$('urlHint');
function updateUrlHint(){
  const raw=(chUrlEl.value||'').trim(),v=validUrl(raw);
  chUrlEl.classList.toggle('field-bad',v===false);chUrlEl.setAttribute('aria-invalid',v===false?'true':'false');
  urlHint.className='help';
  if(v===false){urlHint.textContent='لینک نامعتبر است؛ QR ساخته نمی‌شود و کلیک روی کانال کار نمی‌کند. نمونه: https://rubika.ir/...';urlHint.classList.add('bad');}
  else if(v&&showQREl.checked&&!getQRMatrix(raw)){urlHint.textContent='QR ساخته نشد (لینک بیش از حد بلند است یا کتابخانهٔ QR بارگذاری نشده).';urlHint.classList.add('bad');}
  else urlHint.textContent='';
}
chUrlEl.addEventListener('input',updateUrlHint);showQREl.addEventListener('change',updateUrlHint);

/* ---------- ذخیره و بازیابی تنظیمات ---------- */
const SKEY='diyar-calendar-settings-v1';
const COLOR_IDS=['frame','inner','panel','goldText','darkText','canvasBg'];
const settingsMsg=$('settingsMsg');
function collect(withEvents){
  const o={app:'diyar-calendar',v:1,template:templateMode,colors:{},channel:chEl.value,channelUrl:chUrlEl.value,phone:phEl.value,
    showQR:showQREl.checked,note:noteEl.value,n:+nEl.value||7,scale:scaleValue(),off:+offEl.value||0,
    dhikr:DHIKR.map(v=>[v[0],v[1]]),dhikrSettings:dhikrSettings.map(x=>({arabicSize:x.arabicSize,translationSize:x.translationSize,titleSize:x.titleSize}))};
  COLOR_IDS.forEach(k=>o.colors[k]=S[k]);
  if(withEvents)o.userEvents=getUserEventMap();
  return o;
}
const isStr=(v,max)=>typeof v==='string'&&v.length<=max;
const isInt=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
function sanitize(o){
  if(!o||typeof o!=='object'||Array.isArray(o)||o.v!==1)throw new Error('ساختار فایل تنظیمات معتبر نیست.');
  const c={};
  if(o.template!==undefined){if(!isStr(o.template,40)||!Object.prototype.hasOwnProperty.call(TEMPLATES,o.template))throw new Error('قالب ذخیره‌شده وجود ندارد.');c.template=o.template;}
  if(o.colors!==undefined){
    if(!o.colors||typeof o.colors!=='object')throw new Error('رنگ‌ها معتبر نیستند.');
    c.colors={};for(const k of COLOR_IDS)if(o.colors[k]!==undefined){if(!/^#[0-9a-fA-F]{6}$/.test(o.colors[k]))throw new Error('رنگ «'+k+'» معتبر نیست.');c.colors[k]=o.colors[k];}
  }
  for(const [k,max] of [['channel',80],['channelUrl',500],['note',2000]])if(o[k]!==undefined){if(!isStr(o[k],max))throw new Error('مقدار «'+k+'» معتبر نیست.');c[k]=o[k];}
  if(o.phone!==undefined){if(!isStr(o.phone,24)||!/^[+\d\s()-]*$/.test(o.phone))throw new Error('شمارهٔ تماس معتبر نیست.');c.phone=o.phone;}
  if(o.showQR!==undefined){if(typeof o.showQR!=='boolean')throw new Error('گزینهٔ QR معتبر نیست.');c.showQR=o.showQR;}
  if(o.n!==undefined){if(!isInt(o.n,1,366))throw new Error('تعداد روز معتبر نیست.');c.n=o.n;}
  if(o.scale!==undefined){if(![1,2,3].includes(o.scale))throw new Error('مقیاس خروجی معتبر نیست.');c.scale=o.scale;}
  if(o.off!==undefined){if(!isInt(o.off,-2,2))throw new Error('اصلاح قمری معتبر نیست.');c.off=o.off;}
  if(o.dhikr!==undefined){
    if(!Array.isArray(o.dhikr)||o.dhikr.length!==7||!o.dhikr.every(p=>Array.isArray(p)&&p.length===2&&isStr(p[0],300)&&isStr(p[1],400)))throw new Error('متن ذکرها معتبر نیست.');
    c.dhikr=o.dhikr.map(p=>[p[0],p[1]]);
  }
  if(o.dhikrSettings!==undefined){
    if(!Array.isArray(o.dhikrSettings)||o.dhikrSettings.length!==7||!o.dhikrSettings.every(x=>x&&isInt(x.arabicSize,18,44)&&isInt(x.translationSize,14,30)&&isInt(x.titleSize,20,36)))throw new Error('اندازهٔ متن ذکرها معتبر نیست.');
    c.dhikrSettings=o.dhikrSettings.map(x=>({arabicSize:x.arabicSize,translationSize:x.translationSize,titleSize:x.titleSize}));
  }
  if(o.userEvents!==undefined){
    const u=o.userEvents;if(!u||typeof u!=='object'||Array.isArray(u))throw new Error('مناسبت‌های شخصی معتبر نیستند.');
    const keys=Object.keys(u);if(keys.length>800)throw new Error('تعداد مناسبت‌های شخصی بیش از حد است.');
    c.userEvents={};for(const k of keys){
      const v=u[k];if(!/^\d{4}\/\d{2}\/\d{2}$/.test(k)||!v||typeof v!=='object'||!isStr(v.text,3000))throw new Error('یکی از مناسبت‌های شخصی معتبر نیست.');
      c.userEvents[k]={text:v.text,replaceOfficial:v.replaceOfficial===true};
    }
  }
  return c;
}
function apply(c){
  if(c.colors)COLOR_IDS.forEach(k=>{if(c.colors[k]){S[k]=c.colors[k];$(k).value=c.colors[k];}});
  if(c.channel!==undefined)chEl.value=c.channel;
  if(c.channelUrl!==undefined){chUrlEl.value=c.channelUrl;chUrlEl.oninput();}
  if(c.phone!==undefined){phEl.value=c.phone;phEl.oninput();}
  if(c.showQR!==undefined)showQREl.checked=c.showQR;
  if(c.note!==undefined)noteEl.value=c.note;
  if(c.n!==undefined)nEl.value=c.n;
  if(c.scale!==undefined)$('exportScale').value=String(c.scale);
  if(c.off!==undefined){offEl.value=c.off;try{localStorage.setItem('calendar-lunar-offset',String(c.off));}catch(_){}}
  if(c.dhikr)c.dhikr.forEach((p,d)=>{DHIKR[d]=[p[0],p[1]];});
  if(c.dhikrSettings)c.dhikrSettings.forEach((x,d)=>{dhikrSettings[d]=x;});
  if(c.dhikr||c.dhikrSettings)syncDhikrEditor();
  if(c.userEvents)setUserEventMap(c.userEvents);
  if(c.template){templateSelectEl.value=c.template;templateChanged();}
  syncEventEditor();updateEventInfo();updateUrlHint();render();
}
let persistTimer=null;
function persistNow(){try{localStorage.setItem(SKEY,JSON.stringify(collect(false)));}catch(_){/* حافظه پر یا خصوصی */}}
function persistSoon(){clearTimeout(persistTimer);persistTimer=setTimeout(persistNow,400);}
['input','change','click'].forEach(ev=>document.querySelector('.sidebar').addEventListener(ev,persistSoon,true));

(function restore(){
  let raw=null;try{raw=localStorage.getItem(SKEY);}catch(_){}
  if(!raw)return;
  try{apply(sanitize(JSON.parse(raw)));}
  catch(err){console.warn('تنظیمات ذخیره‌شده نادیده گرفته شد:',err.message);try{localStorage.removeItem(SKEY);}catch(_){}}
})();

$('exportSettings').onclick=()=>{
  const blob=new Blob([JSON.stringify(collect(true),null,2)],{type:'application/json'});
  save(blob,'diyar-calendar-settings.json');settingsMsg.textContent='✔ فایل تنظیمات و مناسبت‌های شخصی دریافت شد.';
};
$('importSettingsBtn').onclick=()=>$('importSettings').click();
$('importSettings').onchange=async e=>{
  const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
  settingsMsg.className='help';
  try{
    if(f.size>262144)throw new Error('فایل بیش از حد بزرگ است (حداکثر ۲۵۶ کیلوبایت).');
    let obj;try{obj=JSON.parse(await f.text());}catch(_){throw new Error('فایل JSON خراب یا ناخوانا است.');}
    apply(sanitize(obj));persistNow();settingsMsg.textContent='✔ تنظیمات بارگذاری شد.';
  }catch(err){settingsMsg.className='help bad';settingsMsg.textContent='✖ '+err.message;}
};
$('resetSettings').onclick=()=>{
  if(!confirm('همهٔ تنظیمات ذخیره‌شده (قالب، رنگ‌ها، متن‌ها، ذکرها، اصلاح قمری) به حالت اولیه برمی‌گردد. مناسبت‌های شخصی حذف نمی‌شوند. ادامه می‌دهید؟'))return;
  clearTimeout(persistTimer);
  try{localStorage.removeItem(SKEY);localStorage.removeItem('calendar-lunar-offset');}catch(_){}
  location.reload();
};

/* ---------- دسترس‌پذیری ---------- */
document.querySelectorAll('.color-row').forEach(r=>{const s=r.querySelector('span'),i=r.querySelector('input');if(s&&i&&!i.getAttribute('aria-label'))i.setAttribute('aria-label',s.textContent.trim());});
document.querySelectorAll('.sidebar input[type=file]').forEach(i=>{if(!i.getAttribute('aria-label'))i.setAttribute('aria-label',(i.closest('label')&&i.closest('label').textContent||'انتخاب فایل').trim().slice(0,40));});

updateUrlHint();
render();
})();
