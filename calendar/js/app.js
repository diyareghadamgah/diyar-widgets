'use strict';

const WD=['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
const DHIKR=[
 ['یَا ذَا الجَلالِ وَالإِکرام','ای صاحب شکوه و بزرگواری'],
 ['یَا قَاضِيَ الحَاجَات','ای برآورندهٔ حاجت‌ها'],
 ['یَا أَرحَمَ الرَّاحِمِین','ای مهربان‌ترین مهربانان'],
 ['یَا حَیُّ یَا قَیُّوم','ای زنده و پایدار'],
 ['لَا إِلٰهَ إِلَّا اللهُ الْمَلِكُ الْحَقُّ الْمُبِينُ','نیست خدایی جز الله، فرمانروای حق و آشکار'],
 ['اللَّهُمَّ صَلِّ عَلَی مُحَمَّدٍ وَآلِ مُحَمَّدٍ وَعَجِّلْ فَرَجَهُم','خدایا بر محمد و آل محمد درود فرست و در فرجشان تعجیل کن'],
 ['یَا رَبَّ الْعَالَمِین','ای پروردگار جهانیان']
];
const FA_M=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const AR_M=['محرم','صفر','ربیع‌الاول','ربیع‌الثانی','جمادی‌الاول','جمادی‌الثانی','رجب','شعبان','رمضان','شوال','ذی‌القعده','ذی‌الحجه'];
const EN_M=['ژانویه','فوریه','مارس','آوریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const dateEl=document.getElementById('date'),jYearEl=document.getElementById('jYear'),jMonthEl=document.getElementById('jMonth'),jDayEl=document.getElementById('jDay'),offEl=document.getElementById('off'),chEl=document.getElementById('channel'),chUrlEl=document.getElementById('channelUrl'),phEl=document.getElementById('phone'),nEl=document.getElementById('n'),noteEl=document.getElementById('note');
const zoomEl=document.getElementById('photoZoom'),photoXEl=document.getElementById('photoX'),photoYEl=document.getElementById('photoY'),zoomValEl=document.getElementById('zoomVal'),resetPhotoBtn=document.getElementById('resetPhoto');
const dhikrDayEl=document.getElementById('dhikrDay'),dhikrArabicEl=document.getElementById('dhikrArabic'),dhikrTranslationEl=document.getElementById('dhikrTranslation');
const dhikrArabicSizeEl=document.getElementById('dhikrArabicSize'),dhikrTranslationSizeEl=document.getElementById('dhikrTranslationSize'),dhikrTitleSizeEl=document.getElementById('dhikrTitleSize');
const dhikrArabicSizeValEl=document.getElementById('dhikrArabicSizeVal'),dhikrTranslationSizeValEl=document.getElementById('dhikrTranslationSizeVal'),dhikrTitleSizeValEl=document.getElementById('dhikrTitleSizeVal');
const resetDhikrDayBtn=document.getElementById('resetDhikrDay'),resetDhikrAllBtn=document.getElementById('resetDhikrAll');
const chLink=document.getElementById('channelLink'),phLink=document.getElementById('phoneLink'),showQREl=document.getElementById('showQR');
const templateSelectEl=document.getElementById('templateSelect');
const templateGridEl=document.getElementById('templateGrid');
const GROUP_ORDER=['عمومی','مناسبتی'];
const sortedTemplates=[...TEMPLATE_LIST].sort((a,b)=>GROUP_ORDER.indexOf(a.group||'عمومی')-GROUP_ORDER.indexOf(b.group||'عمومی'));
let lastGroup=null,optGroup=null;
sortedTemplates.forEach(t=>{
  const g=t.group||'عمومی';
  if(g!==lastGroup){
    lastGroup=g;
    optGroup=document.createElement('optgroup');optGroup.label=g;templateSelectEl.appendChild(optGroup);
    const h=document.createElement('div');h.className='tpl-group';h.textContent=g;templateGridEl.appendChild(h);
  }
  const o=document.createElement('option');o.value=t.id;o.textContent=t.label;optGroup.appendChild(o);
  const c=document.createElement('div');c.className='template-card';c.dataset.template=t.id;
  const sw=document.createElement('div');sw.className='template-swatch';sw.style.background=t.swatch;
  c.appendChild(sw);c.appendChild(document.createTextNode(t.short||t.label));templateGridEl.appendChild(c);
});
templateSelectEl.value=DEFAULT_TEMPLATE;
const templateCards=[...templateGridEl.querySelectorAll('.template-card')];
templateCards.forEach(c=>c.classList.toggle('active',c.dataset.template===DEFAULT_TEMPLATE));

phEl.style.direction='ltr';phEl.style.textAlign='left';
chUrlEl.style.direction='ltr';chUrlEl.style.textAlign='left';

let logo=null,photo=null;
let photoZoom=1,photoX=0,photoY=0;
const DHIKR_DEFAULT=DHIKR.map(v=>[...v]);
const dhikrSettings=Array.from({length:7},()=>({arabicSize:31,translationSize:24,titleSize:29}));
let templateMode=DEFAULT_TEMPLATE;
function TS(){return (TEMPLATES[templateMode]||TEMPLATES.classic).style;}
function templateChanged(){templateMode=templateSelectEl.value;templateCards.forEach(c=>c.classList.toggle('active',c.dataset.template===templateMode));render();}

const S={frame:'#d4a437',inner:'#f7f1d9',panel:'#063d35',goldText:'#f0c34f',darkText:'#10201c',canvasBg:'#edf2ef'};

const IMG_AREA={x:73,y:73,w:339,h:520};
const CLICK_PHONE={x:70,y:1005,w:410,h:130};
const CLICK_CHANNEL_FOOTER={x:620,y:1005,w:350,h:80};
const CLICK_CHANNEL_PILL={x:485,y:566,w:510,h:46};

function jalaliToGregorian(jy,jm,jd){
  jy=Number(jy);jm=Number(jm);jd=Number(jd);const gy=jy+621;
  const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  let leapJ=-14,jp=breaks[0],jump=0;
  for(let i=1;i<breaks.length;i++){
    const jm0=breaks[i]; jump=jm0-jp;
    if(jy<jm0) break;
    leapJ += Math.floor(jump/33)*8 + Math.floor((jump%33)/4);
    jp=jm0;
  }
  const n=jy-jp;
  leapJ += Math.floor(n/33)*8 + Math.floor((n%33+3)/4);
  if(jump%33===4 && jump-n===4) leapJ++;
  const leapG=Math.floor(gy/4)-Math.floor((Math.floor(gy/100)+1)*3/4)-150;
  const march=20+leapJ-leapG;
  const gday=jm<=6?(jm-1)*31+jd-1:(jm-7)*30+jd-1+186;
  return new Date(Date.UTC(gy,2,march,12)+gday*864e5);
}
function gregorianToJalali(gdate){
  const gy=gdate.getUTCFullYear(),gm=gdate.getUTCMonth()+1,gd=gdate.getUTCDate(),gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
  let gy2=gy+1,days=355666+365*gy+Math.floor(gy2/4)-Math.floor(gy2/100)+Math.floor(gy2/400)+gd+gdm[gm-1];
  if(gm>2&&((gy%4===0&&gy%100!==0)||gy%400===0))days++;
  let jy=-1595+33*Math.floor(days/12053);days%=12053;jy+=4*Math.floor(days/1461);days%=1461;
  if(days>365){jy+=Math.floor((days-1)/365);days=(days-1)%365;}
  const jm=days<186?1+Math.floor(days/31):7+Math.floor((days-186)/30),jd=1+(days<186?days%31:(days-186)%30);
  return {y:jy,m:jm,d:jd};
}
const JMONTHS=FA_M;
function fillJalaliSelectors(){
  if(!jYearEl)return;for(let y=1300;y<=1500;y++){const o=document.createElement('option');o.value=y;o.textContent=fa(y);jYearEl.appendChild(o);}
  JMONTHS.forEach((name,i)=>{const o=document.createElement('option');o.value=i+1;o.textContent=name;jMonthEl.appendChild(o);});
}
function jalaliMonthLength(y,m){if(m<=6)return 31;if(m<=11)return 30;const r=y%33;return [1,5,9,13,17,22,26,30].includes(r)?30:29;}
function refreshJalaliDays(){
  const y=+jYearEl.value||1405,m=+jMonthEl.value||1,old=+jDayEl.value||1,max=jalaliMonthLength(y,m);jDayEl.innerHTML='';
  for(let d=1;d<=max;d++){const o=document.createElement('option');o.value=d;o.textContent=fa(d);jDayEl.appendChild(o);}jDayEl.value=Math.min(old,max);
}
function setGregorianISOFromJalali(){const d=jalaliToGregorian(+jYearEl.value,+jMonthEl.value,+jDayEl.value);dateEl.value=d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');}
function syncJalaliFromISO(){const v=dateEl.value;if(!v)return;const [y,m,d]=v.split('-').map(Number),j=gregorianToJalali(new Date(Date.UTC(y,m-1,d,12)));jYearEl.value=j.y;jMonthEl.value=j.m;refreshJalaliDays();jDayEl.value=j.d;}
fillJalaliSelectors();

function parts(date,cal){
  const p=new Intl.DateTimeFormat('en-US-u-ca-'+cal+'-nu-latn',{day:'numeric',month:'numeric',year:'numeric',timeZone:'UTC'}).formatToParts(date);
  const g=t=>+p.find(x=>x.type===t).value.replace(/\D/g,'');
  return {d:g('day'),m:g('month'),y:g('year')};
}
function info(y,m,d,off){
  const dt=new Date(Date.UTC(y,m-1,d,12));
  const hj=new Date(dt.getTime()+off*864e5);
  return {wd:dt.getUTCDay(),s:parts(dt,'persian'),h:parts(hj,'islamic-umalqura'),g:{d,m,y}};
}
function cur(){
  const v=dateEl.value;if(!v)return null;
  const [y,m,d]=v.split('-').map(Number);if(!y||!m||!d)return null;
  return info(y,m,d,+offEl.value||0);
}

function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function grad(a,b,y0,y1){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,a);g.addColorStop(.5,b);g.addColorStop(1,a);return g;}
function fit(t,w,size,weight,font){weight=weight||900;font=font||'Vazirmatn';const safeW=w*.86;while(size>10){ctx.font=weight+' '+size+'px '+font+', Arial, sans-serif';if(ctx.measureText(String(t||'')).width<=safeW)break;size-=1;}return size;}
function panel(x,y,w,h,r){
  const t=TS();r=r==null?t.panelR:Math.min(r,t.panelR);
  ctx.save();ctx.shadowColor='#0004';ctx.shadowBlur=templateMode==='blackgold'?22:18;ctx.shadowOffsetY=6;ctx.fillStyle=t.panel;rr(x,y,w,h,r);ctx.fill();ctx.restore();
  ctx.strokeStyle=t.frame;ctx.lineWidth=templateMode==='blackgold'?5:6;rr(x,y,w,h,r);ctx.stroke();
  ctx.strokeStyle=t.inner;ctx.lineWidth=2;rr(x+10,y+10,w-20,h-20,Math.max(4,r-7));ctx.stroke();
}
function wrapText(text,maxW,font){
  ctx.font=font;const out=[];
  const paras=String(text).split(/\r?\n/);
  for(const para of paras){
    if(!para.trim()){out.push('');continue;}
    const words=para.split(/\s+/);let line='';
    for(const w of words){const test=line?line+' '+w:w;if(ctx.measureText(test).width<=maxW)line=test;else{if(line)out.push(line);line=w;}}
    if(line)out.push(line);
  }
  return out;
}

function getQRMatrix(url){
  if(typeof qrcode!=='function')return null;
  try{
    const qr=qrcode(0,'M');qr.addData(url,'Byte');qr.make();
    const count=qr.getModuleCount();const matrix=[];
    for(let r=0;r<count;r++){const row=[];for(let c=0;c<count;c++)row.push(qr.isDark(r,c));matrix.push(row);}
    return {count,matrix};
  }catch(err){console.error('QR:',err);return null;}
}
function drawQRCanvas(data,boxX,boxY,boxSize){
  if(!data)return;
  ctx.fillStyle='#fff';rr(boxX,boxY,boxSize,boxSize,10);ctx.fill();
  ctx.strokeStyle=S.frame;ctx.lineWidth=2;rr(boxX,boxY,boxSize,boxSize,10);ctx.stroke();
  const quiet=Math.max(6,boxSize*.08);const dataSize=boxSize-quiet*2;const cell=dataSize/data.count;
  ctx.fillStyle=S.darkText;
  for(let r=0;r<data.count;r++)for(let c=0;c<data.count;c++)if(data.matrix[r][c]){
    const px=boxX+quiet+c*cell,py=boxY+quiet+r*cell;
    ctx.fillRect(Math.round(px),Math.round(py),Math.ceil(cell),Math.ceil(cell));
  }
}

function background(){
  const t=TS();ctx.fillStyle=t.bg;ctx.fillRect(0,0,cv.width,cv.height);
  ctx.save();ctx.globalAlpha=templateMode==='blackgold'?.06:.10;
  ctx.strokeStyle=templateMode==='ribbon'?'#8b6b2b':'#6d8b86';ctx.lineWidth=2;
  for(let x=25;x<cv.width;x+=88)for(let y=20;y<cv.height;y+=92){
    ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-9,y);ctx.lineTo(x+9,y);ctx.moveTo(x,y-9);ctx.lineTo(x,y+9);ctx.stroke();
  }
  ctx.restore();
}

let renderSeq=0;
async function draw(i){
  await fontsReady;
  (TEMPLATES[templateMode]||TEMPLATES.classic).draw(i);
}

function render(){
  const seq=++renderSeq;const i=cur();
  ctx.clearRect(0,0,cv.width,cv.height);
  if(!i){
    background();
    ctx.fillStyle=S.darkText;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='700 26px Vazirmatn';ctx.fillText('لطفاً تاریخ را انتخاب کنید',cv.width/2,cv.height/2);
    return;
  }
  draw(i).then(()=>{if(seq!==renderSeq)return;}).catch(err=>{
    console.error('Render error:',err);background();
    ctx.fillStyle='#9b2c2c';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='700 22px Vazirmatn';ctx.fillText('خطا در نمایش تقویم',cv.width/2,cv.height/2);
  });
}

const fontsReady=(async()=>{
  try{
    await document.fonts.load('900 40px Vazirmatn');
    await document.fonts.load('700 40px Vazirmatn');
    await document.fonts.load('500 40px Vazirmatn');
    await document.fonts.ready;
  }catch(_){}
})();

/* شاخهٔ برگ تزئینی */

/* آیکن دوربین برای جای خالی عکس */

/* سیلوئت مسجد */

function buildSVG(i){return buildRasterSVG(i);}

const xesc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

function buildRasterSVG(i){
  const dataUrl=cv.toDataURL('image/png');
  const url=normalizeUrl(chUrlEl.value);
  const phone=(phEl.value||'').replace(/[^\d+]/g,'');
  let overlay='';
  if(url){
    overlay+=`<a href="${xesc(url)}" xlink:href="${xesc(url)}" target="_blank">
      <rect x="430" y="980" width="${cv.width-430}" height="${cv.height-980}" fill="transparent" style="cursor:pointer"/>
      <rect x="440" y="600" width="560" height="80" fill="transparent" style="cursor:pointer"/>
    </a>`;
  }
  if(phone){
    overlay+=`<a href="tel:${phone}"><rect x="0" y="980" width="430" height="${cv.height-980}" fill="transparent" style="cursor:pointer"/></a>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${cv.width}" height="${cv.height}" viewBox="0 0 ${cv.width} ${cv.height}">
  <image href="${dataUrl}" xlink:href="${dataUrl}" width="${cv.width}" height="${cv.height}" preserveAspectRatio="none"/>
  ${overlay}
</svg>`;
}

function buildHTML(i){
  const svg=buildSVG(i).replace(/^<\?xml[^?]*\?>\s*/,'');
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>کارت تقویم - ${xesc(dateEl.value)}</title>
<style>
  html,body{margin:0;padding:0;background:#edf2ef;font-family:Vazirmatn,Tahoma,sans-serif}
  .wrap{display:flex;justify-content:center;padding:16px}
  svg{max-width:100%;height:auto;border-radius:13px;box-shadow:0 6px 30px rgba(0,0,0,.18);background:#fff}
</style>
</head>
<body><div class="wrap">
${svg}
</div></body>
</html>`;
}

function normalizeUrl(u){u=(u||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u;return u;}

function toCanvas(e){const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*cv.width/r.width,y:(e.clientY-r.top)*cv.height/r.height};}
const inRect=(r,x,y)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
const inPhoneRegion=(x,y)=>inRect(CLICK_PHONE,x,y);
function channelRegions(){
  const map={
    royal:[{x:575,y:566,w:335,h:46},{x:570,y:1035,w:350,h:70}],
    classic:[{x:630,y:1038,w:320,h:64},{x:585,y:600,w:420,h:60}],
    light:[{x:640,y:1015,w:300,h:70},{x:485,y:566,w:510,h:46}],
    blackgold:[{x:680,y:1018,w:230,h:54}],
    ribbon:[{x:365,y:350,w:310,h:80},{x:665,y:1020,w:300,h:60}]
  };
  return map[templateMode]||[{x:485,y:566,w:510,h:46},{x:620,y:1005,w:350,h:80}];
}
const inChannelRegion=(x,y)=>channelRegions().some(r=>inRect(r,x,y));
const inPhotoArea=(x,y)=>inRect((TEMPLATES[templateMode]&&TEMPLATES[templateMode].photoArea)||IMG_AREA,x,y);
const phoneHref=v=>'tel:'+(v||'').replace(/[^\d+]/g,'');

function openPhone(){const p=(phEl.value||'').replace(/[^\d+]/g,'');if(p)window.open('tel:'+p,'_blank');}
function openChannel(){const u=normalizeUrl(chUrlEl.value);if(u)window.open(u,'_blank');}

let pointerDown=null,moved=false;
const activePointers=new Map();
let pinchStart=null;

cv.addEventListener('pointerdown',e=>{
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  const {x,y}=toCanvas(e);
  const isPhoto=inPhotoArea(x,y)&&!!photo;
  if(activePointers.size===1){
    pointerDown={cx:e.clientX,cy:e.clientY,isPhoto,px:photoX,py:photoY};
    moved=false;
    if(isPhoto)cv.style.cursor='grabbing';
  }else if(activePointers.size===2&&photo){
    const pts=[...activePointers.values()];
    const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;
    const midX=(pts[0].x+pts[1].x)/2,midY=(pts[0].y+pts[1].y)/2;
    pinchStart={distance:Math.hypot(dx,dy),midX,midY,zoom:photoZoom,x:photoX,y:photoY};
    moved=true;pointerDown=null;cv.style.cursor='grabbing';
  }
  e.preventDefault();
},{passive:false});

window.addEventListener('pointermove',e=>{
  if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinchStart&&activePointers.size>=2&&photo){
    const pts=[...activePointers.values()].slice(0,2);
    const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;
    const dist=Math.max(1,Math.hypot(dx,dy));
    const midX=(pts[0].x+pts[1].x)/2,midY=(pts[0].y+pts[1].y)/2;
    const r=cv.getBoundingClientRect();const sx=cv.width/r.width,sy=cv.height/r.height;
    photoZoom=Math.max(1,Math.min(3,pinchStart.zoom*dist/pinchStart.distance));
    photoX=Math.max(-300,Math.min(300,pinchStart.x+(midX-pinchStart.midX)*sx));
    photoY=Math.max(-300,Math.min(300,pinchStart.y+(midY-pinchStart.midY)*sy));
    updatePhotoUI();render();e.preventDefault();return;
  }
  if(!pointerDown){
    if(e.pointerType==='mouse'){
      const {x,y}=toCanvas(e);
      if(inPhoneRegion(x,y)||inChannelRegion(x,y))cv.style.cursor='pointer';
      else if(inPhotoArea(x,y)&&photo)cv.style.cursor='grab';
      else cv.style.cursor='default';
    }
    return;
  }
  const dx=e.clientX-pointerDown.cx;
  const dy=e.clientY-pointerDown.cy;
  if(Math.abs(dx)+Math.abs(dy)>3)moved=true;
  if(pointerDown.isPhoto&&moved){
    const r=cv.getBoundingClientRect();const sx=cv.width/r.width,sy=cv.height/r.height;
    photoX=Math.max(-300,Math.min(300,pointerDown.px+dx*sx));
    photoY=Math.max(-300,Math.min(300,pointerDown.py+dy*sy));
    updatePhotoUI();render();e.preventDefault();
  }
},{passive:false});

function endPointer(e){
  activePointers.delete(e.pointerId);
  if(activePointers.size<2)pinchStart=null;
  if(activePointers.size===0){pointerDown=null;cv.style.cursor='default';}
}
window.addEventListener('pointerup',endPointer);
window.addEventListener('pointercancel',endPointer);
cv.addEventListener('click',e=>{
  if(moved){moved=false;return;}
  const {x,y}=toCanvas(e);
  if(inPhoneRegion(x,y))openPhone();
  else if(inChannelRegion(x,y))openChannel();
});

function updatePhotoUI(){
  zoomEl.value=photoZoom;photoXEl.value=photoX;photoYEl.value=photoY;
  const z=photoZoom.toFixed(2).replace(/\.?0+$/,'')||'1';
  zoomValEl.textContent=fa(z);
}
zoomEl.oninput=()=>{photoZoom=+zoomEl.value;updatePhotoUI();render();};
photoXEl.oninput=()=>{photoX=+photoXEl.value;updatePhotoUI();render();};
photoYEl.oninput=()=>{photoY=+photoYEl.value;updatePhotoUI();render();};
resetPhotoBtn.onclick=()=>{photoZoom=1;photoX=0;photoY=0;updatePhotoUI();render();};
templateSelectEl.onchange=templateChanged;
templateCards.forEach(c=>c.addEventListener('click',()=>{templateSelectEl.value=c.dataset.template;templateChanged();}));

function syncDhikrEditor(){
  const d=+dhikrDayEl.value;
  dhikrArabicEl.value=DHIKR[d][0];dhikrTranslationEl.value=DHIKR[d][1];
  dhikrArabicSizeEl.value=dhikrSettings[d].arabicSize;
  dhikrTranslationSizeEl.value=dhikrSettings[d].translationSize;
  dhikrTitleSizeEl.value=dhikrSettings[d].titleSize;
  dhikrArabicSizeValEl.textContent=fa(dhikrSettings[d].arabicSize);
  dhikrTranslationSizeValEl.textContent=fa(dhikrSettings[d].translationSize);
  dhikrTitleSizeValEl.textContent=fa(dhikrSettings[d].titleSize);
}
dhikrDayEl.onchange=syncDhikrEditor;
dhikrArabicEl.oninput=()=>{const d=+dhikrDayEl.value;DHIKR[d][0]=dhikrArabicEl.value;render();};
dhikrTranslationEl.oninput=()=>{const d=+dhikrDayEl.value;DHIKR[d][1]=dhikrTranslationEl.value;render();};
dhikrArabicSizeEl.oninput=()=>{const d=+dhikrDayEl.value;dhikrSettings[d].arabicSize=+dhikrArabicSizeEl.value;syncDhikrEditor();render();};
dhikrTranslationSizeEl.oninput=()=>{const d=+dhikrDayEl.value;dhikrSettings[d].translationSize=+dhikrTranslationSizeEl.value;syncDhikrEditor();render();};
dhikrTitleSizeEl.oninput=()=>{const d=+dhikrDayEl.value;dhikrSettings[d].titleSize=+dhikrTitleSizeEl.value;syncDhikrEditor();render();};
resetDhikrDayBtn.onclick=()=>{const d=+dhikrDayEl.value;DHIKR[d]=[...DHIKR_DEFAULT[d]];dhikrSettings[d]={arabicSize:31,translationSize:24,titleSize:29};syncDhikrEditor();render();};
resetDhikrAllBtn.onclick=()=>{for(let d=0;d<7;d++){DHIKR[d]=[...DHIKR_DEFAULT[d]];dhikrSettings[d]={arabicSize:31,translationSize:24,titleSize:29};}syncDhikrEditor();render();};
syncDhikrEditor();

function updateEventInfo(){const i=cur();const el=document.getElementById('eventInfo');if(!el)return;const ev=i?getEvents(i):[];el.textContent=ev.length?ev.map(e=>(e.holiday?'تعطیل رسمی: ':'')+e.title).join(' • '):'برای این روز مناسبت ثبت‌شده‌ای در دادهٔ ۱۴۰۵ نیست.';}
function jalaliChanged(){refreshJalaliDays();setGregorianISOFromJalali();render();updateEventInfo();}
jYearEl.onchange=jalaliChanged;jMonthEl.onchange=jalaliChanged;jDayEl.onchange=()=>{setGregorianISOFromJalali();render();updateEventInfo();};
dateEl.onchange=()=>{syncJalaliFromISO();render();updateEventInfo();};
offEl.onchange=()=>{localStorage.setItem('calendar-lunar-offset',String(offEl.value));render();updateEventInfo();};
chEl.oninput=render;
showQREl.onchange=render;
chUrlEl.oninput=()=>{const url=(chUrlEl.value||'').trim();chLink.href=url||'#';chLink.style.display=url?'inline-flex':'none';render();};
phEl.oninput=()=>{phLink.href=phoneHref(phEl.value);render();};
noteEl.oninput=render;

['frame','inner','panel','goldText','darkText','canvasBg'].forEach(id=>{
  document.getElementById(id).oninput=e=>{S[id]=e.target.value;render();};
});

const blobUrls={logo:null,photo:null};
(function restoreOffset(){const saved=localStorage.getItem('calendar-lunar-offset');if(saved!==null&&/^-?\d+$/.test(saved))offEl.value=Math.max(-2,Math.min(2,+saved));})();
function fileInput(inputId,which,previewId){
  document.getElementById(inputId).onchange=e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    if(blobUrls[which])URL.revokeObjectURL(blobUrls[which]);
    const url=URL.createObjectURL(f);blobUrls[which]=url;
    const im=new Image();
    im.onload=()=>{
      if(which==='logo')logo=im;
      else{photo=im;photoZoom=1;photoX=0;photoY=0;updatePhotoUI();}
      const box=document.getElementById(previewId);
      box.hidden=false;box.querySelector('img').src=url;
      requestAnimationFrame(render);
    };
    im.onerror=()=>{URL.revokeObjectURL(url);blobUrls[which]=null;alert('بارگذاری تصویر انجام نشد.');};
    im.src=url;
  };
}
fileInput('logo','logo','logoPreview');
fileInput('photo','photo','photoPreview');

function save(blob,name){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
const blobOf=(type,q)=>new Promise(res=>cv.toBlob(res,type||'image/png',q));

document.getElementById('download').onclick=async()=>{
  const i=cur();if(!i){alert('لطفاً ابتدا یک تاریخ انتخاب کنید.');return;}
  await draw(i);
  save(await blobOf('image/png'),'calendar-'+dateEl.value+'.png');
};
document.getElementById('downloadHTML').onclick=async()=>{
  const i=cur();if(!i){alert('لطفاً ابتدا یک تاریخ انتخاب کنید.');return;}
  await fontsReady;await draw(i);
  const html=buildHTML(i);
  save(new Blob([html],{type:'text/html;charset=utf-8'}),'calendar-'+dateEl.value+'.html');
};
document.getElementById('downloadSVG').onclick=async()=>{
  const i=cur();if(!i){alert('لطفاً ابتدا یک تاریخ انتخاب کنید.');return;}
  await fontsReady;await draw(i);
  const svg=buildSVG(i);
  save(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'calendar-'+dateEl.value+'.svg');
};
document.getElementById('zip').onclick=async(e)=>{
  const btn=e.currentTarget;const original=btn.textContent;
  const i0=cur();if(!i0){alert('لطفاً ابتدا یک تاریخ انتخاب کنید.');return;}
  const n=Math.max(1,Math.min(366,+nEl.value||1));
  const [y,m,d]=dateEl.value.split('-').map(Number);
  const off=+offEl.value||0;
  if(typeof JSZip==='undefined'){alert('کتابخانهٔ ZIP در دسترس نیست. فایل محلی js/vendor/jszip.min.js را بررسی کنید.');return;}
  const zip=new JSZip();
  btn.disabled=true;
  try{
    for(let k=0;k<n;k++){
      btn.textContent='در حال ساخت '+fa(k+1)+'/'+fa(n)+' …';
      const dt=new Date(Date.UTC(y,m-1,d+k,12));
      await draw(info(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate(),off));
      zip.file(dt.toISOString().slice(0,10)+'.png',await blobOf('image/png'));
      await new Promise(r=>setTimeout(r,0));
    }
    btn.textContent='در حال فشرده‌سازی …';
    const out=await zip.generateAsync({type:'blob'});
    save(out,'calendar-cards.zip');
  }catch(err){console.error(err);alert('خطا در ساخت ZIP.');}
  finally{btn.disabled=false;btn.textContent=original;render();}
};

(function init(){
  // تاریخ پیش‌فرض را بر اساس تاریخ محلی ایران تعیین کن، نه منطقهٔ زمانی دستگاه کاربر.
  // این کار مانع یک‌روز عقب/جلو افتادن تاریخ شمسی در نیمه‌شب می‌شود.
  const tehranParts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Tehran', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(new Date());
  const tp=Object.fromEntries(tehranParts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  dateEl.value=tp.year+'-'+tp.month+'-'+tp.day;
  syncJalaliFromISO();
  phLink.href=phoneHref(phEl.value);
  updatePhotoUI();
  updateEventInfo();
  render();
})();
