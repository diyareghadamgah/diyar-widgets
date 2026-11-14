(function(){
'use strict';
const $=s=>document.querySelector(s);
const API=['https://de1.api.radio-browser.info/json','https://nl1.api.radio-browser.info/json','https://at1.api.radio-browser.info/json'];
const state={items:[],filter:'all',query:'',loading:false,current:null,favs:[],api:0};
const audio=()=>$('#radioAudio');
const norm=s=>String(s||'').toLocaleLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{state.favs=JSON.parse(localStorage.getItem('naghmeRadioFavs')||'[]')}catch{}
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
  state.items=unique(data.flat()).sort((a,b)=>(Number(b.votes)||0)-(Number(a.votes)||0));
  status(state.items.length?'ایستگاه‌ها آماده‌اند؛ برای پخش یکی را انتخاب کن.':'ایستگاهی پیدا نشد؛ دوباره تلاش کن.');
 }catch(e){status('دریافت ایستگاه‌ها ناموفق بود. اتصال اینترنت را بررسی و دوباره تلاش کن.')}
 finally{state.loading=false;render()}
}
function filtered(){
 let a=state.items;
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
 box.innerHTML=list.length?list.slice(0,250).map(s=>'<article class="radio-station'+(state.current&&state.current.stationuuid===s.stationuuid?' playing':'')+'" data-radio-play="'+esc(s.stationuuid)+'"><span class="radio-station-icon">♫</span><span class="radio-station-info"><b>'+esc(s.name)+'</b><small>'+esc([s.country,s.language,s.codec&&s.codec+' '+(s.bitrate||'')+' kbps'].filter(Boolean).join(' • '))+'</small></span><button type="button" data-radio-fav="'+esc(s.stationuuid)+'" aria-label="علاقه‌مندی">'+(state.favs.includes(s.stationuuid)?'♥':'♡')+'</button><span class="radio-live">LIVE</span></article>').join(''):'<p class="radio-empty">'+(state.loading?'در حال بارگذاری…':state.filter==='favorites'?'هنوز ایستگاهی به علاقه‌مندی‌ها اضافه نکرده‌ای.':'ایستگاهی با این مشخصات پیدا نشد.')+'</p>';
}
async function play(id){
 const s=state.items.find(x=>x.stationuuid===id);if(!s)return;
 const a=audio();if(!a)return;
 if(state.current&&state.current.stationuuid===id&&!a.paused){a.pause();$('#radioPlayToggle').textContent='▶';status('پخش متوقف شد.');return}
 state.current=s;$('#radioNowTitle').textContent=s.name;$('#radioNowMeta').textContent=[s.country,s.language].filter(Boolean).join(' • ')||'رادیو اینترنتی';
 const url=s.url_resolved||s.url;status('در حال اتصال به '+s.name+'…');a.pause();a.src=url;a.load();
 try{await a.play();$('#radioPlayToggle').textContent='Ⅱ';status('در حال پخش زنده');}
 catch(e){status('پخش این ایستگاه شروع نشد؛ ممکن است جریان آن مسدود یا غیرفعال باشد. ایستگاه دیگری را امتحان کن.');$('#radioPlayToggle').textContent='▶'}
 render();
 try{fetch(API[state.api]+'/url/'+encodeURIComponent(id),{method:'POST'}).catch(()=>{})}catch{}
}
function toggle(){const a=audio();if(!a)return;if(!state.current){const s=filtered()[0];if(s)play(s.stationuuid);else status('ابتدا یک ایستگاه انتخاب کن.');return}if(a.paused)a.play().then(()=>{$('#radioPlayToggle').textContent='Ⅱ';status('در حال پخش زنده')}).catch(()=>status('پخش ادامه پیدا نکرد.'));else{a.pause();$('#radioPlayToggle').textContent='▶';status('پخش متوقف شد.')}}
document.addEventListener('click',e=>{
 const f=e.target.closest('[data-radio-filter]');if(f){state.filter=f.dataset.radioFilter;render();return}
 const fav=e.target.closest('[data-radio-fav]');if(fav){e.stopPropagation();const id=fav.dataset.radioFav;state.favs=state.favs.includes(id)?state.favs.filter(x=>x!==id):[...state.favs,id];localStorage.setItem('naghmeRadioFavs',JSON.stringify(state.favs));render();return}
 const row=e.target.closest('[data-radio-play]');if(row){play(row.dataset.radioPlay);return}
 const act=e.target.closest('[data-radio]');if(act){if(act.dataset.radio==='refresh')load();if(act.dataset.radio==='toggle')toggle()}
});
$('#radioSearch')?.addEventListener('input',e=>{state.query=e.target.value;render()});
audio()?.addEventListener('playing',()=>{$('#radioPlayToggle').textContent='Ⅱ';status('در حال پخش زنده')});
audio()?.addEventListener('pause',()=>{$('#radioPlayToggle').textContent='▶'});
audio()?.addEventListener('error',()=>status('خطا در دریافت صدای ایستگاه؛ ایستگاه دیگری را امتحان کن.'));
window.NaghmeRadio={load,play,stop(){audio()?.pause()},get current(){return state.current}};
load();
})();