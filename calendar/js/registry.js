/* سیستم ثبت قالب‌ها
   هر قالب در یک فایل جدا (js/templates/) نوشته می‌شود و با registerTemplate خودش را ثبت می‌کند. */
'use strict';
/* ابعاد منطقی کارت (واحد طراحی همهٔ قالب‌ها). اندازهٔ فیزیکی canvas هنگام خروجی با ضریب مقیاس تغییر می‌کند. */
const CARD_W=1050,CARD_H=1180;
const TEMPLATES={};      // id -> {id,label,short,swatch,style,draw}
const TEMPLATE_LIST=[];  // ترتیب نمایش قالب‌ها
const DEFAULT_TEMPLATE='dailyoccasion';
function registerTemplate(t){
  const originalDraw=t.draw;
  t.draw=async function(i){
    window.__eventPanelDrawn=false;
    const r=originalDraw(i);if(r&&typeof r.then==='function')await r;
    // نشان پایین کارت فقط وقتی کشیده می‌شود که خود قالب کادر مناسبت نکشیده باشد (قبلاً روی فوتر می‌افتاد و مناسبت دوبار نمایش داده می‌شد).
    if(t.id!=='dailyoccasion' && !window.__eventPanelDrawn && typeof drawEventsBadge==='function')drawEventsBadge(i);
  };
  TEMPLATES[t.id]=t;TEMPLATE_LIST.push(t);
}
