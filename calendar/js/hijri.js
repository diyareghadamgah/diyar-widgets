/* تاریخ قمری مطابق تقویم رسمی ایران برای بازهٔ پوشش‌داده‌شده توسط داده‌های رسمی ۱۴۰۵.
   جدول زیر «آغاز ماه‌های قمری» را نشان می‌دهد که از خودِ مناسبت‌های رسمی js/events.js استخراج شده است
   (مثلاً عید فطر = ۱ شوال، عاشورا = ۱۰ محرم، مبعث = ۲۷ رجب …). تقویم «ام‌القری» که مرورگر ارائه می‌کند
   در چند ماه (شوال ۱۴۴۷، ذی‌القعده ۱۴۴۷، صفر، ربیع‌الثانی، رجب و شعبان ۱۴۴۸) یک روز با اعلام رسمی ایران تفاوت دارد.
   خارج از این بازه، از ام‌القری به‌علاوهٔ «اصلاح تاریخ قمری» دستی استفاده می‌شود.
   هنگام انتشار اصلاحیهٔ رسمی یا افزودن سال بعد، فقط همین جدول و js/events.js به‌روزرسانی شوند. */
'use strict';
const HIJRI_OFFICIAL_STARTS=[
  ['2026-03-21',1447,10],['2026-04-19',1447,11],['2026-05-18',1447,12],
  ['2026-06-16',1448,1],['2026-07-16',1448,2],['2026-08-14',1448,3],['2026-09-13',1448,4],
  ['2026-10-12',1448,5],['2026-11-11',1448,6],['2026-12-11',1448,7],['2027-01-10',1448,8],
  ['2027-02-08',1448,9],['2027-03-10',1448,10]
].map(([iso,y,m])=>{const [a,b,c]=iso.split('-').map(Number);return {day:Math.floor(Date.UTC(a,b-1,c,12)/864e5),y,m};});

function hijriUmmAlQura(date){
  const p=new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'numeric',year:'numeric',timeZone:'UTC'}).formatToParts(date);
  const g=t=>+p.find(x=>x.type===t).value.replace(/\D/g,'');
  return {d:g('day'),m:g('month'),y:g('year'),official:false};
}
/* date: Date در UTC (ساعت ۱۲). خروجی: {y,m,d,official} */
function hijriParts(date){
  const day=Math.floor(date.getTime()/864e5);
  for(let k=0;k<HIJRI_OFFICIAL_STARTS.length;k++){
    const cur=HIJRI_OFFICIAL_STARTS[k],next=HIJRI_OFFICIAL_STARTS[k+1];
    const end=next?next.day:cur.day+29;      // آخرین ماهِ جدول: فقط روزهای ۱ تا ۲۹ قطعی است
    if(day>=cur.day&&day<end)return {y:cur.y,m:cur.m,d:day-cur.day+1,official:true};
  }
  return hijriUmmAlQura(date);
}
