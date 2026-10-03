/* سیستم ثبت قالب‌ها
   هر قالب در یک فایل جدا (js/templates/) نوشته می‌شود و با registerTemplate خودش را ثبت می‌کند. */
'use strict';
const TEMPLATES={};      // id -> {id,label,short,swatch,style,draw}
const TEMPLATE_LIST=[];  // ترتیب نمایش قالب‌ها
const DEFAULT_TEMPLATE='royal';
function registerTemplate(t){
  const originalDraw=t.draw;
  t.draw=async function(i){const r=originalDraw(i);if(r&&typeof r.then==='function')await r; if(typeof drawEventsBadge==='function')drawEventsBadge(i);};
  TEMPLATES[t.id]=t;TEMPLATE_LIST.push(t);
}
