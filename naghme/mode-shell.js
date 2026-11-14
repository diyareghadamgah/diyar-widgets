(function(){
'use strict';
const $=s=>document.querySelector(s);
const body=document.body;
let current='home';
function setMode(mode){
 body.classList.remove('mode-home','mode-music','mode-video','mode-tv','mode-radio');
 body.classList.add('mode-'+mode);
 current=mode;
 const home=$('#modeHome'),bar=$('#modeBar'),side=$('#side'),view=$('#view'),tv=$('#tvpage'),video=$('#videoPage'),radio=$('#radioPage'),header=document.querySelector('main>header'),mini=$('#mini'),np=$('#np');
 if(home)home.hidden=mode!=='home';
 if(bar)bar.hidden=mode==='home';
 if(side)side.hidden=mode!=='music';
 if(header)header.hidden=mode!=='music';
 if(view)view.hidden=mode==='home'||mode==='video'||mode==='tv';
 if(tv)tv.hidden=mode!=='tv';
 if(video)video.hidden=mode!=='video';
 if(radio)radio.hidden=mode!=='radio';
 if(mini)mini.hidden=mode!=='music';
 if(np&&mode!=='music')np.hidden=true;
 const title=$('#modeTitle');
 if(title)title.textContent=mode==='music'?'موزیک':mode==='video'?'ویدئو':mode==='tv'?'تلویزیون اینترنتی':mode==='radio'?'رادیو اینترنتی':'نغمه';
 document.querySelectorAll('.mode-switch-actions [data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',b.dataset.mode===mode?'true':'false')});
}
function clickNav(value){
 const b=$('#nav [data-a="nav"][data-v="'+value+'"]');
 if(b)b.click();
}
function showHomeView(){clickNav('home')}
function home(){showHomeView();setMode('home')}
function music(){showHomeView();setMode('music')}
function video(){showHomeView();setMode('video');clickNav('video')}
function tv(){showHomeView();setMode('tv');clickNav('iptv')}
function radio(){showHomeView();setMode('radio')}
document.addEventListener('click',function(e){
 const pick=e.target.closest('[data-mode]');
 if(pick){const mode=pick.dataset.mode;if(mode==='music')music();else if(mode==='video')video();else if(mode==='tv')tv();else if(mode==='radio')radio();return}
 if(e.target.closest('#modeBack')){home();return}
},true);
setMode('home');
window.NaghmeMode={home,music,video,tv,radio,get current(){return current}};
})();