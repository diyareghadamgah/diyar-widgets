/* قالب «مشکی و طلایی» */
(function(){
'use strict';
  function drawPhotoBox(area,noteArea,radius,borderColor){
    const {x,y,w,h}=area;
    ctx.save();rr(x,y,w,h,radius);ctx.clip();
    ctx.fillStyle='#fff8e7';ctx.fillRect(x,y,w,h);
    if(photo&&photo.complete&&photo.naturalWidth){
      const base=Math.max(w/photo.naturalWidth,h/photo.naturalHeight);const sc=base*photoZoom;
      const ww=photo.naturalWidth*sc,hh=photo.naturalHeight*sc;
      ctx.drawImage(photo,x+(w-ww)/2+photoX,y+(h-hh)/2+photoY,ww,hh);
    }else{
      ctx.fillStyle='#263b36';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='700 22px Vazirmatn';ctx.fillText('تصویر کنار تقویم',x+w/2,y+h/2);
    }
    ctx.restore();
    ctx.strokeStyle=borderColor||TS().frame;ctx.lineWidth=3;rr(x,y,w,h,radius);ctx.stroke();
    if(noteArea)drawNoteArea(noteArea.x,noteArea.y,noteArea.w,noteArea.h);
  }

  function drawInfoPill(x,y,w,h,day,month,year,icon,colors){
    const c=colors||TS();
    ctx.fillStyle=c.panel;rr(x,y,w,h,Math.min(26,h/2));ctx.fill();
    ctx.strokeStyle=c.frame;ctx.lineWidth=2;rr(x,y,w,h,Math.min(26,h/2));ctx.stroke();
    const cy=y+h/2;
    ctx.fillStyle=c.goldText;ctx.beginPath();ctx.arc(x+w-38,cy,25,0,Math.PI*2);ctx.fill();
    drawIconByKind({'▦':'calendar','☾':'moon','◎':'globe'}[icon]||'globe',x+w-38,cy,14,c.darkText,c.goldText);
    drawTextCenter(day,x+w-96,cy,70,36,900,c.goldText);
    drawTextCenter(month,x+w/2,cy,190,28,900,c.goldText);
    if(year)drawTextCenter(year,x+78,cy,85,28,900,c.goldText,'Arial');
  }

  function drawBlackGold(i){
    const t=TS();
    ctx.fillStyle=t.bg;ctx.fillRect(0,0,cv.width,cv.height);
    panel(30,30,955,1125,24);
    ctx.strokeStyle='#777';ctx.lineWidth=3;
    [145,870].forEach(px=>{ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,30);ctx.stroke();ctx.fillStyle='#333';ctx.fillRect(px-12,28,24,18);});
    drawPhotoBox({x:65,y:85,w:390,h:520},{x:100,y:620,w:320,h:58},22,t.frame);
    ctx.fillStyle=t.goldB;rr(500,85,430,90,35);ctx.fill();
    drawTextCenter(WD[i.wd],715,130,360,52,900,t.darkText);
    drawInfoPill(500,205,430,105,fa(i.s.d),FA_M[i.s.m-1],fa(i.s.y),'▦',t);
    drawInfoPill(500,320,430,105,fa(i.h.d),AR_M[i.h.m-1],fa(i.h.y),'☾',t);
    drawInfoPill(500,435,430,105,fa(i.g.d),EN_M[i.g.m-1],String(i.g.y),'◎',t);
    ctx.fillStyle=t.panel;rr(55,700,905,250,18);ctx.fill();
    ctx.strokeStyle=t.frame;ctx.lineWidth=4;rr(55,700,905,250,18);ctx.stroke();
    ctx.fillStyle=t.goldB;rr(310,680,395,58,29);ctx.fill();
    drawTextCenter('ذکر روز '+WD[i.wd],507,709,350,dhikrSettings[i.wd].titleSize,900,t.darkText);
    const [ar,tr]=DHIKR[i.wd];
    drawTextCenter(ar,507,805,760,dhikrSettings[i.wd].arabicSize,900,t.goldText);
    drawTextCenter(tr,507,880,760,dhikrSettings[i.wd].translationSize,700,t.goldText);
    ctx.fillStyle=t.panel;rr(55,980,905,130,18);ctx.fill();
    ctx.strokeStyle=t.frame;ctx.lineWidth=4;rr(55,980,905,130,18);ctx.stroke();
    ctx.fillStyle=t.goldText;ctx.textAlign='left';
    ctx.font='700 '+fit(phEl.value||'',300,22,700,'Arial')+'px Arial';ctx.save();ctx.direction='ltr';ctx.fillText(phEl.value||'',135,1045);ctx.restore();drawRoundIcon('phone',98,1045,24,t.goldText,t.panel);
    const url=(chUrlEl.value||'').trim(), hasQR=showQREl.checked&&!!url;
    if(hasQR)drawQRCanvas(getQRMatrix(url),450,990,105);
    drawRoundIcon('plane',640,1045,24,t.goldText,t.panel);drawTextCenter((chEl.value||'').replace('@',''),795,1045,230,20,700,t.goldText);

    drawLogoBadge(915, 62, 30, {ringOuter:'#d9a52f', ringInner:'#8f5a08', bg:'#1a1a1a', placeholderColor:'#d9a52f', placeholderFont:10});
  }

registerTemplate({
  id:'blackgold',
  label:'مشکی و طلایی',
  short:'مشکی و طلایی',
  photoArea:{x:65,y:85,w:390,h:520},
  swatch:'linear-gradient(90deg,#151515 0 42%,#d4a437 42% 58%,#151515 58%)',
  style:{panel:'#171717',frame:'#d9a52f',inner:'#f1cf67',goldText:'#f4c64f',darkText:'#161616',bg:'#e9ece9',panelR:18,outerR:24,photoR:18,softR:12,pillR:10,goldA:'#8f5a08',goldB:'#f4c64f',shadow:0.30},
  draw:drawBlackGold
});
})();
