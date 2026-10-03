/* موتور چیدمان قالب‌های رنگی
   یک چیدمان زیبا (عکس، روز هفته، سه تاریخ، ذکر، فوتر) که با «تم» رنگی و شکل عکس تغییر می‌کند.
   ساخت قالب جدید: فقط یک تم (رنگ‌ها + تابع paint برای زمینه) بنویسید و drawThemedCard را صدا بزنید. */
'use strict';

function themedGrad(c0,c1,y0,y1){
  const g=ctx.createLinearGradient(0,y0,0,y1);
  g.addColorStop(0,c0);g.addColorStop(.5,c1);g.addColorStop(1,c0);return g;
}
function shapePath(shape,x,y,w,h){
  ctx.beginPath();
  if(shape==='circle'){ctx.arc(x+w/2,y+h/2,Math.min(w,h)/2,0,Math.PI*2);}
  else if(shape==='arch'){const r=w/2;ctx.moveTo(x,y+h);ctx.lineTo(x,y+r);ctx.arc(x+r,y+r,r,Math.PI,0);ctx.lineTo(x+w,y+h);ctx.closePath();}
  else{rr(x,y,w,h,64);}
}
function drawStar8(cx,cy,r,rot){
  ctx.beginPath();
  for(let k=0;k<16;k++){const a=rot+k*Math.PI/8,q=k%2?r*.5:r;ctx[k?'lineTo':'moveTo'](cx+Math.cos(a)*q,cy+Math.sin(a)*q);}
  ctx.closePath();
}
function drawBlossom(cx,cy,r,col,center){
  ctx.save();ctx.translate(cx,cy);
  for(let k=0;k<5;k++){
    ctx.save();ctx.rotate(k*Math.PI*2/5);
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(0,-r*.58,r*.34,r*.58,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle=center;ctx.beginPath();ctx.arc(0,0,r*.2,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawThemedCard(i,T){
  const W=cv.width,H=cv.height;
  const acc=(y0,y1)=>themedGrad(T.acc[0],T.acc[1],y0,y1);
  const line=(y0,y1)=>themedGrad(T.line[0],T.line[1],y0,y1);
  T.paint(W,H,line);

  // ---- عکس
  const circle=T.shape==='circle';
  const B=circle?{x:60,y:120,w:380,h:380}:{x:60,y:85,w:380,h:525};
  ctx.save();ctx.shadowColor='#0008';ctx.shadowBlur=24;ctx.shadowOffsetY=8;
  shapePath(T.shape,B.x-12,B.y-12,B.w+24,B.h+24);ctx.fillStyle=line(B.y,B.y+B.h);ctx.fill();ctx.restore();
  shapePath(T.shape,B.x-4,B.y-4,B.w+8,B.h+8);ctx.fillStyle=T.ringInner;ctx.fill();
  ctx.save();shapePath(T.shape,B.x,B.y,B.w,B.h);ctx.clip();
  ctx.fillStyle='#fff8e7';ctx.fillRect(B.x,B.y,B.w,B.h);
  if(photo&&photo.complete&&photo.naturalWidth){
    const sc=Math.max(B.w/photo.naturalWidth,B.h/photo.naturalHeight)*photoZoom;
    const ww=photo.naturalWidth*sc,hh=photo.naturalHeight*sc;
    ctx.drawImage(photo,B.x+(B.w-ww)/2+photoX,B.y+(B.h-hh)/2+photoY,ww,hh);
  }else{
    drawCameraIcon(B.x+B.w/2,B.y+B.h/2-14,44);
    drawTextCenter('تصویر کنار تقویم',B.x+B.w/2,B.y+B.h/2+56,300,20,700,'#a89878');
  }
  ctx.restore();

  // ---- یادداشت
  const NY=circle?545:630;
  ctx.fillStyle=T.noteFill;rr(75,NY,350,50,25);ctx.fill();
  ctx.strokeStyle=line(NY,NY+50);ctx.lineWidth=2;rr(75,NY,350,50,25);ctx.stroke();
  const nt=(noteEl.value||'').trim();
  drawTextCenter(nt||'یادداشت…',250,NY+25,310,16,600,nt?T.noteText:'#9c9c9c');

  drawLogoBadge(W/2+40,40,46,{ringOuter:T.acc[0],ringInner:T.acc[1],bg:'#ffffff',placeholderColor:T.acc[0],placeholderFont:12});

  // ---- روز هفته
  ctx.save();ctx.shadowColor='#0007';ctx.shadowBlur=14;ctx.shadowOffsetY=5;
  ctx.fillStyle=acc(100,190);rr(485,100,510,90,45);ctx.fill();ctx.restore();
  drawTextCenter(WD[i.wd],740,146,420,56,900,T.pillText);

  // ---- تاریخ‌ها
  const rows=[[fa(i.s.d),FA_M[i.s.m-1],fa(i.s.y),'calendar'],[fa(i.h.d),AR_M[i.h.m-1],fa(i.h.y),'moon'],[fa(i.g.d),EN_M[i.g.m-1],String(i.g.y),'globe']];
  rows.forEach((r,k)=>{
    const y=212+k*116,h=102;
    ctx.fillStyle=T.card;rr(485,y,510,h,51);ctx.fill();
    ctx.strokeStyle=line(y,y+h);ctx.lineWidth=2.5;rr(485,y,510,h,51);ctx.stroke();
    const cx=485+510-52,cy=y+h/2;
    ctx.fillStyle=acc(y,y+h);ctx.beginPath();ctx.arc(cx,cy,34,0,Math.PI*2);ctx.fill();
    drawIconByKind(r[3],cx,cy,18,T.pillText,T.acc[1]);
    drawTextCenter(r[0],cx-88,cy,90,46,900,T.text);
    drawTextCenter(r[1],710,cy,210,34,900,T.text);
    drawTextCenter(r[2],567,cy,110,30,900,T.sub,/^\d+$/.test(r[2])?'Arial':'Vazirmatn');
  });

  // ---- نام کانال
  const ch=(chEl.value||'').replace('@','');
  ctx.fillStyle=acc(566,612);rr(485,566,510,46,23);ctx.fill();
  drawTextCenter(ch,740,589,450,22,800,T.pillText);

  // ---- ذکر روز
  const ds=dhikrSettings[i.wd];
  ctx.fillStyle=T.box;rr(45,730,W-90,250,30);ctx.fill();
  ctx.strokeStyle=line(730,980);ctx.lineWidth=4;rr(45,730,W-90,250,30);ctx.stroke();
  ctx.strokeStyle=T.innerLine;ctx.lineWidth=1.2;rr(56,741,W-112,228,24);ctx.stroke();
  ctx.save();ctx.shadowColor='#0007';ctx.shadowBlur=12;ctx.fillStyle=acc(702,758);rr(300,702,450,56,28);ctx.fill();ctx.restore();
  drawTextCenter('ذکر روز '+WD[i.wd],525,731,400,ds.titleSize,900,T.pillText);
  const [ar,tr]=DHIKR[i.wd];
  ctx.save();if(T.glow){ctx.shadowColor=T.glow;ctx.shadowBlur=18;}
  drawTextCenter(ar,525,830,880,ds.arabicSize+6,900,T.arabic);ctx.restore();
  const dg=ctx.createLinearGradient(260,0,790,0);
  dg.addColorStop(0,'rgba(128,128,128,0)');dg.addColorStop(.5,T.line[1]);dg.addColorStop(1,'rgba(128,128,128,0)');
  ctx.fillStyle=dg;ctx.fillRect(260,882,530,2.5);
  ctx.fillStyle=T.line[1];ctx.beginPath();ctx.arc(525,883,5,0,Math.PI*2);ctx.fill();
  drawTextCenter(tr,525,930,880,ds.translationSize,700,T.trans);

  // ---- فوتر
  const FY=1005,FH=140,FC=FY+FH/2;
  ctx.save();rr(45,FY,W-90,FH,28);ctx.clip();
  const fg=ctx.createLinearGradient(0,FY,0,FY+FH);fg.addColorStop(0,T.foot[0]);fg.addColorStop(1,T.foot[1]);
  ctx.fillStyle=fg;ctx.fillRect(45,FY,W-90,FH);
  drawMosqueSilhouette(45,FY+28,W-90,112,T.sil);
  ctx.restore();
  ctx.strokeStyle=line(FY,FY+FH);ctx.lineWidth=4;rr(45,FY,W-90,FH,28);ctx.stroke();
  const url=(chUrlEl.value||'').trim();
  if(showQREl.checked&&url)drawQRCanvas(getQRMatrix(url),W/2-55,FY+15,110);
  drawRoundIcon('phone',92,FC,24,T.acc[1],T.pillText);
  drawRoundIcon('plane',W-92,FC,24,T.acc[1],T.pillText);
  ctx.save();ctx.textBaseline='middle';ctx.fillStyle=T.footText;ctx.textAlign='left';ctx.direction='ltr';
  ctx.font='700 '+fit(phEl.value||'',300,24,700,'Arial')+'px Arial';ctx.fillText(phEl.value||'',130,FC);
  ctx.restore();
  drawTextCenter(ch,W-245,FC,300,24,800,T.footText);
}

function drawCrescent(cx,cy,r,fill,alpha){
  const c=document.createElement('canvas');c.width=c.height=Math.ceil(r*2);
  const g=c.getContext('2d');
  g.fillStyle=fill;g.beginPath();g.arc(r,r,r,0,Math.PI*2);g.fill();
  g.globalCompositeOperation='destination-out';
  g.beginPath();g.arc(r*1.45,r*.78,r*.86,0,Math.PI*2);g.fill();
  ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.drawImage(c,cx-r,cy-r);ctx.restore();
}

/* ===== ساخت سریع قالب‌های مناسبتی =====
   فقط رنگ‌ها و «صحنه» (scene) را بدهید؛ چیدمان از drawThemedCard می‌آید.
   scene: { bg:[رنگ‌ها], glow, glowAt, star8, dots, petals:[], confetti:[], moon:{x,y,r,color,alpha},
            blossoms:{col,center}, frameStops:[], inner } */
function occasionPaint(c){
  return function(W,H,line){
    const g=ctx.createLinearGradient(0,0,0,H);
    c.bg.forEach((col,k)=>g.addColorStop(k/(c.bg.length-1),col));
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    if(c.glow){
      const at=c.glowAt||[.8,.12],gx=W*at[0],gy=H*at[1];
      const r=ctx.createRadialGradient(gx,gy,10,gx,gy,560);
      r.addColorStop(0,c.glow);r.addColorStop(1,c.glow.replace(/[\d.]+\)$/,'0)'));
      ctx.fillStyle=r;ctx.fillRect(0,0,W,H);
    }
    if(c.star8){
      ctx.save();ctx.globalAlpha=c.star8Alpha||.07;ctx.strokeStyle=c.star8;ctx.lineWidth=1.5;
      for(let x=55;x<W;x+=110)for(let y=55;y<H;y+=110){drawStar8(x,y,30,0);ctx.stroke();}
      ctx.restore();
    }
    if(c.moon)drawCrescent(c.moon.x,c.moon.y,c.moon.r,c.moon.color,c.moon.alpha);
    let s=c.seed||5;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
    if(c.dots){
      ctx.fillStyle=c.dots;
      for(let k=0;k<110;k++){ctx.globalAlpha=.2+rnd()*.55;ctx.beginPath();ctx.arc(rnd()*W,rnd()*H,rnd()*1.7+.4,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
    }
    if(c.petals){
      for(let k=0;k<26;k++){
        ctx.save();ctx.globalAlpha=.25+rnd()*.3;ctx.translate(rnd()*W,rnd()*H);ctx.rotate(rnd()*6);
        ctx.fillStyle=c.petals[k%c.petals.length];ctx.beginPath();ctx.ellipse(0,0,9+rnd()*8,4+rnd()*3,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
    if(c.confetti){
      for(let k=0;k<70;k++){
        ctx.save();ctx.globalAlpha=.35+rnd()*.4;ctx.translate(rnd()*W,rnd()*H);ctx.rotate(rnd()*6);
        ctx.fillStyle=c.confetti[k%c.confetti.length];
        if(k%3===0){drawStar8(0,0,6+rnd()*6,0);ctx.fill();}else{ctx.fillRect(-4,-1.5,8+rnd()*6,3);}
        ctx.restore();
      }
    }
    if(c.blossoms){
      [[40,40,52],[W-40,40,46],[40,H-40,46],[W-40,H-40,52]].forEach(([x,y,r])=>{
        ctx.save();ctx.globalAlpha=.75;
        drawBlossom(x,y,r,c.blossoms.col,c.blossoms.center);
        drawBlossom(x+(x<W/2?44:-44),y+(y<H/2?30:-30),r*.6,c.blossoms.col,c.blossoms.center);
        ctx.restore();
      });
    }
    let stroke=line(20,H-20);
    if(c.frameStops){const fg=ctx.createLinearGradient(0,20,0,H-20);c.frameStops.forEach((col,k)=>fg.addColorStop(k/(c.frameStops.length-1),col));stroke=fg;}
    ctx.strokeStyle=stroke;ctx.lineWidth=6;rr(20,20,W-40,H-40,34);ctx.stroke();
    ctx.strokeStyle=c.inner||'rgba(255,255,255,.4)';ctx.lineWidth=1.5;rr(34,34,W-68,H-68,26);ctx.stroke();
  };
}
function darkTheme(o){
  return Object.assign({card:'rgba(255,255,255,.08)',box:'rgba(255,255,255,.07)',innerLine:'rgba(255,255,255,.3)',
    text:'#f6f6f6',arabic:'#ffffff',trans:'#e8e8e8',sil:'rgba(255,255,255,.12)',footText:'#ffffff',
    noteFill:'rgba(255,255,255,.93)',noteText:'#1b1b1b',glow:'rgba(255,255,255,.35)',ringInner:o.scene.bg[0],
    bgBase:o.scene.bg[0],paint:occasionPaint(o.scene)},o);
}
function lightTheme(o){
  return Object.assign({card:'rgba(255,255,255,.88)',box:'rgba(255,255,255,.92)',innerLine:'rgba(0,0,0,.18)',
    arabic:o.text,trans:o.sub,sil:'rgba(255,255,255,.16)',footText:'#ffffff',
    noteFill:'rgba(255,255,255,.95)',noteText:o.text,glow:null,ringInner:'#ffffff',
    bgBase:o.scene.bg[0],paint:occasionPaint(o.scene)},o);
}
function registerThemed(o){
  const T=o.theme,circle=T.shape==='circle';
  registerTemplate({
    id:o.id,label:o.label,short:o.short||o.label,group:o.group||'مناسبتی',
    swatch:o.swatch||'linear-gradient(135deg,'+T.bgBase+','+T.acc[0]+' 55%,'+T.acc[1]+')',
    photoArea:circle?{x:60,y:120,w:380,h:380}:{x:60,y:85,w:380,h:525},
    style:{panel:T.foot[1],frame:T.line[0],inner:T.line[1],goldText:T.acc[1],darkText:T.pillText,bg:T.bgBase,panelR:34,outerR:34,photoR:28,softR:18,pillR:24,goldA:T.acc[0],goldB:T.acc[1],shadow:.25},
    draw:function(i){drawThemedCard(i,T);}
  });
}
