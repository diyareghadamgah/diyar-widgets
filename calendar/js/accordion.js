/* منوهای کشویی: بخش‌های اصلی و زیربخش‌های تنظیمات باز و بسته می‌شوند
   و وضعیت هر کدام در مرورگر ذخیره می‌ماند. */
(function(){
'use strict';
const KEY='diyar-calendar-ui-v2';
let saved={};
try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(_){}};
const items=[];

function setup(box,head,cls,id,defOpen){
  head.classList.add('acc-head');
  head.setAttribute('role','button');
  head.tabIndex=0;
  const set=(open,store)=>{
    box.classList.toggle(cls,!open);
    head.setAttribute('aria-expanded',String(open));
    if(store!==false){saved[id]=open;persist();}
  };
  const toggle=()=>set(box.classList.contains(cls));
  head.addEventListener('click',toggle);
  head.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}
  });
  set(id in saved?!!saved[id]:defOpen,false);
  items.push(open=>set(open));
}

document.querySelectorAll('.sidebar .section').forEach((sec,k)=>{
  const h=sec.querySelector(':scope>h3');
  if(h)setup(sec,h,'collapsed','sec'+k,false);
});
document.querySelectorAll('.sidebar .subsec').forEach((sub,k)=>{
  const t=sub.querySelector(':scope>.subsec-title');
  if(!t)return;
  setup(sub,t,'sub-collapsed','sub'+k,false);
});

const tools=document.createElement('div');
tools.className='row2 acc-tools';
tools.innerHTML='<button type="button" class="alt" id="accOpenAll">باز کردن همه</button>'+
                '<button type="button" class="alt" id="accCloseAll">بستن همه</button>';
const title=document.querySelector('.sidebar .title');
if(title)title.insertAdjacentElement('afterend',tools);
document.getElementById('accOpenAll').onclick=()=>items.forEach(f=>f(true));
document.getElementById('accCloseAll').onclick=()=>items.forEach(f=>f(false));
})();
