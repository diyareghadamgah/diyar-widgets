/* قالب «سلطنتی نورانی ✨» */
(function(){
'use strict';
  function drawRoyalTemplate(i){
    const W=cv.width,H=cv.height,GA='#a56a08',GB='#f6dc85';
    const gold=(y0,y1)=>grad(GA,GB,y0,y1);
    const glass='rgba(255,255,255,0.07)';
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#04271f');bg.addColorStop(.5,'#0a4a3e');bg.addColorStop(1,'#04271f');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(W/2,0,20,W/2,0,700);
    glow.addColorStop(0,'rgba(246,220,133,.35)');glow.addColorStop(1,'rgba(246,220,133,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.07;ctx.strokeStyle=GB;ctx.lineWidth=1.5;
    for(let x=40;x<W;x+=110)for(let y=40;y<H;y+=110){
      ctx.beginPath();
      for(let k=0;k<16;k++){const a=k*Math.PI/8,r=k%2?15:30;ctx[k?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r);}
      ctx.closePath();ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle=gold(20,H-20);ctx.lineWidth=7;rr(20,20,W-40,H-40,34);ctx.stroke();
    ctx.strokeStyle='rgba(246,220,133,.6)';ctx.lineWidth=1.5;rr(34,34,W-68,H-68,26);ctx.stroke();
    const AX=60,AY=85,AW=380,AH=525;
    const arch=(x,y,w,h)=>{const r=w/2;ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y+r);ctx.arc(x+r,y+r,r,Math.PI,0);ctx.lineTo(x+w,y+h);ctx.closePath();};
    ctx.save();ctx.shadowColor='#000a';ctx.shadowBlur=26;ctx.shadowOffsetY=8;
    arch(AX-12,AY-12,AW+24,AH+24);ctx.fillStyle=gold(AY,AY+AH);ctx.fill();ctx.restore();
    arch(AX-4,AY-4,AW+8,AH+8);ctx.fillStyle='#04271f';ctx.fill();
    ctx.save();arch(AX,AY,AW,AH);ctx.clip();
    ctx.fillStyle='#fff8e7';ctx.fillRect(AX,AY,AW,AH);
    if(photo&&photo.complete&&photo.naturalWidth){
      const sc=Math.max(AW/photo.naturalWidth,AH/photo.naturalHeight)*photoZoom;
      const ww=photo.naturalWidth*sc,hh=photo.naturalHeight*sc;
      ctx.drawImage(photo,AX+(AW-ww)/2+photoX,AY+(AH-hh)/2+photoY,ww,hh);
    }else{drawCameraIcon(AX+AW/2,AY+AH/2-14,44);drawTextCenter('تصویر کنار تقویم',AX+AW/2,AY+AH/2+56,300,20,700,'#a89878');}
    ctx.restore();
    ctx.fillStyle='rgba(255,248,221,.95)';rr(75,630,350,50,25);ctx.fill();
    ctx.strokeStyle=gold(630,680);ctx.lineWidth=2;rr(75,630,350,50,25);ctx.stroke();
    const nt=(noteEl.value||'').trim();
    drawTextCenter(nt||'یادداشت…',250,655,310,16,600,nt?'#10201c':'#b3a374');
    drawLogoBadge(W/2+40,40,34,{ringOuter:'#d4a437',ringInner:'#8a6a10',bg:'#fffdf5',placeholderColor:'#8a7f52',placeholderFont:12});
    ctx.save();ctx.shadowColor='#0007';ctx.shadowBlur=14;ctx.shadowOffsetY=5;
    ctx.fillStyle=gold(100,190);rr(485,100,510,90,45);ctx.fill();ctx.restore();
    drawTextCenter(WD[i.wd],740,146,420,56,900,'#10201c');
    const rows=[[fa(i.s.d),FA_M[i.s.m-1],fa(i.s.y),'calendar'],[fa(i.h.d),AR_M[i.h.m-1],fa(i.h.y),'moon'],[fa(i.g.d),EN_M[i.g.m-1],String(i.g.y),'globe']];
    rows.forEach((r,k)=>{
      const y=212+k*116,h=102;
      ctx.fillStyle=glass;rr(485,y,510,h,51);ctx.fill();
      ctx.strokeStyle=gold(y,y+h);ctx.lineWidth=2.5;rr(485,y,510,h,51);ctx.stroke();
      const cx=485+510-52,cy=y+h/2;
      ctx.fillStyle=gold(y,y+h);ctx.beginPath();ctx.arc(cx,cy,34,0,Math.PI*2);ctx.fill();
      drawIconByKind(r[3],cx,cy,18,'#063d35','#e8c46a');
      drawTextCenter(r[0],cx-88,cy,90,46,900,GB);
      drawTextCenter(r[1],710,cy,210,34,900,'#fff8e1');
      drawTextCenter(r[2],567,cy,110,30,900,GB,/^\d+$/.test(r[2])?'Arial':'Vazirmatn');
    });
    const ch=(chEl.value||'').replace('@','');
    ctx.fillStyle=gold(566,612);rr(485,566,510,46,23);ctx.fill();
    drawTextCenter(ch,740,589,450,22,800,'#10201c');
    const ds=dhikrSettings[i.wd];
    ctx.fillStyle=glass;rr(45,730,W-90,250,30);ctx.fill();
    ctx.strokeStyle=gold(730,980);ctx.lineWidth=4;rr(45,730,W-90,250,30);ctx.stroke();
    ctx.strokeStyle='rgba(246,220,133,.4)';ctx.lineWidth=1.2;rr(56,741,W-112,228,24);ctx.stroke();
    ctx.save();ctx.shadowColor='#0007';ctx.shadowBlur=12;ctx.fillStyle=gold(702,758);rr(300,702,450,56,28);ctx.fill();ctx.restore();
    drawTextCenter('ذکر روز '+WD[i.wd],525,731,400,ds.titleSize,900,'#10201c');
    const [ar,tr]=DHIKR[i.wd];
    ctx.save();ctx.shadowColor='rgba(246,220,133,.55)';ctx.shadowBlur=18;
    drawTextCenter(ar,525,830,880,ds.arabicSize+6,900,GB);ctx.restore();
    const dg=ctx.createLinearGradient(260,0,790,0);
    dg.addColorStop(0,'rgba(246,220,133,0)');dg.addColorStop(.5,GB);dg.addColorStop(1,'rgba(246,220,133,0)');
    ctx.fillStyle=dg;ctx.fillRect(260,882,530,2.5);
    ctx.fillStyle=GB;ctx.beginPath();ctx.arc(525,883,5,0,Math.PI*2);ctx.fill();
    drawTextCenter(tr,525,930,880,ds.translationSize,700,'#fff8e1');
    const FY=1005,FH=140;
    ctx.save();rr(45,FY,W-90,FH,28);ctx.clip();
    const fg=ctx.createLinearGradient(0,FY,0,FY+FH);fg.addColorStop(0,'#0d594d');fg.addColorStop(1,'#04271f');
    ctx.fillStyle=fg;ctx.fillRect(45,FY,W-90,FH);
    drawMosqueSilhouette(45,FY+28,W-90,112,'rgba(246,220,133,.14)');
    ctx.restore();
    ctx.strokeStyle=gold(FY,FY+FH);ctx.lineWidth=4;rr(45,FY,W-90,FH,28);ctx.stroke();
    const url=(chUrlEl.value||'').trim();
    if(showQREl.checked&&url)drawQRCanvas(getQRMatrix(url),W/2-55,FY+15,110);
    ctx.textBaseline='middle';ctx.fillStyle=GB;ctx.textAlign='left';
    ctx.font='700 '+fit(phEl.value||'',300,24,700)+'px Arial';ctx.save();ctx.direction='ltr';ctx.fillText(phEl.value||'',85,FY+FH/2);ctx.restore();
    drawTextCenter(ch,W-250,FY+FH/2,320,24,800,GB);
  }

registerTemplate({
  id:'royal',
  label:'سلطنتی نورانی ✨',
  short:'سلطنتی',
  photoArea:{x:60,y:85,w:380,h:525},
  swatch:'linear-gradient(135deg,#04271f,#0d594d 50%,#d4a437)',
  style:{panel:'#063d35',frame:'#d4a437',inner:'#f7f1d9',goldText:'#f0c34f',darkText:'#10201c',bg:'#04271f',panelR:34,outerR:34,photoR:28,softR:18,pillR:24,goldA:'#a56a08',goldB:'#f6dc85',shadow:.3},
  draw:drawRoyalTemplate
});
})();
