(function(){
 'use strict';
 var native=window.NaghmeVideoPlayer;
 if(!native||!native.isNative||typeof native.get!=='function')return;
 var resizeTimer=0,active=false,eventsBound=false;
 function video(){return document.getElementById('iptvVideo')}
 function bounds(){
  var el=video();if(!el)return null;
  var r=el.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  if(!r.width||!r.height||el.hidden)return null;
  return {x:Math.round(r.left*dpr),y:Math.round(r.top*dpr)-Math.round(24*dpr),width:Math.round(r.width*dpr),height:Math.round(r.height*dpr)};
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
  return Promise.resolve(p.setVisible?p.setVisible({visible:true}):null)
   .then(function(){return p.play({url:channel.url})})
   .then(function(){return p.setBounds?p.setBounds(b):null})
   .then(function(){document.body.classList.add('native-player-active');status('')})
   .catch(function(err){
    var message=(err&&err.message)||String(err||'خطای ناشناخته');
    if(window.IPTV)window.IPTV.nativePlayError=message;
    status('خطای پلیر بومی: '+message);
    console.error('[Naghme IPTV] native play failed; browser fallback disabled',err);
   });
 }
 function hidePlayer(){
  active=false;document.body.classList.remove('native-player-active');
  var p=plugin();if(!p)return Promise.resolve();
  return Promise.resolve(p.stop?p.stop():null)
   .catch(function(err){console.warn('[Naghme IPTV] stop:',err)})
   .then(function(){return p.setVisible?p.setVisible({visible:false}):null})
   .catch(function(err){console.warn('[Naghme IPTV] hide:',err)});
 }
 function onLayoutChange(){
  if(!active)return;
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(function(){syncBounds()},100);
 }
 window.NaghmeNativeIPTV={play:playChannel,hide:hidePlayer,syncBounds:syncBounds};
 window.addEventListener('resize',onLayoutChange,{passive:true});
 window.addEventListener('orientationchange',function(){setTimeout(onLayoutChange,250)},{passive:true});
 document.addEventListener('fullscreenchange',onLayoutChange);
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')onLayoutChange()});
 console.log('[Naghme IPTV] native bridge ready');
})();