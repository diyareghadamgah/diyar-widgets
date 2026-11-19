(function(){
'use strict';
const $=s=>document.querySelector(s);
const API=['https://de1.api.radio-browser.info/json','https://de2.api.radio-browser.info/json','https://all.api.radio-browser.info/json'];
const IRIB=[['radio-iran','رادیو ایران','radio-iran'],['radio-javan','رادیو جوان','radio-javan'],['radio-payam','رادیو پیام','radio-payam'],['radio-tehran','رادیو تهران','radio-tehran'],['radio-varzesh','رادیو ورزش','radio-varzesh'],['radio-ava','رادیو آوا','radio-ava'],['radio-quran','رادیو قرآن','radio-quran'],['radio-farhang','رادیو فرهنگ','radio-farhang'],['radio-salamat','رادیو سلامت','radio-salamat'],['radio-eghtesad','رادیو اقتصاد','radio-eghtesad'],['radio-maaref','رادیو معارف','radio-maaref'],['radio-goftogoo','رادیو گفت‌وگو' ,'radio-goftogoo'],['radio-namayesh','رادیو نمایش','radio-namayesh'],['radio-saba','رادیو صبا','radio-saba'],['radio-ziarat','رادیو زیارت','radio-ziarat'],['radio-telavat','رادیو تلاوت','radio-telavat'],['radio-tartil','رادیو ترتیل','radio-tartil'],['radio-monasebati','رادیو مناسبتی','radio-monasebati']].map(([id,name,slug])=>({stationuuid:'irib-'+id,name,country:'ایران',countrycode:'IR',language:'Persian',tags:'صدا و سیما IRIB رادیو ایران فارسی',url:'http://s1.cdn1.iranseda.ir:1935/liveedge/'+slug+'/playlist.m3u8',url_resolved:'http://s1.cdn1.iranseda.ir:1935/liveedge/'+slug+'/playlist.m3u8',codec:'HLS',bitrate:0,votes:999999,irib:true}));
const state={items:[],filter:'all',query:'',loading:false,current:null,favs:[],custom:[],api:0,initialized:false,playToken:0,nativePlaying:false};
function lsGet(key,fallback){try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v)}catch{return fallback}}
function lsSet(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){console.warn('[NaghmeRadio] storage failed',e);return false}}

