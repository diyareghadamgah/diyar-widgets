(function(){
'use strict';
var KEY='naghme-player-settings-v1';
var defaults={videoSpeed:'1',iptvSpeed:'1',videoRepeat:'off',showJump:true,showSleep:true,showInfo:true,showDiagnostics:true};
function read(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(_){return Object.assign({},defaults)}}
var prefs=read();
function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch(_){}apply();document.dispatchEvent(new CustomEvent('naghme:player-settings',{detail:Object.assign({},prefs)}))}
function apply(){
 document.querySelectorAll('[data-vact]').forEach(function(el){var a=el.dataset.vact,map={jump:'showJump',sleep:'showSleep',info:'showInfo',diagnostics:'showDiagnostics'};if(map[a])el.hidden=!prefs[map[a]]});
 var vs=document.getElementById('videoSpeed');if(vs&&!vs.dataset.userChanged)vs.value=prefs.videoSpeed;
}
function close(){var d=document.getElementById('naghmePlayerSettings');if(d)d.remove()}
function open(anchor){
 close();var d=document.createElement('div');d.id='naghmePlayerSettings';d.dir='rtl';
 var rect=anchor&&anchor.getBoundingClientRect?anchor.getBoundingClientRect():{bottom:56,left:12,right:56};
 var top=Math.max(8,Math.min(window.innerHeight-180,rect.bottom+6));
 Object.assign(d.style,{position:'fixed',inset:'0',zIndex:'2147482500',pointerEvents:'none'});

 var card=document.createElement('section');Object.assign(card.style,{position:'absolute',top:top+'px',right:'10px',width:'min( min(420px, calc(100vw - 20px)), calc(100vw - 20px))',maxHeight:'min(72vh, '+Math.max(160,window.innerHeight-top-16)+'px)',overflow:'auto',background:'var(--s1,#171717)',color:'var(--tx,#fff)',border:'1px solid var(--ac,#10b981)',borderRadius:'16px',padding:'14px',fontFamily:'inherit',boxShadow:'0 12px 36px #000b',pointerEvents:'auto'});
 card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">⚙️ ابزارهای پلیر</h2><button type="button" data-close>✕</button></div><p style="color:var(--mu,#aaa);font-size:12px;margin:6px 0 12px">همهٔ کنترل‌ها اینجا جمع شده‌اند تا فضای زیر مانیتور آزاد بماند.</p><div id="naghmeVideoToolGrid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><button data-vact="back">⏪ ۱۰ ثانیه</button><button data-vact="toggle">▶ / ⏸ پخش</button><button data-vact="forward">۱۰ ثانیه ⏩</button><button data-vact="full">⛶ تمام‌صفحه</button><label style="grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px">سرعت پخش <select id="videoSpeed"><option value=".5">۰٫۵×</option><option value=".75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option><option value="1.75">۱٫۷۵×</option><option value="2">۲×</option></select></label><button data-vact="jump">⏱ رفتن به زمان</button><button data-vact="sleep">🌙 زمان‌سنج خواب</button><button data-vact="repeat" id="videoRepeat">'+(prefs.videoRepeat==='one'?'🔂 تکرار: یک ویدئو':'🔁 تکرار: خاموش')+'</button><button data-vact="info">ℹ️ اطلاعات ویدئو</button><button data-vact="subtitle">زیرنویس SRT/VTT</button><button data-vact="diagnostics">گزارش فنی</button></div><h3 style="margin:16px 0 8px">تنظیمات پیش‌فرض</h3><label style="display:block;margin:8px 0">سرعت پیش‌فرض ویدئو <select data-pref="videoSpeed"><option value=".5">۰٫۵×</option><option value=".75">۰٫۷۵×</option><option value="1">۱×</option><option value="1.25">۱٫۲۵×</option><option value="1.5">۱٫۵×</option><option value="1.75">۱٫۷۵×</option><option value="2">۲×</option></select></label><label style="display:block;margin:8px 0">تکرار پیش‌فرض <select data-pref="videoRepeat"><option value="off">خاموش</option><option value="one">تکرار همین ویدئو</option></select></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">'+[['showJump','نمایش رفتن به زمان'],['showSleep','نمایش زمان‌سنج'],['showInfo','نمایش اطلاعات'],['showDiagnostics','نمایش گزارش فنی']].map(function(x){return '<label><input type="checkbox" data-pref="'+x[0]+'"> '+x[1]+'</label>'}).join('')+'</div><div style="display:flex;gap:8px;margin-top:16px"><button type="button" data-reset>بازنشانی</button><button type="button" data-close style="background:var(--ac,#10b981);color:#07140e;flex:1">بستن</button></div>';
 d.append(card);d.addEventListener('click',function(e){
  if(e.target===d||e.target.closest('[data-close]')){close();return}
  if(e.target.closest('[data-reset]')){prefs=Object.assign({},defaults);save();open();return}
  var action=e.target.closest('[data-vact]');if(action){close();return}
  var el=e.target.closest('[data-pref]');if(el){prefs[el.dataset.pref]=el.type==='checkbox'?el.checked:el.value;save()}
 });
 card.querySelectorAll('[data-pref]').forEach(function(el){el.type==='checkbox'?el.checked=!!prefs[el.dataset.pref]:el.value=prefs[el.dataset.pref]});
 var speed=card.querySelector('#videoSpeed');if(speed)speed.value=prefs.videoSpeed;
 document.body.append(d);d.addEventListener('click',function(e){if(e.target===d)close()});apply();
}
// دکمهٔ سه‌نقطه با شنوندهٔ مستقیم خودش منو را باز می‌کند؛ شنوندهٔ سراسری حذف شد تا با رویدادهای پلیر تداخل نکند.
function bindGear(b){if(!b)return;b.dataset.settingsBound='1'}
function addButton(){
 var now=document.querySelector('.video-now');
 if(now){
  var b=now.querySelector('[data-player-settings]');
  if(!b){b=document.createElement('button');b.type='button';b.dataset.playerSettings='1';now.append(b)}
  b.className='video-more';b.textContent='⋮';b.title='ابزارهای پخش';b.setAttribute('aria-label','بازکردن ابزارهای پخش');
  if(!b.dataset.directSettingsBound){b.dataset.directSettingsBound='1';b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();open(b)})}
 }
}
addButton();new MutationObserver(function(){addButton()}).observe(document.body,{childList:true,subtree:true});
window.NaghmePlayerSettings={get:function(){return Object.assign({},prefs)},open:open,apply:apply};
document.addEventListener('change',function(e){if(e.target.id==='videoSpeed')e.target.dataset.userChanged='1'});
document.addEventListener('naghme:player-settings',apply);apply();
})();