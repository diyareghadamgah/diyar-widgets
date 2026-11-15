(function(){
'use strict';
var cap=window.Capacitor;
var native=!!(cap&&typeof cap.isNativePlatform==='function'&&cap.isNativePlatform());
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