function buildProxyUrl(originalUrl) {
    return 'https://naghme-radio-proxy.diyareghadamgah.workers.dev/?url=' + encodeURIComponent(originalUrl);
}
let radioHlsLoader=null;
function loadRadioHls(){
 if(window.Hls)return Promise.resolve(window.Hls);
 if(!radioHlsLoader){radioHlsLoader=new Promise((resolve,reject)=>{
  const sources=['hls.min.js','https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js','https://unpkg.com/hls.js@1.5.20/dist/hls.min.js'];let i=0;
  const next=()=>{if(i>=sources.length){radioHlsLoader=null;reject(Error('کتابخانه پخش HLS بارگیری نشد؛ اتصال اینترنت را بررسی کن.'));return}
   const script=document.createElement('script');script.src=sources[i++];script.async=true;
   script.onload=()=>window.Hls?resolve(window.Hls):next();script.onerror=next;document.head.appendChild(script);
  };next();
 })}
 return radioHlsLoader;
}
const audio=()=>$('#radioAudio');
const norm=s=>String(s||'').toLocaleLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
state.favs=lsGet('naghmeRadioFavs',[]);if(!Array.isArray(state.favs))state.favs=[];
state.custom=lsGet('naghmeRadioCustom',[]);if(!Array.isArray(state.custom))state.custom=[];
state.custom=state.custom.filter(s=>s&&s.stationuuid&&(s.url_resolved||s.url));
function status(s){const el=$('#radioStatus');if(el)el.textContent=s||''}
async function request(path){
 let last;
 for(let i=0;i<API.length;i++){
  const n=(state.api+i)%API.length;let timer,controller;
  try{
   if(typeof AbortController!=='undefined')controller=new AbortController();
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{try{controller&&controller.abort()}catch{}reject(Error('مهلت پاسخ سرور تمام شد'))},9000)});
   const r=await Promise.race([fetch(API[n]+path,{headers:{Accept:'application/json'},signal:controller?controller.signal:undefined}),timeout]);
   clearTimeout(timer);if(!r.ok)throw Error('HTTP '+r.status);state.api=n;return await r.json();
  }catch(e){clearTimeout(timer);last=e}
 }
 throw last||Error('اتصال برقرار نشد');
}
function unique(list){const m=new Map();(list||[]).forEach(s=>{if(s&&s.stationuuid&&(s.url_resolved||s.url)&&!m.has(s.stationuuid))m.set(s.stationuuid,s)});return [...m.values()]}
async function loadPublicRadios(){
 try{
  const r=await fetch(new URL('public-radio.m3u',document.baseURI).href,{cache:'no-cache'});if(!r.ok)throw Error('HTTP '+r.status);
  const body=await r.text(),out=[];let name='',group='جهان';
  for(const raw of body.split(/\\r?\\n/)){
   const line=raw.trim();if(!line)continue;
   if(line.startsWith('#EXTINF:')){const comma=line.lastIndexOf(',');name=comma>=0?line.slice(comma+1).trim():'رادیو عمومی';const g=line.match(/group-title="([^"]+)"/i);group=g?g[1]:'جهان';continue}
   if(line.startsWith('#'))continue;
    if(/^https?:\/\//i.test(line)&&name){const code=(line.match(/tvg-country="([A-Z]{2})"/i)||[])[1]||'';const country=code==='CH'?'سوئیس':code==='GB'?'بریتانیا':code==='US'?'آمریکا':group;out.push({stationuuid:'public-'+out.length+'-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,country,countrycode:code,language:'',tags:'public radio '+group,url:line,url_resolved:line,codec:/\.m3u8(?:$|[?#])/i.test(line)?'HLS':'MP3',bitrate:0,votes:0,publicRadio:true});name=''}
  }
  return out;
 }catch(e){console.warn('[NaghmeRadio] public M3U unavailable',e);return []}
}
async function load(){
 if(state.loading)return;state.loading=true;status('در حال دریافت فهرست ایستگاه‌ها…');render();
 try{
  const qs=['/stations/search?language=persian&hidebroken=true&is_https=true&order=votes&reverse=true&limit=80','/stations/search?countrycode=IR&hidebroken=true&is_https=true&order=votes&reverse=true&limit=80','/stations/topvote?is_https=true&limit=80'];
  const [data,publicRadios]=await Promise.all([Promise.all(qs.map(p=>request(p).catch(()=>[]))),loadPublicRadios()]);
  const seen=new Set(IRIB.map(s=>norm(s.name)));
  const discovered=unique([...data.flat(),...publicRadios]).filter(s=>{const key=norm(s.name);if(seen.has(key))return false;seen.add(key);return true});
  state.items=[...IRIB,...discovered,...state.custom].sort((a,b)=>(Number(b.votes)||0)-(Number(a.votes)||0));
  status(state.items.length?'ایستگاه‌ها آماده‌اند؛ برای پخش یکی را انتخاب کن.':'ایستگاهی پیدا نشد؛ دوباره تلاش کن.');
 }catch(e){state.items=[...IRIB,...state.custom];status('دریافت فهرست جهانی ناموفق بود؛ ایستگاه‌های ذخیره‌شده همچنان در دسترس‌اند.')}
 finally{state.loading=false;render()}
}
function filtered(){
 let a=state.items;
 if(state.filter==='irib')a=a.filter(s=>s.irib===true);
 if(state.filter==='iran')a=a.filter(s=>s.countrycode==='IR'||norm(s.country).includes('iran')||norm(s.country).includes('ایران'));
 if(state.filter==='persian')a=a.filter(s=>norm(s.language).includes('persian')||norm(s.language).includes('farsi')||norm(s.name).match(/فارسی|ایران|persian|farsi/));
 if(state.filter==='world')a=a.filter(s=>s.countrycode!=='IR');
 if(state.filter==='favorites')a=a.filter(s=>state.favs.includes(s.stationuuid));
 if(state.query){const q=norm(state.query);a=a.filter(s=>norm([s.name,s.country,s.language,s.tags].join(' ')).includes(q))}
 return a;
}
function render(){
 const box=$('#radioStations');if(!box)return;
 const list=filtered();const count=$('#radioCount');if(count)count.textContent=list.length.toLocaleString('fa-IR')+' ایستگاه';
 document.querySelectorAll('[data-radio-filter]').forEach(b=>b.classList.toggle('on',b.dataset.radioFilter===state.filter));
 box.innerHTML=list.length?list.slice(0,250).map(s=>'<article class="radio-station'+(state.current&&state.current.stationuuid===s.stationuuid?' playing':'')+'" data-radio-play="'+esc(s.stationuuid)+'"><span class="radio-station-icon">♫</span><span class="radio-station-info"><b>'+esc(s.name)+'</b><small>'+esc([s.country,s.language,s.codec&&s.codec+' '+(s.bitrate||'')+' kbps'].filter(Boolean).join(' • '))+'</small></span><button type="button" data-radio-fav="'+esc(s.stationuuid)+'" aria-label="علاقه‌مندی">'+(state.favs.includes(s.stationuuid)?'♥':'♡')+'</button>'+(s.custom?'<button type="button" data-radio-remove="'+esc(s.stationuuid)+'" aria-label="حذف ایستگاه">×</button>':'')+'<span class="radio-live">LIVE</span></article>').join(''):'<p class="radio-empty">'+(state.loading?'در حال بارگذاری…':state.filter==='favorites'?'هنوز ایستگاهی به علاقه‌مندی‌ها اضافه نکرده‌ای.':'ایستگاهی با این مشخصات پیدا نشد.')+'</p>';
}
async function stopCurrent(){
 state.playToken++;const a=audio();if(a){a.pause();a.removeAttribute('src');try{a.load()}catch{}}
 if(window.__naghmeRadioHls){try{window.__naghmeRadioHls.destroy()}catch{}window.__naghmeRadioHls=null}
 if(nativeRadio()){try{await window.NaghmeLibraryVideo.stop()}catch(e){console.warn('[NaghmeRadio] native stop',e)}try{await window.NaghmeLibraryVideo.visible(false)}catch{}}
 state.nativePlaying=false;
}
function nativeRadio(){return false} // Radio always uses its dedicated HTMLAudioElement; the native video overlay is not an audio player.
async function pauseOtherMedia(){
 try{if(window.NaghmeLibraryVideo&&window.NaghmeLibraryVideo.isNative)await window.NaghmeLibraryVideo.stop()}catch(e){console.warn('[NaghmeRadio] stop library video',e)}
 try{if(typeof window.NaghmePauseMusic==='function')window.NaghmePauseMusic()}catch{}
 try{if(typeof window.NaghmeLeaveIPTV==='function')window.NaghmeLeaveIPTV()}catch{}
}
function countSuccessfulPlay(id){
 if(!/^[0-9a-f-]{20,}$/i.test(String(id||'')))return;
 try{fetch(API[state.api]+'/url/'+encodeURIComponent(id),{method:'POST',keepalive:true}).catch(()=>{})}catch{}
}
async function play(id){
 const s=state.items.find(x=>x.stationuuid===id);if(!s)return;
 const a=audio();if(!a)return;
 if(state.current&&state.current.stationuuid===id&&((nativeRadio()&&state.nativePlaying)||(!nativeRadio()&&!a.paused))){
  if(nativeRadio()){try{await window.NaghmeLibraryVideo.pause();state.nativePlaying=false}catch(e){status('توقف پخش ممکن نشد: '+(e.message||e));return}}
  else a.pause();
  $('#radioPlayToggle').textContent='▶';status('پخش متوقف شد.');return;
 }
 const token=++state.playToken;
 await pauseOtherMedia();if(token!==state.playToken)return;
 state.current=s;state.nativePlaying=false;
 const title=$('#radioNowTitle'),meta=$('#radioNowMeta');if(title)title.textContent=s.name;if(meta)meta.textContent=[s.country,s.language].filter(Boolean).join(' • ')||'رادیو اینترنتی';
 const original=s.url_resolved||s.url;if(!original){status('نشانی پخش این ایستگاه موجود نیست.');return}
 const isHls=s.irib===true||/\.m3u8(?:$|[?#])/i.test(original)||/\bHLS\b/i.test(s.codec||'');
 status('در حال اتصال به '+s.name+'…');$('#radioPlayToggle').textContent='…';
 try{
  if(nativeRadio()){
   a.pause();a.removeAttribute('src');try{a.load()}catch{}
   if(window.__naghmeRadioHls){try{window.__naghmeRadioHls.destroy()}catch{}window.__naghmeRadioHls=null}
   await window.NaghmeLibraryVideo.play(original);
   if(token!==state.playToken){try{await window.NaghmeLibraryVideo.stop()}catch{}return}
   try{await window.NaghmeLibraryVideo.visible(false)}catch{}
   state.nativePlaying=true;
  }else{
   let url=original;if(location.protocol==='https:'&&url.startsWith('http:'))url=buildProxyUrl(url);
   a.pause();if(window.__naghmeRadioHls){try{window.__naghmeRadioHls.destroy()}catch{}window.__naghmeRadioHls=null}
   if(isHls&&!a.canPlayType('application/vnd.apple.mpegurl')){
    const Hls=await loadRadioHls();if(token!==state.playToken)return;
    if(!Hls.isSupported())throw Error('این دستگاه پخش HLS را پشتیبانی نمی‌کند');
    const h=new Hls({enableWorker:true,lowLatencyMode:false});window.__naghmeRadioHls=h;h.loadSource(url);h.attachMedia(a);
    await new Promise((resolve,reject)=>{
     let settled=false;const finish=(fn,v)=>{if(settled)return;settled=true;clearTimeout(timeout);fn(v)};
     const timeout=setTimeout(()=>finish(reject,Error('مهلت اتصال HLS تمام شد')),18000);
     h.on(Hls.Events.MANIFEST_PARSED,()=>{if(token!==state.playToken||window.__naghmeRadioHls!==h)return finish(reject,Error('درخواست پخش جایگزین شد'));finish(resolve)});
     h.on(Hls.Events.ERROR,(_,d)=>{if(token===state.playToken&&window.__naghmeRadioHls===h&&d.fatal)finish(reject,Error(d.details||'خطای HLS'))});
    });
   }else{a.src=url;a.load()}
   if(token!==state.playToken)return;await a.play();if(token!==state.playToken){a.pause();return}
  }
  if(token!==state.playToken)return;
  $('#radioPlayToggle').textContent='Ⅱ';status('در حال پخش زنده');countSuccessfulPlay(id);
 }catch(e){
  if(token!==state.playToken)return;state.nativePlaying=false;
  if(window.__naghmeRadioHls){try{window.__naghmeRadioHls.destroy()}catch{}window.__naghmeRadioHls=null}
  status('خطای پخش: '+(e&&e.message?e.message:'خطای ناشناخته')+' — ایستگاه دیگری را امتحان کن.');$('#radioPlayToggle').textContent='▶';
 }
 render();
}
async function toggle(){
 const a=audio();if(!a)return;
 if(!state.current){const s=filtered()[0];if(s)play(s.stationuuid);else status('ابتدا یک ایستگاه انتخاب کن.');return}
 if(nativeRadio()){
  try{if(state.nativePlaying){await window.NaghmeLibraryVideo.pause();state.nativePlaying=false;$('#radioPlayToggle').textContent='▶';status('پخش متوقف شد.')}
  else{await window.NaghmeLibraryVideo.resume();state.nativePlaying=true;$('#radioPlayToggle').textContent='Ⅱ';status('در حال پخش زنده')}}
  catch(e){status('ادامهٔ پخش ممکن نشد: '+(e.message||e))}return;
 }
 if(a.paused){try{await a.play();$('#radioPlayToggle').textContent='Ⅱ';status('در حال پخش زنده')}catch(e){status('پخش ادامه پیدا نکرد: '+(e.message||e))}}
 else{a.pause();$('#radioPlayToggle').textContent='▶';status('پخش متوقف شد.')}
}
async function openIranSeda(){
 const url='https://radio.iranseda.ir/radiolist/?VALID=TRUE';
 try{
  const platform=window.NaghmePlatform;
  if(platform&&platform.isNative&&typeof platform.isVpnActive==='function'){
   const vpn=await platform.isVpnActive();
   if(vpn){
    window.alert('برای استفاده از ایران‌صدا، لطفاً VPN را خاموش کنید و دوباره روی «ایران صدا» بزنید.');
    return;
   }
  }
  window.location.href=url;
 }catch(err){
  console.warn('[NaghmeRadio] VPN check failed',err);
  window.alert('بررسی وضعیت VPN ممکن نشد. لطفاً VPN را خاموش کنید و دوباره تلاش کنید.');
 }
}
function radioM3UHash(value){
 let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
 return (h>>>0).toString(36);
}
function parseRadioM3U(text){
 const out=[];let current=null,extGroup='';
 const attr=(line,key)=>{const re=new RegExp('(?:^|\\\\s)'+key+'="([^"]*)"','i');const m=line.match(re);return m?m[1].trim():''};
 for(const raw of String(text||'').replace(/^\\uFEFF/,'').split(/\\r?\\n/)){
  const line=raw.trim();if(!line)continue;
  if(line.startsWith('#EXTINF:')){
   let comma=-1,quoted=false;
   for(let i=0;i<line.length;i++){if(line[i]==='"')quoted=!quoted;else if(line[i]===','&&!quoted){comma=i;break}}
   const head=line.slice(0,comma<0?line.length:comma);
   const name=comma<0?'':line.slice(comma+1).trim();
   current={name:name||attr(head,'tvg-name')||'ایستگاه بدون نام',id:attr(head,'tvg-id'),logo:attr(head,'tvg-logo'),group:attr(head,'group-title')||extGroup||'فهرست واردشده',country:attr(head,'tvg-country'),language:attr(head,'tvg-language')};
   continue;
  }
  if(/^#EXTGRP:/i.test(line)){extGroup=line.slice(line.indexOf(':')+1).trim()||extGroup;if(current&&!current.group)current.group=extGroup;continue}
  if(line[0]==='#')continue;
  if(!/^https?:\\/\\//i.test(line))continue;
  let url;try{url=new URL(line).href}catch{continue}
  const meta=current||{name:url,id:'',logo:'',group:extGroup||'فهرست واردشده',country:'',language:''};
  const codec=/\\.m3u8(?:$|[?#])/i.test(url)?'HLS':/\\.mpd(?:$|[?#])/i.test(url)?'DASH':/\\.aac(?:$|[?#])/i.test(url)?'AAC':'Audio';
  out.push({stationuuid:'m3u-'+radioM3UHash(url),name:meta.name,country:meta.country||meta.group||'فهرست واردشده',countrycode:'',language:meta.language||'',tags:meta.group||'فهرست واردشده',url,url_resolved:url,codec,bitrate:0,votes:0,logo:meta.logo||'',custom:true,imported:true});
  current=null;
 }
 return out;
}
document.addEventListener('click',e=>{
 const iran=e.target.closest('[data-radio-iranseda]');
 if(iran){e.preventDefault();e.stopPropagation();openIranSeda();return}
 const f=e.target.closest('[data-radio-filter]');if(f){e.preventDefault();e.stopPropagation();state.filter=f.dataset.radioFilter;render();return}
 const rem=e.target.closest('[data-radio-remove]');if(rem){e.preventDefault();e.stopPropagation();const id=rem.dataset.radioRemove;state.custom=state.custom.filter(x=>x.stationuuid!==id);lsSet('naghmeRadioCustom',state.custom);state.items=state.items.filter(x=>x.stationuuid!==id);if(state.current&&state.current.stationuuid===id){audio()?.pause();state.current=null;status('ایستگاه حذف شد.')}render();return}
 const fav=e.target.closest('[data-radio-fav]');if(fav){e.preventDefault();e.stopPropagation();const id=fav.dataset.radioFav;state.favs=state.favs.includes(id)?state.favs.filter(x=>x!==id):[...state.favs,id];lsSet('naghmeRadioFavs',state.favs);render();return}
 const row=e.target.closest('[data-radio-play]');if(row){e.preventDefault();e.stopPropagation();play(row.dataset.radioPlay);return}
 const act=e.target.closest('[data-radio]');if(act){e.preventDefault();e.stopPropagation();if(act.dataset.radio==='refresh'){init();load();}if(act.dataset.radio==='toggle')toggle();if(act.dataset.radio==='add'){const f=$('#radioCustomForm');if(f)f.hidden=!f.hidden;}}
},true);
$('#radioSearch')?.addEventListener('input',e=>{state.query=e.target.value;render()});
$('#radioM3uFile')?.addEventListener('change',async e=>{
 const input=e.currentTarget,file=input.files&&input.files[0];if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error('حجم فایل باید کمتر از ۵ مگابایت باشد.');
  const text=await file.text();if(!/#EXTM3U|#EXTINF/i.test(text))throw Error('این فایل، فهرست معتبر M3U به نظر نمی‌رسد.');
  const parsed=parseRadioM3U(text);if(!parsed.length)throw Error('هیچ نشانی پخش HTTP/HTTPS معتبری در فایل پیدا نشد.');
  const known=new Set(state.items.map(s=>{try{return new URL(s.url_resolved||s.url).href}catch{return ''}}));
  const added=[];for(const station of parsed){if(known.has(station.url))continue;known.add(station.url);added.push(station)}
  if(!added.length){status('همهٔ ایستگاه‌های این فایل قبلاً اضافه شده‌اند.');return}
  const previous=state.custom;state.custom=[...state.custom,...added].slice(-1500);
  if(!lsSet('naghmeRadioCustom',state.custom)){state.custom=previous;throw Error('ذخیره در حافظهٔ دستگاه ممکن نشد؛ فضای ذخیره‌سازی را بررسی کن.')}
  state.items=unique([...state.items,...added]);state.filter='all';render();
  status(added.length.toLocaleString('fa-IR')+' ایستگاه از فایل «'+file.name+'» اضافه شد؛ تکراری‌ها نادیده گرفته شدند.');
 }catch(err){status('ورود فایل ناموفق بود: '+(err.message||err))}
 finally{input.value=''}
});
$('#radioCustomForm')?.addEventListener('submit',e=>{e.preventDefault();const name=$('#radioCustomName')?.value.trim();const raw=$('#radioCustomUrl')?.value.trim();if(!name||!raw){status('نام ایستگاه و نشانی پخش را وارد کن.');return}let u;try{u=new URL(raw);if(!['http:','https:'].includes(u.protocol))throw Error()}catch{status('نشانی معتبر HTTP یا HTTPS وارد کن.');return}const station={stationuuid:'custom-'+Date.now(),name,country:'شخصی',language:'',url:u.href,url_resolved:u.href,codec:/\.m3u8(?:$|[?#])/i.test(u.href)?'HLS':'Audio',bitrate:0,votes:0,custom:true};state.custom.push(station);localStorage.setItem('naghmeRadioCustom',JSON.stringify(state.custom));state.items.push(station);$('#radioCustomName').value='';$('#radioCustomUrl').value='';$('#radioCustomForm').hidden=true;state.filter='all';render();status('ایستگاه شخصی اضافه شد. برای پخش انتخابش کن.');});
audio()?.addEventListener('playing',()=>{if(nativeRadio())return;$('#radioPlayToggle').textContent='Ⅱ';$('.radio-player')?.classList.add('is-playing');status('در حال پخش زنده')});
audio()?.addEventListener('pause',()=>{if(nativeRadio())return;$('#radioPlayToggle').textContent='▶';$('.radio-player')?.classList.remove('is-playing')});
audio()?.addEventListener('error',()=>status('خطا در دریافت صدای ایستگاه؛ ایستگاه دیگری را امتحان کن.'));
function init(){if(state.initialized)return;state.initialized=true;load()}
window.NaghmeRadio={init,load,play,parseM3U:parseRadioM3U,async stop(){await stopCurrent();state.current=null;const b=$('#radioPlayToggle');if(b)b.textContent='▶';status('پخش رادیو متوقف شد.');render()},get current(){return state.current}};
})();