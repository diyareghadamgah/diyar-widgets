/* سیستم ثبت قالب‌ها
   هر قالب در یک فایل جدا (js/templates/) نوشته می‌شود و با registerTemplate خودش را ثبت می‌کند. */
'use strict';
/* ابعاد منطقی پیش‌فرض (واحد طراحی همهٔ قالب‌ها). قالب‌هایی که ابعاد متفاوتی می‌خواهند می‌توانند
   هنگام registerTemplate مقدار dims:{w,h} بدهند (مثل قالب A4). اندازهٔ فیزیکی canvas هنگام خروجی
   با ضریب مقیاس تغییر می‌کند ولی واحد طراحی همان dims می‌ماند. */
const CARD_W=1050,CARD_H=1180;
const TEMPLATES={};      // id -> {id,label,short,swatch,style,draw,dims?,skipEventBadge?}
const TEMPLATE_LIST=[];  // ترتیب نمایش قالب‌ها
const DEFAULT_TEMPLATE='dailyoccasion';
function dimsOf(tid){
  const t=TEMPLATES[tid];
  return (t&&t.dims)||{w:CARD_W,h:CARD_H};
}
function registerTemplate(t){
  const originalDraw=t.draw;
  t.draw=async function(i){
    window.__eventPanelDrawn=false;
    const r=originalDraw(i);if(r&&typeof r.then==='function')await r;
    // نشان پایین کارت فقط وقتی کشیده می‌شود که خود قالب کادر مناسبت نکشیده باشد (قبلاً روی فوتر می‌افتاد و مناسبت دوبار نمایش داده می‌شد).
    // قالب‌هایی که می‌خواهند کاملاً بدون نشان باشند (مثل A4) می‌توانند skipEventBadge:true بدهند.
    if(t.id!=='dailyoccasion' && !t.skipEventBadge && !window.__eventPanelDrawn && typeof drawEventsBadge==='function')drawEventsBadge(i);
  };
  TEMPLATES[t.id]=t;TEMPLATE_LIST.push(t);
}
