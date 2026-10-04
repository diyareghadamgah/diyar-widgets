/* ابزارهای مشترک نقاشی که چند قالب از آن‌ها استفاده می‌کنند */
'use strict';

function drawTextCenter(text,x,y,maxW,size,weight,fill,font='Vazirmatn'){
  const fs=fit(text,maxW,size,weight);
  ctx.fillStyle=fill;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(weight||700)+' '+fs+'px '+font;
  ctx.fillText(text,x,y);
}

function drawIconCalendar(cx,cy,s,color){
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;
  ctx.lineWidth=Math.max(1.4,s*.14);ctx.lineCap='round';ctx.lineJoin='round';
  rr(cx-s*.78,cy-s*.62,s*1.56,s*1.28,s*.18);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-s*.78,cy-s*.22);ctx.lineTo(cx+s*.78,cy-s*.22);ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx-s*.42,cy-s*.82);ctx.lineTo(cx-s*.42,cy-s*.48);
  ctx.moveTo(cx+s*.42,cy-s*.82);ctx.lineTo(cx+s*.42,cy-s*.48);
  ctx.stroke();
  const dotR=s*.075;
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){
    const dx=cx-s*.42+col*s*.42,dy=cy+s*.02+row*s*.36;
    ctx.beginPath();ctx.arc(dx,dy,dotR,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function drawIconMoon(cx,cy,s,color,bgColor){
  ctx.save();ctx.fillStyle=color;
  ctx.beginPath();ctx.arc(cx,cy,s*.72,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=bgColor;
  ctx.beginPath();ctx.arc(cx+s*.42,cy-s*.14,s*.70,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawIconGlobe(cx,cy,s,color){
  ctx.save();ctx.strokeStyle=color;
  ctx.lineWidth=Math.max(1.4,s*.12);ctx.lineCap='round';
  ctx.beginPath();ctx.arc(cx,cy,s*.72,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(cx,cy,s*.36,s*.72,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-s*.72,cy);ctx.lineTo(cx+s*.72,cy);ctx.stroke();
  ctx.beginPath();ctx.ellipse(cx,cy-s*.36,s*.66,s*.22,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(cx,cy+s*.36,s*.66,s*.22,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

function drawIconByKind(kind,cx,cy,s,color,bgColor){
  if(kind==='calendar')drawIconCalendar(cx,cy,s,color);
  else if(kind==='moon')drawIconMoon(cx,cy,s,color,bgColor);
  else drawIconGlobe(cx,cy,s,color);
}

function drawSprig(x,y,angleDeg,scale,leafColor){
  ctx.save();ctx.translate(x,y);ctx.rotate(angleDeg*Math.PI/180);ctx.scale(scale,scale);
  const stemColor='#8fa394';const leaf=leafColor||'#b7cbbd';
  ctx.strokeStyle=stemColor;ctx.lineWidth=2;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(45,-22,95,-32);ctx.stroke();
  const leaves=[
    {x:22,y:-12,side:1,sz:1.00},{x:40,y:-19,side:-1,sz:.95},
    {x:58,y:-24,side:1,sz:.88},{x:76,y:-28,side:-1,sz:.78},{x:92,y:-31,side:1,sz:.68}
  ];
  leaves.forEach(L=>{
    ctx.save();ctx.translate(L.x,L.y);ctx.rotate(L.side*Math.PI/3-.2);
    ctx.fillStyle=leaf;ctx.beginPath();ctx.ellipse(0,0,15*L.sz,5.5*L.sz,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#7a8e80';ctx.lineWidth=.8;ctx.stroke();ctx.restore();
  });
  ctx.restore();
}

function drawCameraIcon(cx,cy,s){
  ctx.save();ctx.strokeStyle='#b6a888';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';
  rr(cx-s,cy-s*.62,s*2,s*1.24,s*.2);ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx-s*.42,cy-s*.62);ctx.lineTo(cx-s*.28,cy-s*.96);
  ctx.lineTo(cx+s*.28,cy-s*.96);ctx.lineTo(cx+s*.42,cy-s*.62);ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy+s*.02,s*.4,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy+s*.02,s*.16,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

function drawMosqueSilhouette(x,y,w,h,color){
  ctx.save();ctx.fillStyle=color;const cy=y+h;
  ctx.fillRect(x,cy-5,w,5);
  const cx=x+w/2,dr=w*.075;
  ctx.beginPath();ctx.arc(cx,cy-dr,dr,Math.PI,0);ctx.lineTo(cx+dr,cy);ctx.lineTo(cx-dr,cy);ctx.closePath();ctx.fill();
  ctx.fillRect(cx-2,cy-dr-dr-12,4,14);
  ctx.beginPath();ctx.arc(cx,cy-dr-dr-12,4,Math.PI,0);ctx.fill();
  [0.34,0.66].forEach(f=>{const mx=x+w*f;const r=w*.038;
    ctx.beginPath();ctx.arc(mx,cy-r,r,Math.PI,0);ctx.lineTo(mx+r,cy);ctx.lineTo(mx-r,cy);ctx.closePath();ctx.fill();
    ctx.fillRect(mx-1,cy-r-r-6,2,8);
  });
  [0.13,0.87].forEach(f=>{const mx=x+w*f;
    ctx.fillRect(mx-4,cy-h*.78,8,h*.78);
    ctx.beginPath();ctx.arc(mx,cy-h*.78,6,Math.PI,0);ctx.fill();
    ctx.fillRect(mx-1,cy-h*.78-12,2,14);
    ctx.fillRect(mx-6,cy-h*.55,12,3);
  });
  [0.24,0.42,0.58,0.76].forEach(f=>{const mx=x+w*f;
    ctx.fillRect(mx-2,cy-h*.42,4,h*.42);
    ctx.beginPath();ctx.arc(mx,cy-h*.42,3,Math.PI,0);ctx.fill();
  });
  ctx.restore();
}

function drawLogoBadge(cx, cy, r, opts){
  opts = opts || {};
  const ringOuter = opts.ringOuter || '#c9a44a';
  const ringInner = opts.ringInner || '#8a6a10';
  const bg = opts.bg || '#fffef8';
  const placeholderColor = opts.placeholderColor || '#8a7f65';
  const placeholderFont = opts.placeholderFont || 14;

  ctx.save();
  ctx.shadowColor = '#0003';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#fffdf5';
  ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.strokeStyle = ringOuter;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = ringInner;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  if (logo && logo.complete && logo.naturalWidth){
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.clip();
    const sc = Math.max((r * 2 - 6) / logo.naturalWidth, (r * 2 - 6) / logo.naturalHeight);
    const ww = logo.naturalWidth * sc, hh = logo.naturalHeight * sc;
    ctx.drawImage(logo, cx - ww / 2, cy - hh / 2, ww, hh);
    ctx.restore();
  } else {
    ctx.fillStyle = placeholderColor;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + placeholderFont + 'px Vazirmatn';
    ctx.fillText('LOGO', cx, cy);
  }
}

function drawRoundIcon(kind,cx,cy,r,bg,fg){
  ctx.save();ctx.fillStyle=bg;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
  const k=r/23;ctx.translate(cx,cy);
  if(kind==='phone'){
    ctx.rotate(-Math.PI/4);ctx.scale(k,k);
    ctx.strokeStyle=fg;ctx.fillStyle=fg;ctx.lineWidth=4;ctx.lineCap='round';
    ctx.beginPath();ctx.arc(0,-2,9,Math.PI*.2,Math.PI*.8);ctx.stroke();
    [[7.3,3.3],[-7.3,3.3]].forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],3.6,0,Math.PI*2);ctx.fill();});
  }else{
    ctx.scale(k,k);ctx.fillStyle=fg;ctx.beginPath();
    ctx.moveTo(-10,1);ctx.lineTo(11,-8);ctx.lineTo(4,10);ctx.lineTo(0,3);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}

function drawNoteArea(x,y,w,h){
  ctx.fillStyle='#fff8dd';rr(x,y,w,h,h/2);ctx.fill();
  ctx.strokeStyle=S.frame;ctx.lineWidth=1.4;rr(x,y,w,h,h/2);ctx.stroke();
  ctx.save();ctx.globalAlpha=.35;ctx.strokeStyle='#e8d9a8';ctx.lineWidth=1;
  rr(x+4,y+4,w-8,h-8,(h-8)/2);ctx.stroke();ctx.restore();
  const text=(noteEl.value||'').trim();
  if(!text){
    ctx.fillStyle='#b3a374';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='500 13px Vazirmatn';ctx.fillText('یادداشت…',x+w/2,y+h/2);return;
  }
  const padX=14,fs=14,lh=18;
  const font='600 '+fs+'px Vazirmatn';
  const lines=wrapText(text,w-padX*2,font);
  ctx.fillStyle=S.darkText;ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';
  const shown=lines.slice(0,2);const totalH=shown.length*lh;const startY=y+h/2-totalH/2+lh/2;
  shown.forEach((line,i)=>{
    const safeFs=fit(line,w-padX*2,10,600);
    ctx.font='600 '+safeFs+'px Vazirmatn';
    ctx.fillText(line,x+w/2,startY+i*lh);
  });
}

/* کادر یکسان مناسبت روز برای قالب‌های مختلف */
function drawEventPanel(i, cfg){
  cfg = cfg || {};
  const x=cfg.x||485, y=cfg.y||620, w=cfg.w||510, h=cfg.h||70;
  const radius=cfg.radius==null?18:cfg.radius;
  const stroke=cfg.stroke||S.frame||'#3d6518';
  const fill=cfg.fill||'rgba(255,255,255,.94)';
  const titleFill=cfg.titleFill||stroke;
  const titleColor=cfg.titleColor||'#fff';
  const textColor=cfg.textColor||S.darkText||'#183318';
  const events=typeof getEvents==='function'?getEvents(i):[];
  ctx.save();
  ctx.fillStyle=fill;rr(x,y,w,h,radius);ctx.fill();
  ctx.strokeStyle=stroke;ctx.lineWidth=2.5;rr(x,y,w,h,radius);ctx.stroke();
  const titleW=Math.min(150,w*.30), titleH=Math.min(34,h-12), titleX=x+w-titleW-10, titleY=y+6;
  ctx.fillStyle=titleFill;rr(titleX,titleY,titleW,titleH,titleH/2);ctx.fill();
  ctx.fillStyle=titleColor;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='800 '+fit('مناسبت روز',titleW-16,15,800)+'px Vazirmatn';
  ctx.fillText('مناسبت روز',titleX+titleW/2,titleY+titleH/2+1);
  if(events.length){
    const bodyX=x+12, bodyW=w-titleW-30, fs=cfg.fontSize||16;
    const titles=events.slice(0,3).map(e=>(e.holiday?'تعطیل رسمی: ':'')+e.title);
    let yy=y+h/2+2;
    ctx.fillStyle=textColor;ctx.textAlign='right';ctx.textBaseline='middle';
    titles.forEach((txt,idx)=>{
      const lines=wrapText(txt,bodyW-12,'700 '+fs+'px Vazirmatn').slice(0,2);
      const useFs=fit(lines.join(' • '),bodyW-8,fs,700);
      ctx.font='700 '+useFs+'px Vazirmatn';
      ctx.fillText(lines.join(' • '),x+w- titleW-18,yy);
      yy += Math.max(18,useFs+3);
    });
  }
  ctx.restore();
}
