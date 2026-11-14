(function(){
'use strict';
const $=s=>document.querySelector(s);
const API=['https://de1.api.radio-browser.info/json','https://nl1.api.radio-browser.info/json','https://at1.api.radio-browser.info/json'];
const IRIB=[['radioiran','رادیو ایران','radioiran'],['radiojavan','رادیو جوان','radiojavan'],['radiopayam','رادیو پیام','radiopayam'],['radiotehran','رادیو تهران','radiotehran'],['radiovarzesh','رادیو ورزش','radiovarzesh'],['radioava','رادیو آوا','radioava'],['radioquran','رادیو قرآن','radioquran'],['radiofarhang','رادیو فرهنگ','radiofarhang'],['radiosalamat','رادیو سلامت','radiosalamat'],['radioeghtesad','رادیو اقتصاد','radioeghtesad'],['radiomaaref','رادیو معارف','radiomaaref'],['radiogoftogo','رادیو گفت‌وگو','radiogoftogo'],['radionamayesh','رادیو نمایش','radionamayesh'],['radiosaba','رادیو صبا','radiosaba'],['radioziarat','رادیو زیارت','radioziarat'],['radiotelavat','رادیو تلاوت','radiotelavat'],['radiotartil','رادیو ترتیل','radiotartil'],['radiomonasebati','رادیو مناسبتی','radiomonasebati']].map(([id,name,slug])=>({stationuuid:'irib-'+id,name,country:'ایران',countrycode:'IR',language:'Persian',tags:'صدا و سیما IRIB رادیو ایران فارسی',url:'https://diyar-widgets.diyareghadamgah.workers.dev/'+slug+'/720p',url_resolved:'https://diyar-widgets.diyareghadamgah.workers.dev/'+slug+'/720p',codec:'HLS',bitrate:0,votes:999999,irib:true}));
const state={items:[],filter:'all',query:'',loading:false,current:null,favs:[],custom:[],api:0};
const audio=()=>$('#radioAudio');
const norm=s=>String(s||'').toLocaleLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{state.favs=JSON.parse(localStorage.getItem('naghmeRadioFavs')||'[]')}catch{}\ntry{state.custom=JSON.parse(localStorage.getItem('naghmeRadioCustom')||'[]').filter(s=>s&&s.stationuuid&&s.url)}catch{}
function status(s){const el=$('#radioStatus');if(el)el.textContent=s||''}
async function request(path){
 let last;
 for(let i=0;i<API.length;i++){const n=(state.api+i)%API.length;try{const r=await fetch(API[n]+path,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);state.api=n;return await r.json()}catch(e){last=e}}
 throw last||Error('اتصال برقرار نشد');
}
function unique(list){const m=new Map();(list||[]).forEach(s=>{if(s&&s.stationuuid&&(s.url_resolved||s.url)&&!m.has(s.stationuuid))m.set(s.stationuuid,s)});return [...m.values()]}
async function load(){
 if(state.loading)return;state.loading=true;status('در حال دریافت فهرست ایستگاه‌ها…');render();
 try{
  const qs=['/stations/search?language=persian&hidebroken=true&is_https=true&order=votes&reverse=true&limit=80','/stations/search?countrycode=IR&hidebroken=true&is_https=true&order=votes&reverse=true&limit=80','/stations/topvote?is_https=true&limit=80'];
  const data=await Promise.all(qs.map(p=>request(p).catch(()=>[])));
  state.items=[...IRIB,...unique(data.flat()).filter(s=>!IRIB.some(i=>i.name===s.name)),...state.custom].sort((a,b)=>(Number(b.votes)||0)-(Number(a.votes)||0));
  status(state.items.length?'ایستگاه‌ها آماده‌اند؛ برای پخش یکی را انتخاب کن.':'ایستگاهی پیدا نشد؛ دوباره تلاش کن.');
 }catch(e){status('دریافت ایستگاه‌ها ناموفق بود. اتصال اینترنت را بررسی و دوباره تلاش کن.')}
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
 const list=filtered();$('#radioCount').textContent=list.length.toLocaleString('fa-IR')+' ایستگاه';
 document.querySelectorAll('[data-radio-filter]').forEach(b=>b.classList.toggle('on',b.dataset.radioFilter===state.filter));
 box.innerHTML=list.length?list.slice(0,250).map(s=>'<article class="radio-station'+(state.current&&state.current.stationuuid===s.stationuuid?' playing':'')+'" data-radio-play="'+esc(s.stationuuid)+'"><span class="radio-station-icon">♫</span><span class="radio-station-info"><b>'+esc(s.name)+'</b><small>'+esc([s.country,s.language,s.codec&&s.codec+' '+(s.bitrate||'')+' kbps'].filter(Boolean).join(' • '))+'</small></span><button type="button" data-radio-fav="'+esc(s.stationuuid)+'" aria-label="علاقه‌مندی">'+(state.favs.includes(s.stationuuid)?'♥':'♡')+'</button>'+(s.custom?'<button type="button" data-radio-remove="'+esc(s.stationuuid)+'" aria-label="حذف ایستگاه">×</button>':'')+'<span class="radio-live">LIVE</span></article>').join(''):'<p class="radio-empty">'+(state.loading?'در حال بارگذاری…':state.filter==='favorites'?'هنوز ایستگاهی به علاقه‌مندی‌ها اضافه نکرده‌ای.':'ایستگاهی با این مشخصات پیدا نشد.')+'</p>';
}
async function play(id){
 const s=state.items.find(x=>x.stationuuid===id);if(!s)return;
 const a=audio();if(!a)return;
 if(state.current&&state.current.stationuuid===id&&!a.paused){a.pause();$('#radioPlayToggle').textContent='▶';status('پخش متوقف شد.');return}
 state.current=s;$('#radioNowTitle').textContent=s.name;$('#radioNowMeta').textContent=[s.country,s.language].filter(Boolean).join(' • ')||'رادیو اینترنتی';
 const url=s.url_resolved||s.url;const isHls=s.irib===true||/\.m3u8(?:$|[?#])/i.test(url)||/\bHLS\b/i.test(s.codec||'')||/\/\d{3,4}p(?:$|[?#])/i.test(url);status('در حال اتصال به '+s.name+'…');a.pause();try{if(window.__naghmeRadioHls){window.__naghmeRadioHls.destroy();window.__naghmeRadioHls=null}if(isHls&&window.Hls&&Hls.isSupported()){const h=new Hls({enableWorker:true,lowLatencyMode:false});window.__naghmeRadioHls=h;h.loadSource(url);h.attachMedia(a);await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('مهلت اتصال HLS تمام شد')),18000);h.on(Hls.Events.MANIFEST_PARSED,()=>{clearTimeout(timeout);resolve()});h.on(Hls.Events.ERROR,(_,d)=>{if(d.fatal){clearTimeout(timeout);reject(Error(d.details||'HLS error'))}})})}else if(isHls&&a.canPlayType('application/vnd.apple.mpegurl')){a.src=url;a.load()}else if(isHls){throw Error('این دستگاه پخش HLS را پشتیبانی نمی‌کند')}else{a.src=url;a.load()}await a.play();$('#radioPlayToggle').textContent='Ⅱ';status('در حال پخش زنده');}
 catch(e){const detail=e&&e.message?e.message:'خطای ناشناخته';status('خطای پخش: '+detail+' — ایستگاه دیگری را امتحان کن.');$('#radioPlayToggle').textContent='▶';if(window.__naghmeRadioHls){window.__naghmeRadioHls.destroy();window.__naghmeRadioHls=null}}
 render();
 try{fetch(API[state.api]+'/url/'+encodeURIComponent(id),{method:'POST'}).catch(()=>{})}catch{}
}
function toggle(){const a=audio();if(!a)return;if(!state.current){const s=filtered()[0];if(s)play(s.stationuuid);else status('ابتدا یک ایستگاه انتخاب کن.');return}if(a.paused)a.play().then(()=>{$('#radioPlayToggle').textContent='Ⅱ';status('در حال پخش زنده')}).catch(()=>status('پخش ادامه پیدا نکرد.'));else{a.pause();$('#radioPlayToggle').textContent='▶';status('پخش متوقف شد.')}}
document.addEventListener('click',e=>{
 const f=e.target.closest('[data-radio-filter]');if(f){e.preventDefault();e.stopPropagation();state.filter=f.dataset.radioFilter;render();return}
 const rem=e.target.closest('[data-radio-remove]');if(rem){e.preventDefault();e.stopPropagation();const id=rem.dataset.radioRemove;state.custom=state.custom.filter(x=>x.stationuuid!==id);localStorage.setItem('naghmeRadioCustom',JSON.stringify(state.custom));state.items=state.items.filter(x=>x.stationuuid!==id);if(state.current&&state.current.stationuuid===id){audio()?.pause();state.current=null;status('ایستگاه حذف شد.')}render();return}\n const fav=e.target.closest('[data-radio-fav]');if(fav){e.preventDefault();e.stopPropagation();const id=fav.dataset.radioFav;state.favs=state.favs.includes(id)?state.favs.filter(x=>x!==id):[...state.favs,id];localStorage.setItem('naghmeRadioFavs',JSON.stringify(state.favs));render();return}
 const row=e.target.closest('[data-radio-play]');if(row){e.preventDefault();e.stopPropagation();play(row.dataset.radioPlay);return}
 const act=e.target.closest('[data-radio]');if(act){e.preventDefault();e.stopPropagation();if(act.dataset.radio==='refresh')load();if(act.dataset.radio==='toggle')toggle();if(act.dataset.radio==='add'){const f=$('#radioCustomForm');if(f)f.hidden=!f.hidden;}}
},true);
$('#radioSearch')?.addEventListener('input',e=>{state.query=e.target.value;render()});\n$('#radioCustomForm')?.addEventListener('submit',e=>{e.preventDefault();const name=$('#radioCustomName')?.value.trim();const raw=$('#radioCustomUrl')?.value.trim();if(!name||!raw){status('نام ایستگاه و نشانی پخش را وارد کن.');return}let u;try{u=new URL(raw);if(!['http:','https:'].includes(u.protocol))throw Error()}catch{status('نشانی معتبر HTTP یا HTTPS وارد کن.');return}const station={stationuuid:'custom-'+Date.now(),name,country:'شخصی',language:'',url:u.href,url_resolved:u.href,codec:/\.m3u8(?:$|[?#])/i.test(u.href)?'HLS':'Audio',bitrate:0,votes:0,custom:true};state.custom.push(station);localStorage.setItem('naghmeRadioCustom',JSON.stringify(state.custom));state.items.push(station);$('#radioCustomName').value='';$('#radioCustomUrl').value='';$('#radioCustomForm').hidden=true;state.filter='all';render();status('ایستگاه شخصی اضافه شد. برای پخش انتخابش کن.');});
audio()?.addEventListener('playing',()=>{$('#radioPlayToggle').textContent='Ⅱ';status('در حال پخش زنده')});
audio()?.addEventListener('pause',()=>{$('#radioPlayToggle').textContent='▶'});
audio()?.addEventListener('error',()=>status('خطا در دریافت صدای ایستگاه؛ ایستگاه دیگری را امتحان کن.'));
window.NaghmeRadio={load,play,stop(){audio()?.pause()},get current(){return state.current}};
load();
})();