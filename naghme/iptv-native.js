(function(){
 'use strict';
 var native=window.NaghmeVideoPlayer;
 if(!native||!native.isNative||typeof native.get!=='function')return;
 var resizeTimer=0,active=false,eventsBound=false,fullscreenState=false,sleepTimer=0,currentSpeed=1;
 function video(){return document.getElementById('tvbox')}
 function bounds(){
  var el=video();if(!el)return null;
  var r=el.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  if(!r.width||!r.height||el.hidden)return null;
  return {x:Math.round(r.left*dpr),y:Math.round(r.top*dpr),width:Math.round(r.width*dpr),height:Math.round(r.height*dpr)};
 }
 function status(message){var el=document.getElementById('iptvStatus');if(el)el.textContent=message||''}
 function plugin(){return native.get()}
 function bindPlayerEvents(p){
  if(eventsBound||!p||typeof p.addListener!=='function')return;
  eventsBound=true;
  try{
   p.addListener('error',function(data){
    if(!active)return;
    var code=data&&data.name?data.name:(data&&data.code!==undefined?'کد '+data.code:'');
    var message=data&&data.message?data.message:'خطای نامشخص در دریافت یا رمزگشایی جریان';
    if(window.IPTV)window.IPTV.nativePlayError=message;
    status('خطای پلیر بومی'+(code?' ['+code+']':'')+': '+message);
    console.error('[Naghme IPTV] ExoPlayer error',data);
   });
   p.addListener('ready',function(){if(active)status('جریان دریافت شد؛ آمادهٔ پخش…')});
   p.addListener('playing',function(){if(active)status('')});
   p.addListener('buffering',function(){if(active)status('در حال دریافت و بافر شبکه…')});
   p.addListener('fullscreenExit',function(){if(active&&window.NaghmeIPTVFullscreen)window.NaghmeIPTVFullscreen(false)});
  }catch(err){console.warn('[Naghme IPTV] event listeners:',err)}
 }
 function syncBounds(){
  if(!active)return Promise.resolve();
  var b=bounds(),p=plugin();
  if(!b||!p||!p.setBounds)return Promise.resolve();
  return p.setBounds(b).catch(function(err){console.warn('[Naghme IPTV] setBounds:',err)});
 }
 function playChannel(channel){
  if(!channel||!channel.url)return Promise.resolve();
  var p=plugin(),b=bounds();
  bindPlayerEvents(p);
  if(!p||!p.play){status('خطای راه‌اندازی: افزونهٔ بومی NaghmeVideoPlayer در دسترس نیست؛ APK را بررسی کنید.');return Promise.resolve()}
  if(!b){status('کادر پخش IPTV هنوز آماده نیست؛ دوباره شبکه را انتخاب کنید.');return Promise.resolve()}
  active=true;
  if(window.IPTV)window.IPTV.nativePlayError='';
  status('در حال اتصال به '+(channel.name||'شبکه')+'…');
  if(window.matchMedia&&window.matchMedia('(orientation: landscape)').matches&&window.NaghmeIPTVFullscreen){
   setTimeout(function(){if(active)window.NaghmeIPTVFullscreen(true)},180);
  }
  return Promise.resolve(p.setVisible?p.setVisible({visible:true}):null)
   .then(function(){return p.play({url:channel.url})})
   .then(function(){var q=document.getElementById('iptvQuality');return native.setVideoQuality(q?Number(q.value)||0:0).catch(function(){})})
   .then(function(){var prefs=window.NaghmePlayerSettings&&window.NaghmePlayerSettings.get?window.NaghmePlayerSettings.get():null;return prefs&&native.setSpeed?native.setSpeed(Number(prefs.iptvSpeed)||1):null})
   .then(function(){return p.setBounds?p.setBounds(b):null})
   .then(function(){document.body.classList.add('native-player-active');status('')})
   .catch(function(err){
    var message=(err&&err.message)||String(err||'خطای ناشناخته');
    if(window.IPTV)window.IPTV.nativePlayError=message;
    status('خطای پلیر بومی: '+message);
    console.error('[Naghme IPTV] native play failed; browser fallback disabled',err);
   });
 }
 function setFullscreen(enabled){
  fullscreenState=!!enabled;
  var p=plugin();
  return p&&p.setFullscreen?p.setFullscreen({enabled:fullscreenState}).catch(function(err){console.warn('[Naghme IPTV] fullscreen:',err)}):Promise.resolve();
 }
 function setSpeed(speed){
  currentSpeed=Math.max(0.25,Math.min(3,Number(speed)||1));
  return native.setSpeed(currentSpeed);
 }
 function jumpToTime(){
  native.status().then(function(s){
   var duration=Number(s.durationMs)||0;
   if(!duration){status('پرش زمانی برای پخش زنده قابل استفاده نیست.');return}
   var current=Math.floor((Number(s.positionMs)||0)/1000);
   var value=prompt('زمان مقصد را به ثانیه وارد کنید (مثلاً ۱۲۵):',String(current));
   if(value===null)return;
   var seconds=Number(value);
   if(!Number.isFinite(seconds)||seconds<0){status('زمان واردشده معتبر نیست.');return}
   return native.seekTo(Math.min(duration,Math.round(seconds*1000)));
  }).catch(function(e){status('دریافت زمان پخش ناموفق بود: '+(e.message||e))});
 }
 function setSleepTimer(){
  var value=prompt('چند دقیقهٔ دیگر پخش متوقف شود؟ (۰ برای لغو)', '۳۰');
  if(value===null)return;
  var minutes=Number(value);
  if(!Number.isFinite(minutes)||minutes<0){status('زمان واردشده معتبر نیست.');return}
  clearTimeout(sleepTimer);sleepTimer=0;
  if(minutes===0){status('زمان‌سنج خواب لغو شد.');return}
  sleepTimer=setTimeout(function(){sleepTimer=0;native.pause().then(function(){status('زمان‌سنج خواب: پخش متوقف شد.')})},minutes*60000);
  status('زمان‌سنج خواب برای '+minutes+' دقیقه تنظیم شد.');
 }
 function addControls(){
  var quality=document.getElementById('iptvQuality');
  if(quality&&!quality.dataset.bound){quality.dataset.bound='1';quality.addEventListener('change',function(){var h=Number(quality.value)||0;native.setVideoQuality(h).then(function(){status(h?'کیفیت حداکثر '+h+'p تنظیم شد.':'کیفیت روی حالت خودکار قرار گرفت.')}).catch(function(err){status('تغییر کیفیت ناموفق بود: '+(err.message||err))})})}
  var host=document.querySelector('.tvnow');if(!host||document.getElementById('naghmeIptvTools'))return;
  var tools=document.createElement('div');tools.id='naghmeIptvTools';tools.dir='rtl';
  Object.assign(tools.style,{display:'flex',gap:'7px',alignItems:'center',flexWrap:'wrap',marginTop:'8px'});
  tools.innerHTML='<button type="button" data-iptv-tool="jump" aria-label="رفتن به زمان">⏱ رفتن به زمان</button><label style="font-size:13px">سرعت پخش <select data-iptv-tool="speed"><option value=".5">۰٫۵×</option><option value=".75">۰٫۷۵×</option><option value="1" selected>۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option><option value="2">۲×</option></select></label><button type="button" data-iptv-tool="sleep" aria-label="زمان‌سنج خواب">🌙 زمان‌سنج خواب</button><button type="button" data-iptv-tool="lock" aria-label="قفل لمس">🔒 قفل لمس</button>';
  tools.querySelectorAll('button,select').forEach(function(el){Object.assign(el.style,{padding:'7px 10px',borderRadius:'8px',border:'1px solid #777',background:'#173c31',color:'#fff',fontSize:'12px'})});
  host.insertAdjacentElement('afterend',tools);
  var locked=false;
  tools.addEventListener('click',function(e){var b=e.target.closest('[data-iptv-tool]');if(!b)return;if(b.dataset.iptvTool==='jump')jumpToTime();if(b.dataset.iptvTool==='sleep')setSleepTimer();if(b.dataset.iptvTool==='lock'){locked=!locked;native.setLocked(locked).then(function(){b.textContent=locked?'🔓 بازکردن قفل':'🔒 قفل لمس';status(locked?'لمس تصویر قفل شد.':'قفل لمس برداشته شد.')}).catch(function(err){locked=!locked;status('قفل لمس فعال نشد: '+(err.message||err))})}});
  native.on('lockChanged',function(e){locked=!!(e&&e.locked);var b=tools.querySelector('[data-iptv-tool="lock"]');if(b)b.textContent=locked?'🔓 بازکردن قفل':'🔒 قفل لمس'});
  tools.addEventListener('change',function(e){if(e.target.dataset.iptvTool==='speed')setSpeed(e.target.value).catch(function(err){status('تغییر سرعت ناموفق بود: '+(err.message||err))})});
 }
 function hidePlayer(){
  clearTimeout(sleepTimer);sleepTimer=0;
  active=false;document.body.classList.remove('native-player-active');
  var p=plugin();if(!p)return Promise.resolve();
  return setFullscreen(false).then(function(){return p.stop?p.stop():null})
   .catch(function(err){console.warn('[Naghme IPTV] stop:',err)})
   .then(function(){return p.setVisible?p.setVisible({visible:false}):null})
   .catch(function(err){console.warn('[Naghme IPTV] hide:',err)});
 }
 function onLayoutChange(){
  if(!active)return;
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(function(){syncBounds()},100);
 }
 addControls();
 window.NaghmeNativeIPTV={play:playChannel,hide:hidePlayer,syncBounds:syncBounds,fullscreen:setFullscreen,setSpeed:setSpeed,setQuality:function(h){return native.setVideoQuality(Number(h)||0)},jumpToTime:jumpToTime,setSleepTimer:setSleepTimer};
 window.addEventListener('resize',onLayoutChange,{passive:true});
 window.addEventListener('orientationchange',function(){
  setTimeout(function(){
   if(active&&window.NaghmeIPTVFullscreen)window.NaghmeIPTVFullscreen(!!(window.matchMedia&&window.matchMedia('(orientation: landscape)').matches));
   onLayoutChange();
  },300);
 },{passive:true});
 document.addEventListener('fullscreenchange',onLayoutChange);
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')onLayoutChange()});
 console.log('[Naghme IPTV] native bridge ready');
})();