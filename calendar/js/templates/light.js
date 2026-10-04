/* قالب «مدرن روشن» */
(function(){
'use strict';
  function drawLightTemplate(i){
    const green='#0d594d', greenDark='#063d35', cream='#fffdf8';
    const bg=ctx.createLinearGradient(0,0,0,cv.height);
    bg.addColorStop(0,'#faf6ec');bg.addColorStop(1,'#eee6d3');
    ctx.fillStyle=bg;ctx.fillRect(0,0,cv.width,cv.height);
    ctx.strokeStyle='#d6c48e';ctx.lineWidth=3;rr(18,18,1014,1144,26);ctx.stroke();
    ctx.strokeStyle=green;ctx.lineWidth=1.2;rr(26,26,998,1128,22);ctx.stroke();

    const PX=45,PY=50,PW=390,PH=460;
    ctx.save();ctx.shadowColor='#0002';ctx.shadowBlur=14;ctx.shadowOffsetY=5;
    ctx.fillStyle=cream;rr(PX,PY,PW,PH,20);ctx.fill();ctx.restore();

    ctx.save();rr(PX+6,PY+6,PW-12,PH-12,14);ctx.clip();
    if(photo&&photo.complete&&photo.naturalWidth){
      const base=Math.max((PW-12)/photo.naturalWidth,(PH-12)/photo.naturalHeight);
      const sc=base*photoZoom;
      const ww=photo.naturalWidth*sc,hh=photo.naturalHeight*sc;
      ctx.drawImage(photo,PX+6+(PW-12-ww)/2+photoX,PY+6+(PH-12-hh)/2+photoY,ww,hh);
    }else{
      ctx.fillStyle='#efe7d6';ctx.fillRect(PX+6,PY+6,PW-12,PH-12);
      ctx.fillStyle='#8a7f65';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='700 20px Vazirmatn';ctx.fillText('تصویر کنار تقویم',PX+PW/2,PY+PH/2);
    }
    ctx.restore();
    ctx.strokeStyle='#c9b896';ctx.lineWidth=2;rr(PX,PY,PW,PH,20);ctx.stroke();

    const noteTxt=(noteEl.value||'').trim();
    if(noteTxt){
      ctx.fillStyle='rgba(255,253,248,.92)';
      rr(PX+40,PY+PH-50,PW-80,40,20);ctx.fill();
      ctx.fillStyle='#10201c';ctx.textAlign='center';ctx.textBaseline='middle';
      const nz=fit(noteTxt,PW-100,15,600);
      ctx.font='600 '+nz+'px Vazirmatn';ctx.fillText(noteTxt,PX+PW/2,PY+PH-30);
    }

    const ch=(chEl.value||'').replace('@','');
    const CPW=310,CPX=(PX+PW/2)-CPW/2,CPY=PY+PH+55,CPH=52;
    ctx.fillStyle=green;rr(CPX,CPY,CPW,CPH,CPH/2);ctx.fill();
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    const cz=fit(ch,CPW-30,20,700);ctx.font='700 '+cz+'px Vazirmatn';
    ctx.fillText(ch,CPX+CPW/2,CPY+CPH/2);

    const DP={x:490,y:95,w:515,h:80};
    ctx.fillStyle=green;rr(DP.x,DP.y,DP.w,DP.h,DP.h/2);ctx.fill();
    ctx.fillStyle='#fff';const dz=fit(WD[i.wd],DP.w-60,54,900);
    ctx.font='900 '+dz+'px Vazirmatn';ctx.fillText(WD[i.wd],DP.x+DP.w/2,DP.y+DP.h/2);

    const rows=[
      [fa(i.s.d),FA_M[i.s.m-1],fa(i.s.y),'calendar'],
      [fa(i.h.d),AR_M[i.h.m-1],fa(i.h.y),'moon'],
      [fa(i.g.d),EN_M[i.g.m-1],String(i.g.y),'globe']
    ];
    const RX=490,RW=515,RH=95,RY0=195,RGAP=25;

    rows.forEach((r,k)=>{
      const y=RY0+k*(RH+RGAP);
      ctx.fillStyle=cream;rr(RX,y,RW,RH,RH/2);ctx.fill();
      ctx.strokeStyle=green;ctx.lineWidth=2.5;rr(RX,y,RW,RH,RH/2);ctx.stroke();
      const ICX=RX+RW-48,ICY=y+RH/2,ICR=28;
      ctx.fillStyle=green;ctx.beginPath();ctx.arc(ICX,ICY,ICR,0,Math.PI*2);ctx.fill();
      drawIconByKind(r[3],ICX,ICY,16,'#ffffff',green);
      ctx.fillStyle='#10201c';ctx.textAlign='right';
      const dz2=fit(r[0],60,42,900);ctx.font='900 '+dz2+'px Vazirmatn';
      ctx.fillText(r[0],ICX-ICR-15,ICY);
      ctx.textAlign='center';const mz=fit(r[1],240,32,900);
      ctx.font='900 '+mz+'px Vazirmatn';ctx.fillText(r[1],RX+RW/2-20,ICY);
      ctx.textAlign='left';ctx.fillStyle=greenDark;
      const isNum=/^\d+$/.test(r[2]);
      ctx.font='900 28px '+(isNum?'Arial':'Vazirmatn');
      ctx.fillText(r[2],RX+70,ICY);
    });

    drawEventPanel(i,{x:490,y:590,w:515,h:50,radius:20,stroke:green,fill:cream,titleFill:green,titleColor:'#fff',textColor:'#10201c',fontSize:13});

    const ds=dhikrSettings[i.wd];
    const TITLE='ذکر روز '+WD[i.wd];
    const tpw=380,tpx=(cv.width-tpw)/2,tpy=650,tph=54;
    ctx.fillStyle=green;rr(tpx,tpy,tpw,tph,tph/2);ctx.fill();
    ctx.fillStyle='#fff';const tz=fit(TITLE,tpw-40,ds.titleSize-4,900);
    ctx.font='900 '+tz+'px Vazirmatn';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(TITLE,cv.width/2,tpy+tph/2);

    ctx.fillStyle=cream;rr(50,720,950,255,26);ctx.fill();
    ctx.strokeStyle='#d6c48e';ctx.lineWidth=2;rr(50,720,950,255,26);ctx.stroke();
    ctx.strokeStyle=green;ctx.lineWidth=1;rr(60,730,930,235,20);ctx.stroke();

    const [ar,tr]=DHIKR[i.wd];
    ctx.fillStyle='#10201c';const az=fit(ar,830,ds.arabicSize+4);
    ctx.font='900 '+az+'px Vazirmatn';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(ar,cv.width/2,805);
    ctx.fillStyle='#3a4a44';const trz=fit(tr,830,ds.translationSize,700);
    ctx.font='700 '+trz+'px Vazirmatn';ctx.fillText(tr,cv.width/2,910);

    const FY=1010,FH=140;
    ctx.save();rr(40,FY,970,FH,26);ctx.clip();
    const fg=ctx.createLinearGradient(0,FY,0,FY+FH);
    fg.addColorStop(0,'#0d594d');fg.addColorStop(1,'#063d35');
    ctx.fillStyle=fg;ctx.fillRect(40,FY,970,FH);
    drawMosqueSilhouette(40,FY+30,970,110,'rgba(0,0,0,0.20)');
    ctx.restore();
    ctx.strokeStyle='#d6c48e';ctx.lineWidth=2;rr(40,FY,970,FH,26);ctx.stroke();

    const url=(chUrlEl.value||'').trim();
    if(showQREl.checked&&url)drawQRCanvas(getQRMatrix(url),465,FY+20,105);

    ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='middle';
    const pz=fit(phEl.value||'',300,20,700);ctx.font='700 '+pz+'px Arial';
    ctx.save();ctx.direction='ltr';ctx.fillText(phEl.value||'',125,FY+FH/2);ctx.restore();drawRoundIcon('phone',90,FY+FH/2,24,'#fff',green);
    ctx.textAlign='right';const chz=fit(ch,245,18,700);
    ctx.font='700 '+chz+'px Vazirmatn';ctx.fillText(ch,895,FY+FH/2);drawRoundIcon('plane',958,FY+FH/2,24,'#fff',green);

    drawSprig(1030,30,175,0.5,'#a8bfb1');
    drawLogoBadge(960, 50, 34, {ringOuter:'#0d594d', ringInner:'#063d35', bg:'#ffffff', placeholderColor:'#0d594d', placeholderFont:14});
  }

registerTemplate({
  id:'light',
  label:'مدرن روشن',
  short:'مدرن روشن',
  photoArea:{x:51,y:56,w:378,h:448},
  swatch:'linear-gradient(90deg,#f7f1d9 0 42%,#0d594d 42% 58%,#f7f1d9 58%)',
  style:{panel:'#fbf8ef',frame:'#cbbd8c',inner:'#0d594d',goldText:'#0d594d',darkText:'#10201c',bg:'#edf2ef',panelR:34,outerR:38,photoR:28,softR:18,pillR:24,goldA:'#0d594d',goldB:'#063d35',shadow:0.18},
  draw:drawLightTemplate
});
})();
