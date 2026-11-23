(function(){
'use strict';
var cap=window.Capacitor;
var native=!!(cap&&typeof cap.isNativePlatform==='function'&&cap.isNativePlatform());
var nativeApi=window.NaghmeVideoPlayer;
var sleepTimer=0;
function setStatus(message){var el=document.getElementById('iptvStatus');if(el)el.textContent=message||''}
function currentVideo(){return document.getElementById('iptvVideo')}
function readVolume(){var value=1;try{var stored=localStorage.getItem('naghme-iptv-volume');if(stored!==null&&Number.isFinite(Number(stored)))value=Math.max(0,Math.min(1,Number(stored)))}catch(_){}return value}
function readSpeed(){try{var prefs=window.NaghmePlayerSettings&&window.NaghmePlayerSettings.get?window.NaghmePlayerSettings.get():null;return Math.max(.25,Math.min(3,Number(prefs&&prefs.iptvSpeed)||1))}catch(_){return 1}}
function applySpeed(value){
 var speed=Math.max(.25,Math.min(3,Number(value)||1)),v=currentVideo();
 try{if(window.NaghmePlayerSettings&&window.NaghmePlayerSettings.set)window.NaghmePlayerSettings.set('iptvSpeed',String(speed))}catch(_){}
 if(native&&nativeApi&&typeof nativeApi.setSpeed==='function')return Promise.resolve(nativeApi.setSpeed(speed));
 if(v){try{v.playbackRate=speed}catch(_){}}
 return Promise.resolve();
}
function addSharedControls(){
 var host=document.querySelector('#tvpage .tvnow');if(!host||document.getElementById('naghmeIptvTools'))return;
 var tools=document.createElement('div');tools.id='naghmeIptvTools';tools.dir='rtl';
 Object.assign(tools.style,{display:'flex',gap:'7px',alignItems:'center',flexWrap:'wrap',marginTop:'8px'});
 tools.innerHTML='<label class="iptv-volume-control" data-iptv-volume-wrap><span>🔊 صدا</span><input data-iptv-tool="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="تنظیم صدای تلویزیون"><output data-iptv-volume-value>۱۰۰٪</output></label><label class="iptv-speed-control"><span>سرعت</span><select data-iptv-tool="speed" aria-label="سرعت پخش"><option value=".5">۰٫۵×</option><option value=".75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option><option value="2">۲×</option></select></label><button type="button" class="iptv-tool-btn" data-iptv-tool="sleep" aria-label="زمان‌سنج خواب">🌙 زمان‌سنج</button>'+(native?'<button type="button" class="iptv-tool-btn" data-iptv-tool="lock" aria-label="قفل لمس">🔒 قفل لمس</button>':'');
 var volume=tools.querySelector('[data-iptv-tool="volume"]'),volumeOut=tools.querySelector('[data-iptv-volume-value]'),speed=tools.querySelector('[data-iptv-tool="speed"]');
 function showVolume(value){value=Math.max(0,Math.min(1,Number(value)||0));if(volume)volume.value=String(value);if(volumeOut)volumeOut.textContent=Math.round(value*100)+'٪'}
 showVolume(readVolume());if(speed)speed.value=String(readSpeed());
 host.insertAdjacentElement('afterend',tools);
 var v=currentVideo();
 if(!native&&v){try{v.volume=readVolume()}catch(_){}v.addEventListener('loadedmetadata',function(){applySpeed(speed&&speed.value||readSpeed())});v.addEventListener('playing',function(){applySpeed(speed&&speed.value||readSpeed())})}
 if(nativeApi&&typeof nativeApi.on==='function'){
  nativeApi.on('volumeChanged',function(e){if(e&&typeof e.volume==='number')showVolume(e.volume)});
  nativeApi.on('lockChanged',function(e){var b=tools.querySelector('[data-iptv-tool="lock"]');if(b)b.textContent=e&&e.locked?'🔓 بازکردن قفل':'🔒 قفل لمس'});
 }
 tools.addEventListener('input',function(e){
  if(e.target.dataset.iptvTool!=='volume')return;
  var value=Math.max(0,Math.min(1,Number(e.target.value)||0));showVolume(value);
  try{localStorage.setItem('naghme-iptv-volume',String(value))}catch(_){}
  if(native&&nativeApi&&typeof nativeApi.setVolume==='function')Promise.resolve(nativeApi.setVolume(value)).catch(function(err){setStatus('تغییر صدا ناموفق بود: '+(err.message||err))});
  else if(v){try{v.volume=value;v.muted=value===0}catch(err){setStatus('تغییر صدا ناموفق بود: '+(err.message||err))}}
 });
 tools.addEventListener('change',function(e){if(e.target.dataset.iptvTool==='speed')applySpeed(e.target.value).catch(function(err){setStatus('تغییر سرعت ناموفق بود: '+(err.message||err))})});
 tools.addEventListener('click',function(e){
  var b=e.target.closest('[data-iptv-tool]');if(!b)return;
  if(b.dataset.iptvTool==='sleep'){
   var value=prompt('چند دقیقهٔ دیگر پخش متوقف شود؟ (۰ برای لغو)','۳۰');if(value===null)return;
   var minutes=Number(value);if(!Number.isFinite(minutes)||minutes<0){setStatus('زمان واردشده معتبر نیست.');return}
   clearTimeout(sleepTimer);sleepTimer=0;if(minutes===0){setStatus('زمان‌سنج خواب لغو شد.');return}
   sleepTimer=setTimeout(function(){sleepTimer=0;if(native&&nativeApi&&typeof nativeApi.pause==='function')Promise.resolve(nativeApi.pause()).catch(function(){});else if(v)v.pause();setStatus('زمان‌سنج خواب: پخش متوقف شد.')},minutes*60000);
   setStatus('زمان‌سنج خواب برای '+minutes+' دقیقه تنظیم شد.');
  }
  if(b.dataset.iptvTool==='lock'&&nativeApi&&typeof nativeApi.setLocked==='function'){
   var locked=b.dataset.locked!=='1';b.dataset.locked=locked?'1':'0';
   Promise.resolve(nativeApi.setLocked(locked)).then(function(){b.textContent=locked?'🔓 بازکردن قفل':'🔒 قفل لمس';setStatus(locked?'لمس تصویر قفل شد.':'قفل لمس برداشته شد.')}).catch(function(err){b.dataset.locked=locked?'0':'1';setStatus('قفل لمس فعال نشد: '+(err.message||err))});
  }
 });
}
function watchSharedControls(){
 addSharedControls();
 var page=document.getElementById('tvpage');if(page)new MutationObserver(addSharedControls).observe(page,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchSharedControls,{once:true});else watchSharedControls();
if(native)return;
function syncLayout(){
 var page=document.getElementById('tvpage'),player=document.querySelector('#tvpage .tvplayer'),browse=document.querySelector('#tvpage .tvbrowse'),box=document.getElementById('tvbox'),now=document.querySelector('#tvpage .tvnow'),stat=document.getElementById('iptvStatus');
 if(!page||!player||!browse||!box||!now)return;
 var split=!!(window.matchMedia&&window.matchMedia('(orientation: landscape)').matches&&!document.fullscreenElement);
 page.classList.toggle('iptv-split-landscape',split);
 if(split){
  if(now.parentElement!==browse)browse.insertBefore(now,browse.firstChild);
  if(stat&&stat.parentElement!==browse)browse.insertBefore(stat,now.nextSibling);
 }else{
  if(now.parentElement!==player)box.insertAdjacentElement('afterend',now);
  if(stat&&stat.parentElement!==player)now.insertAdjacentElement('afterend',stat);
 }
}
function init(){
 syncLayout();
 window.addEventListener('resize',syncLayout,{passive:true});
 window.addEventListener('orientationchange',function(){setTimeout(syncLayout,250)},{passive:true});
 document.addEventListener('fullscreenchange',syncLayout);
 var page=document.getElementById('tvpage');
 if(page)new MutationObserver(syncLayout).observe(page,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.NaghmeIPTVWebControls={syncLayout:syncLayout};
})();