/* قالب «مناسبت روز» — چیدمان الهام‌گرفته از کارت نمونه کاربر */
(function(){
'use strict';

function fitLines(text,maxW,size,weight,maxLines){
  const lines=wrapText(text,maxW,(weight||700)+' '+size+'px Vazirmatn');
  return lines.slice(0,maxLines||3);
}

function drawDateBox(x,y,w,h,label,value,kind){
  ctx.save();
  ctx.fillStyle='#fffdf6';rr(x,y,w,h,16);ctx.fill();
  ctx.strokeStyle='#3d6518';ctx.lineWidth=3;rr(x,y,w,h,16);ctx.stroke();
  if(kind) drawIconByKind(kind,x+30,y+h/2,15,'#3d6518','#fffdf6');
  ctx.fillStyle='#17310f';ctx.textBaseline='middle';ctx.textAlign='right';
  ctx.font='900 '+fit(label,72,19,900)+'px Vazirmatn';ctx.fillText(label,x+w-18,y+h*.38);
  ctx.textAlign='left';ctx.font='900 '+fit(value,178,24,900,'Vazirmatn')+'px Vazirmatn';ctx.fillText(value,x+52,y+h*.68);
  ctx.restore();
}

function drawPhoto(){
  const x=55,y=130,w=590,h=575;
  ctx.save();
  rr(x,y,w,h,4);ctx.clip();
  ctx.fillStyle='#e9eeea';ctx.fillRect(x,y,w,h);
  const {x:ix,y:iy,w:iw,h:ih}=IMG_AREA;
  // از همان تنظیمات عکس موجود برنامه استفاده می‌کنیم، اما قاب بزرگ‌تر و مشابه نمونه است.
  if(photo&&photo.complete&&photo.naturalWidth){
    const base=Math.max(w/photo.naturalWidth,h/photo.naturalHeight),sc=base*photoZoom;
    const ww=photo.naturalWidth*sc,hh=photo.naturalHeight*sc;
    ctx.drawImage(photo,x+(w-ww)/2+photoX,y+(h-hh)/2+photoY,ww,hh);
  }else{
    ctx.fillStyle='#66756c';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='700 28px Vazirmatn';ctx.fillText('تصویر روز',x+w/2,y+h/2);
    drawCameraIcon(x+w/2,y+h/2+55,28);
  }
  ctx.restore();
  ctx.strokeStyle='#3d6518';ctx.lineWidth=4;rr(x,y,w,h,4);ctx.stroke();
  if((noteEl.value||'').trim()) drawNoteArea(x+22,y+h-75,w-44,54);
}

function drawOccasionPanel(i){
  const x=670,y=125,w=325,h=580;
  ctx.save();
  ctx.fillStyle='#385f12';rr(x,y,w,h,22);ctx.fill();
  ctx.strokeStyle='#e8c75d';ctx.lineWidth=5;rr(x,y,w,h,22);ctx.stroke();
  ctx.fillStyle='#f4df8a';rr(x+30,y+22,w-60,70,22);ctx.fill();
  ctx.fillStyle='#31570f';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='900 39px Vazirmatn';ctx.fillText('مناسبت روز',x+w/2,y+57);
  const events=getEvents(i);
  let yy=y+135;
  if(events.length){
    const maxItems=Math.min(events.length,4), bottom=y+h-28;
    events.slice(0,maxItems).forEach((e,idx)=>{
      if(yy>bottom-42)return;
      ctx.fillStyle=e.holiday?'#f3d36b':'#fffdf4';
      ctx.beginPath();ctx.arc(x+38,yy+10,6,0,Math.PI*2);ctx.fill();
      const prefix=e.holiday?'تعطیل رسمی: ':'';
      const lines=fitLines(prefix+e.title,w-76,20,700,2);
      ctx.fillStyle='#fffdf4';ctx.textAlign='right';ctx.textBaseline='top';
      ctx.font='700 20px Vazirmatn';
      lines.forEach((line,j)=>ctx.fillText(line,x+w-28,yy+j*28));
      yy+=Math.max(44,lines.length*28+16);
    });
    if(events.length>maxItems){
      ctx.fillStyle='#f4df8a';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.font='700 16px Vazirmatn';ctx.fillText('و مناسبت‌های دیگر…',x+w/2,bottom);
    }
  }else{
    // در روز بدون مناسبت، بدنه کادر عمداً خالی می‌ماند.
  }
  ctx.restore();
}

function drawTop(i){
  ctx.fillStyle='#111';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='900 35px Vazirmatn';ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',525,48);
  drawLogoBadge(940,48,36,{ringOuter:'#31570f',ringInner:'#d4ae45',placeholderColor:'#31570f',placeholderFont:11});
  ctx.fillStyle='#31570f';ctx.textAlign='right';ctx.font='800 23px Vazirmatn';const topName=(chEl.value||'دیار قدمگاه').replace('@','');
  const topNameSize=fit(topName,150,20,800);
  ctx.font='800 '+topNameSize+'px Vazirmatn';ctx.fillText(topName,980,105);
}

function drawDates(i){
  const x=670,y=735,w=325,h=56,gap=9;
  drawDateBox(x,y,w,h,'شمسی',fa(i.s.y)+'/'+fa(i.s.m).padStart(2,'۰')+'/'+fa(i.s.d).padStart(2,'۰'),'calendar');
  drawDateBox(x,y+h+gap,w,h,'قمری',fa(i.h.y)+'/'+fa(i.h.m).padStart(2,'۰')+'/'+fa(i.h.d).padStart(2,'۰'),'moon');
  drawDateBox(x,y+(h+gap)*2,w,h,'میلادی',i.g.y+'/'+String(i.g.m).padStart(2,'0')+'/'+String(i.g.d).padStart(2,'0'),'globe');
  ctx.fillStyle='#31570f';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 34px Vazirmatn';ctx.fillText(WD[i.wd],832,1018);
}

function drawDhikr(i){
  const x=55,y=735,w=590,h=250;
  ctx.fillStyle='#f9fbf7';rr(x,y,w,h,22);ctx.fill();
  ctx.strokeStyle='#3d6518';ctx.lineWidth=3;rr(x,y,w,h,22);ctx.stroke();
  const ds=dhikrSettings[i.wd];
  ctx.fillStyle='#385f12';rr(x+90,y-20,w-180,52,24);ctx.fill();
  ctx.fillStyle='#fff4cf';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='900 '+ds.titleSize+'px Vazirmatn';ctx.fillText('ذکر روز '+WD[i.wd],x+w/2,y+6);
  const [ar,tr]=DHIKR[i.wd];
  drawTextCenter(ar,x+w/2,y+92,w-55,ds.arabicSize,900,'#183318');
  drawTextCenter(tr,x+w/2,y+155,w-55,ds.translationSize,700,'#31570f');
}

function drawFooter(i){
  const y=1010;
  ctx.fillStyle='#385f12';rr(55,y,590,105,20);ctx.fill();
  ctx.fillStyle='#fff4cf';ctx.textAlign='right';ctx.textBaseline='middle';
  // فضای سمت راست فوتر برای QR رزرو شده است؛ نام گروه نباید روی QR بیفتد.
  const channelName=(chEl.value||'').replace('@','').trim();
  const channelSize=fit(channelName,445,22,800);
  ctx.font='800 '+channelSize+'px Vazirmatn';
  ctx.fillText(channelName,535,y+33);
  ctx.direction='ltr';ctx.textAlign='left';ctx.font='700 20px Arial';ctx.fillText(phEl.value||'',75,y+73);ctx.direction='rtl';
  const url=(chUrlEl.value||'').trim();if(showQREl.checked&&url)drawQRCanvas(getQRMatrix(url),555,y+10,82);
  ctx.fillStyle='#31570f';ctx.textAlign='center';ctx.font='700 16px Vazirmatn';ctx.fillText('امروز را زیبا بسازیم 🌿',350,y+92);
}

function drawDailyOccasion(i){
  background();
  // قاب کلی
  ctx.fillStyle='#f4f5f1';rr(25,20,1000,1135,24);ctx.fill();
  ctx.strokeStyle='#3d6518';ctx.lineWidth=3;rr(25,20,1000,1135,24);ctx.stroke();
  drawTop(i);drawPhoto();drawOccasionPanel(i);drawDates(i);drawDhikr(i);drawFooter(i);
}

registerTemplate({
  id:'dailyoccasion',
  label:'مناسبت روز — شبیه نمونه',
  short:'مناسبت روز',
  group:'مناسبتی',
  photoArea:{x:55,y:130,w:590,h:575},
  swatch:'linear-gradient(135deg,#f4f5f1 0 38%,#385f12 38% 72%,#f4df8a 72%)',
  style:{panel:'#385f12',frame:'#3d6518',inner:'#f7f1d9',goldText:'#f4df8a',darkText:'#183318',bg:'#edf2ef',panelR:22,outerR:24,photoR:4,softR:12,pillR:20,goldA:'#9b7822',goldB:'#f4df8a',shadow:.22},
  draw:drawDailyOccasion
});
})();
