'use strict';

/* مناسبت‌های رسمی و مهم سال ۱۴۰۵ ایران.
   holiday فقط وقتی true است که روز در فهرست تعطیلات رسمی کشور قرار دارد.
   منبع تطبیق تقویم: تقویم ۱۴۰۵ باحساب/تقویم‌های منتشرشدهٔ ایران. */
const EVENTS_1405 = [
  ['1405/01/01','نوروز','national',true],
  ['1405/01/01','عید سعید فطر','religious',true],
  ['1405/01/02','عید نوروز','national',true],
  ['1405/01/02','تعطیل به مناسبت عید سعید فطر','religious',true],
  ['1405/01/03','عید نوروز','national',true],
  ['1405/01/04','عید نوروز','national',true],
  ['1405/01/12','روز جمهوری اسلامی ایران','national',true],
  ['1405/01/13','روز طبیعت','national',true],
  ['1405/01/25','شهادت امام جعفر صادق (ع)','religious',true],
  ['1405/02/12','روز معلم','cultural',false],
  ['1405/02/18','روز جهانی موزه و میراث فرهنگی','global',false],
  ['1405/03/03','شهادت امام محمد باقر (ع)','religious',true],
  ['1405/03/06','عید سعید قربان','religious',true],
  ['1405/03/14','رحلت امام خمینی (ره)','historical',true],
  ['1405/03/14','عید سعید غدیر خم','religious',true],
  ['1405/03/15','قیام ۱۵ خرداد','historical',true],
  ['1405/04/03','تاسوعای حسینی','religious',true],
  ['1405/04/04','عاشورای حسینی','religious',true],
  ['1405/04/07','روز قوه قضائیه','historical',false],
  ['1405/04/10','روز صنعت و معدن','national',false],
  ['1405/04/14','روز قلم','cultural',false],
  ['1405/04/21','روز عفاف و حجاب','cultural',false],
  ['1405/04/25','روز بهزیستی و تأمین اجتماعی','national',false],
  ['1405/05/13','اربعین حسینی','religious',true],
  ['1405/05/21','رحلت حضرت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)','religious',true],
  ['1405/05/22','شهادت امام رضا (ع)','religious',true],
  ['1405/05/30','شهادت امام حسن عسکری (ع) و آغاز امامت حضرت ولیعصر (عج)','religious',true],
  ['1405/06/08','ولادت حضرت رسول اکرم (ص) و ولادت امام جعفر صادق (ع)','religious',true],
  ['1405/06/17','روز فرهنگ پهلوانی و ورزش زورخانه‌ای','cultural',false],
  ['1405/06/31','روز گرامیداشت شهدای دفاع مقدس','historical',false],
  ['1405/08/13','روز دانش‌آموز','historical',false],
  ['1405/08/22','شهادت حضرت فاطمه زهرا (س)','religious',true],
  ['1405/09/30','شب یلدا','cultural',false],
  ['1405/10/02','ولادت حضرت علی (ع) و روز پدر','religious',true],
  ['1405/11/04','ولادت حضرت قائم (عج) و نیمه شعبان','religious',true],
  ['1405/12/09','شهادت حضرت علی (ع)','religious',true],
  ['1405/12/19','عید سعید فطر','religious',true],
  ['1405/12/20','تعطیل به مناسبت عید سعید فطر','religious',true],
  ['1405/12/29','روز ملی شدن صنعت نفت ایران','national',true]
  ['1405/01/30','ولادت حضرت معصومه (س) و روز دختر','religious',false],
  ['1405/02/03','روز بزرگداشت شیخ بهایی و روز ملی کارآفرینی','cultural',false],
  ['1405/02/10','روز ملی خلیج فارس','national',false],
  ['1405/02/11','روز جهانی کار و کارگر','global',false],
  ['1405/02/15','روز جهانی ماما','global',false],
  ['1405/02/18','روز جهانی موزه و میراث فرهنگی و روز جهانی صلیب سرخ','global',false],
  ['1405/03/01','روز بهره‌وری و بهینه‌سازی مصرف','national',false],
  ['1405/03/07','روز جهانی محیط زیست','global',false],
  ['1405/03/22','روز جهانی مبارزه با کار کودکان','global',false],
  ['1405/04/01','روز اصناف','national',false],
  ['1405/05/06','روز کارآفرینی و ترویج آموزش‌های فنی و حرفه‌ای','cultural',false],
  ['1405/05/09','روز اهدای خون','national',false],
  ['1405/05/10','روز جهانی شیر مادر','global',false],
  ['1405/06/01','روز پزشک','cultural',false],
  ['1405/06/04','روز کارمند','national',false],
  ['1405/06/05','روز داروساز','cultural',false],
  ['1405/06/11','روز صنعت چاپ','cultural',false],
  ['1405/06/15','روز خانواده و تکریم بازنشستگان','cultural',false],
  ['1405/07/01','روز شعر و ادب فارسی و بزرگداشت شهریار','cultural',false],
  ['1405/07/08','روز بزرگداشت مولوی','cultural',false],
  ['1405/07/13','روز جهانی معلم','global',false],
  ['1405/07/14','روز دامپزشکی','cultural',false],
  ['1405/07/16','روز جهانی کودک','global',false],
  ['1405/07/19','روز جهانی دختر','global',false],
  ['1405/07/20','روز بزرگداشت حافظ','cultural',false],
  ['1405/07/22','روز جهانی استاندارد','global',false],
  ['1405/07/23','روز جهانی نابینایان و عصای سفید','global',false],
  ['1405/07/24','ولادت حضرت زینب (س) و روز پرستار','religious',false],
  ['1405/07/26','روز تربیت بدنی و ورزش','national',false],
  ['1405/08/24','روز کتاب و کتابخوانی','cultural',false],
  ['1405/09/09','ولادت حضرت فاطمه زهرا (س) و روز مادر و روز زن','religious',false],
  ['1405/09/13','روز بیمه','national',false],
  ['1405/09/15','روز حسابدار','cultural',false],
  ['1405/09/25','روز پژوهش','cultural',false],
  ['1405/09/26','روز حمل‌ونقل و رانندگان','national',false],
  ['1405/09/29','ولادت امام محمد تقی (ع) و روز پسر','religious',false],
  ['1405/10/01','جشن خرم‌روز','cultural',false],
  ['1405/11/25','روز عشق / ولنتاین','global',false],
  ['1405/12/05','جشن اسفندگان و روز بزرگداشت خواجه نصیرالدین طوسی و روز مهندس','cultural',false],
  ['1405/12/14','روز احسان و نیکوکاری','cultural',false],
  ['1405/12/15','روز درختکاری','national',false],
  ['1405/12/17','روز جهانی زن','global',false],
].map(([date,title,type,holiday])=>({date,title,type,holiday}));

const EVENTS_BY_DATE = Object.create(null);
for(const event of EVENTS_1405)(EVENTS_BY_DATE[event.date] ||= []).push(event);

function eventDateKey(s){return `${s.y}/${String(s.m).padStart(2,'0')}/${String(s.d).padStart(2,'0')}`;}
function getEvents(i){return EVENTS_BY_DATE[eventDateKey(i.s)] || [];}
function eventSummary(i){return getEvents(i).map(e=>e.title).join(' • ');}
function drawEventsBadge(i){
  const events=getEvents(i); if(!events.length) return;
  const W=cv.width, text=events.map(e=>e.title).join(' • ');
  const holiday=events.some(e=>e.holiday);
  const label=holiday?'تعطیل · ':'مناسبت · ';
  const maxChars=70;
  const shown=(label+text).length>maxChars?(label+text).slice(0,maxChars-1)+'…':label+text;
  const fs=fit(shown,W-130,18,700);
  ctx.save();
  ctx.fillStyle=holiday?'rgba(139,44,44,.94)':'rgba(6,61,53,.94)';
  rr(55,1118,W-110,44,22);ctx.fill();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='700 '+fs+'px Vazirmatn';ctx.fillText(shown,W/2,1140);
  ctx.restore();
}
