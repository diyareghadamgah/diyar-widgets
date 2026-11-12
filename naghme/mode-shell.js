(function(){
'use strict';
const $=s=>document.querySelector(s);
const body=document.body;
let current='home';
function setClass(mode){
 body.classList.remove('mode-home','mode-music','mode-video','mode-tv');
 body.classList.add('mode-'+mode);
 current=mode;
 const home=$('#modeHome'),bar=$('#modeBar'),side=$('#side'),view=$('#view'),tv=$('#tvpage'),video=$('#videoPage'),header=document.querySelector('main>header'),mini=$('#mini'),np=$('#np');
 if(home)home.hidden=mode!=='home';
 if(bar)bar.hidden=mode==='home';
 if(side)side.hidden=mode==='home'||mode==='video'||mode==='tv';
 if(header)header.hidden=mode==='home'||mode==='video'||mode==='tv';
 if(view)view.hidden=mode==='home'||mode==='video'||mode==='tv';
 if(tv)tv.hidden=mode!=='tv';
 if(video)video.hidden=mode!=='video';
 if(mini)mini.hidden=mode!=='music';
 if(np&&mode!=='music')np.hidden=true;
 const title=$('#modeTitle');
 if(title)title.textContent=mode==='music'?'🎵 موزیک':mode==='video'?'🎬 ویدئو':mode==='tv'?'📺 تلویزیون':'نغمه';
}
function clickNav(value,attempt=0){
 const b=$('#nav [data-a="nav"][data-v="'+value+'"]');
 if(b){b.click();return}
 if(attempt<20)setTimeout(()=>clickNav(value,attempt+1),100);
}
function leaveOtherModes(){
 if(window.NaghmeLeaveIPTV)window.NaghmeLeaveIPTV();
 if(current==='video')clickNav('home');
}
function home(){
 if(current==='video')clickNav('home');
 else if(current==='tv')clickNav('home');
 else if(window.NaghmeLeaveIPTV)window.NaghmeLeaveIPTV();
 setClass('home');
}
function music(){
 if(current==='video'||current==='tv')clickNav('home');
 if(window.NaghmeLeaveIPTV)window.NaghmeLeaveIPTV();
 setClass('music');
 clickNav('home');
}
function video(){
 if(current==='tv'&&window.NaghmeLeaveIPTV)window.NaghmeLeaveIPTV();
 if(current==='video'){setClass('video');return}
 setClass('video');
 clickNav('video');
}
function tv(){
 if(current==='video')clickNav('home');
 if(window.NaghmeLeaveIPTV)window.NaghmeLeaveIPTV();
 setClass('tv');
 clickNav('iptv');
}
document.addEventListener('click',function(e){
 const pick=e.target.closest('[data-mode]');
 if(pick){const m=pick.dataset.mode;if(m==='music')music();else if(m==='video')video();else if(m==='tv')tv();return}
 if(e.target.closest('#modeBack')){home();return}
},true);
setClass('home');
window.NaghmeMode={home,music,video,tv,get current(){return current}};
})();