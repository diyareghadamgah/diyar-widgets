/* سیستم ثبت قالب‌ها
   هر قالب در یک فایل جدا (js/templates/) نوشته می‌شود و با registerTemplate خودش را ثبت می‌کند. */
'use strict';
const TEMPLATES={};      // id -> {id,label,short,swatch,style,draw}
const TEMPLATE_LIST=[];  // ترتیب نمایش قالب‌ها
const DEFAULT_TEMPLATE='royal';
function registerTemplate(t){TEMPLATES[t.id]=t;TEMPLATE_LIST.push(t);}
