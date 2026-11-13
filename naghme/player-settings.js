(function(){
'use strict';
var KEY='naghme-player-settings-v1';
var defaults={videoSpeed:'1',iptvSpeed:'1',videoRepeat:'off',showJump:true,showSleep:true,showInfo:true,showDiagnostics:true};
function read(){var saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){}if(saved.settingsVersion!==2){saved.videoSpeed='1';saved.settingsVersion=2;try{localStorage.setItem(KEY,JSON.stringify(Object.assign({},defaults,saved)))}catch(_){}}return Object.assign({},defaults,saved)}
var prefs=read();
function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch(_){}apply();document.dispatchEvent(new CustomEvent('naghme:player-settings',{detail:Object.assign({},prefs)}))}
function apply(){
 document.querySelectorAll('[data-vact]').forEach(function(el){var a=el.dataset.vact,map={jump:'showJump',sleep:'showSleep',info:'showInfo',diagnostics:'showDiagnostics'};if(map[a])el.hidden=!prefs[map[a]]});
 document.querySelectorAll('#videoSpeed, #videoSpeedMenu').forEach(function(vs){if(!vs.dataset.userChanged)vs.value=prefs.videoSpeed||'1'});
}
function close(){var d=document.getElementById('naghmePlayerSettings');if(d)d.remove()}
function open(anchor){
 close();var d=document.createElement('div');d.id='naghmePlayerSettings';d.dir='rtl';
 var rect=anchor&&anchor.getBoundingClientRect?anchor.getBoundingClientRect():{bottom:56,left:12,right:56};
 var vv=window.visualViewport;var vh=vv&&vv.height?vv.height:window.innerHeight;
 Object.assign(d.style,{position:'fixed',inset:'0',zIndex:'2147482500',display:'flex',alignItems:'flex-end',justifyContent:'center',boxSizing:'border-box',padding:'12px 10px calc(10px + env(safe-area-inset-bottom))',background:'rgba(0,0,0,.58)',pointerEvents:'auto'});
 var card=document.createElement('section');Object.assign(card.style,{position:'relative',width:'min(460px,100%)',maxHeight:'min(78dvh,'+Math.max(300,vh-28)+'px)',display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--s1,#171717)',color:'var(--tx,#fff)',border:'1px solid rgba(16,185,129,.65)',borderRadius:'20px',padding:'0',fontFamily:'inherit',boxShadow:'0 14px 42px #000c',pointerEvents:'auto'});
 card.innerHTML='<header class="naghme-tools-head"><div><h2>⚙️ ابزارهای پلیر</h2><p>کنترل‌های پخش و تنظیمات</p></div><button type="button" data-close aria-label="بستن">✕</button></header><div class="naghme-tools-scroll"><section class="naghme-tools-group"><h3>کنترل پخش</h3><div id="naghmeVideoToolGrid"><button data-vact="toggle">▶ / ⏸ پخش</button><button data-vact="lock">🔒 قفل لمس</button><button data-vact="back">⏪ ۱۰ ثانیه</button><button data-vact="forward">۱۰ ثانیه ⏩</button><button data-vact="full">⛶ تمام‌صفحه</button><button data-vact="repeat" id="videoRepeat">'+(prefs.videoRepeat==='one'?'🔂 تکرار: یک ویدئو':'🔁 تکرار: خاموش')+'</button></div><label class="naghme-tools-speed"><span>سرعت پخش</span><select id="videoSpeedMenu"><option value=".5">۰٫۵×</option><option value=".75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option><option value="1.75">۱٫۷۵×</option><option value="2">۲×</option></select></label></section><section class="naghme-tools-group"><h3>ابزارهای بیشتر</h3><div id="naghmeVideoExtraGrid"><button data-vact="jump">⏱ رفتن به زمان</button><button data-vact="sleep">🌙 زمان‌سنج خواب</button><button data-vact="info">ℹ️ اطلاعات ویدئو</button><button data-vact="diagnostics">🧾 گزارش فنی</button><button data-vact="subtitle">زیرنویس SRT/VTT</button></div></section><details class="naghme-tools-prefs"><summary>تنظیمات پیش‌فرض و نمایش</summary><label>سرعت پیش‌فرض ویدئو <select data-pref="videoSpeed"><option value=".5">۰٫۵×</option><option value=".75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option><option value="1.75">۱٫۷۵×</option><option value="2">۲×</option></select></label><label>تکرار پیش‌فرض <select data-pref="videoRepeat"><option value="off">خاموش</option><option value="one">تکرار همین ویدئو</option></select></label><div class="naghme-tools-checks">'+[['showJump','نمایش رفتن به زمان'],['showSleep','نمایش زمان‌سنج'],['showInfo','نمایش اطلاعات'],['showDiagnostics','نمایش گزارش فنی']].map(function(x){return '<label><input type="checkbox" data-pref="'+x[0]+'"> '+x[1]+'</label>'}).join('')+'</div></details></div><footer class="naghme-tools-foot"><button type="button" data-reset>بازنشانی</button><button type="button" data-close>بستن</button></footer>';
 d.append(card);d.addEventListener('click',function(e){
  if(e.target===d||e.target.closest('[data-close]')){close();return}
  if(e.target.closest('[data-reset]')){prefs=Object.assign({},defaults);save();open();return}
  var action=e.target.closest('[data-vact]');if(action){close();return}
  var el=e.target.closest('[data-pref]');if(el){prefs[el.dataset.pref]=el.type==='checkbox'?el.checked:el.value;save()}
 });
 card.querySelectorAll('[data-pref]').forEach(function(el){el.type==='checkbox'?el.checked=!!prefs[el.dataset.pref]:el.value=prefs[el.dataset.pref]});
 var speed=card.querySelector('#videoSpeedMenu');if(speed)speed.value=prefs.videoSpeed;
 document.body.append(d);d.addEventListener('click',function(e){if(e.target===d)close()});apply();
}
// دکمهٔ سه‌نقطه با شنوندهٔ مستقیم خودش منو را باز می‌کند؛ شنوندهٔ سراسری حذف شد تا با رویدادهای پلیر تداخل نکند.
function bindGear(b){if(!b)return;b.dataset.settingsBound='1'}
function addButton(){
 var now=document.querySelector('.video-now');
 if(now){
  var b=now.querySelector('[data-player-settings]');
  if(!b){b=document.createElement('button');b.type='button';b.dataset.playerSettings='1';now.append(b)}
  b.className='video-more';if(b.textContent!=='⋮')b.textContent='⋮';b.title='ابزارهای پخش';b.setAttribute('aria-label','بازکردن ابزارهای پخش');
  if(!b.dataset.directSettingsBound){b.dataset.directSettingsBound='1';b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();open(b)})}
  apply();
 }
}
// منوی شناور سه‌نقطه در کنار نام ویدئو؛ پس از هر بار ساخته‌شدن بخش ویدئو دوباره متصل می‌شود.
function watchVideoHeader(){addButton();var root=document.getElementById('videoContent')||document.body;new MutationObserver(function(){addButton()}).observe(root,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchVideoHeader,{once:true});else watchVideoHeader();
window.NaghmePlayerSettings={get:function(){return Object.assign({},prefs)},open:open,apply:apply};
document.addEventListener('change',function(e){if(e.target.id==='videoSpeed'||e.target.id==='videoSpeedMenu'){e.target.dataset.userChanged='1';prefs.videoSpeed=e.target.value;save()}});
document.addEventListener('naghme:player-settings',apply);apply();
})();