(function(){
'use strict';
var cap=window.Capacitor;
var native=!!(cap&&typeof cap.isNativePlatform==='function'&&cap.isNativePlatform());
if(native)return;
var toolsId='naghmeIptvTools';
function video(){return document.getElementById('iptvVideo')}
function addControls(){
 var host=document.querySelector('#tvpage .tvnow');
 if(!host||document.getElementById(toolsId))return;
 var box=document.createElement('div');box.id=toolsId;box.dir='rtl';
 box.innerHTML='<label class="iptv-range-control" for="iptvWebVolume"><span>🔊 صدا</span><input id="iptvWebVolume" type="range" min="0" max="1" step="0.01" value="1" aria-label="تنظیم صدای شبکه"></label><label class="iptv-range-control" for="iptvWebBrightness"><span>☀ روشنایی</span><input id="iptvWebBrightness" type="range" min="0.2" max="1.8" step="0.02" value="1" aria-label="تنظیم روشنایی تصویر"></label>';
 host.insertAdjacentElement('afterend',box);
 var v=video(),vol=box.querySelector('#iptvWebVolume'),bright=box.querySelector('#iptvWebBrightness');
 try{var saved=JSON.parse(localStorage.getItem('naghme-iptv-web-controls')||'{}');if(Number.isFinite(saved.volume))vol.value=String(saved.volume);if(Number.isFinite(saved.brightness))bright.value=String(saved.brightness)}catch(_){}
 if(v)v.volume=Number(vol.value);
 function applyVolume(){var el=video();if(el)el.volume=Number(vol.value);save()}
 function applyBrightness(){var el=video();if(el)el.style.filter='brightness('+Number(bright.value)+')';save()}
 function save(){try{localStorage.setItem('naghme-iptv-web-controls',JSON.stringify({volume:Number(vol.value),brightness:Number(bright.value)}))}catch(_){}}
 vol.addEventListener('input',applyVolume);vol.addEventListener('change',applyVolume);
 bright.addEventListener('input',applyBrightness);bright.addEventListener('change',applyBrightness);
 applyBrightness();
}
function syncLayout(){
 var page=document.getElementById('tvpage'),player=document.querySelector('#tvpage .tvplayer'),browse=document.querySelector('#tvpage .tvbrowse'),box=document.getElementById('tvbox'),now=document.querySelector('#tvpage .tvnow'),stat=document.getElementById('iptvStatus'),tools=document.getElementById(toolsId);
 if(!page||!player||!browse||!box||!now)return;
 var split=!!(window.matchMedia&&window.matchMedia('(orientation: landscape)').matches&&!document.fullscreenElement);
 page.classList.toggle('iptv-split-landscape',split);
 if(split){
  if(now.parentElement!==browse)browse.insertBefore(now,browse.firstChild);
  if(stat&&stat.parentElement!==browse)browse.insertBefore(stat,now.nextSibling);
  if(tools&&tools.parentElement!==browse)browse.insertBefore(tools,stat?stat.nextSibling:now.nextSibling);
 }else{
  if(now.parentElement!==player)box.insertAdjacentElement('afterend',now);
  if(stat&&stat.parentElement!==player)now.insertAdjacentElement('afterend',stat);
  if(tools&&tools.parentElement!==player)(stat||now).insertAdjacentElement('afterend',tools);
 }
}
function init(){
 addControls();syncLayout();
 window.addEventListener('resize',syncLayout,{passive:true});
 window.addEventListener('orientationchange',function(){setTimeout(syncLayout,250)},{passive:true});
 document.addEventListener('fullscreenchange',syncLayout);
 var page=document.getElementById('tvpage');
 if(page)new MutationObserver(function(){addControls();syncLayout()}).observe(page,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.NaghmeIPTVWebControls={syncLayout:syncLayout};
})();