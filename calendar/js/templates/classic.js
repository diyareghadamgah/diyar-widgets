/* قالب «کلاسیک سبز و طلایی» */
(function(){
'use strict';
  const ROW_Y=[285,405,525];
  const RIBBON={cx:512,w:168};
  const RIBBON_RIGHT=RIBBON.cx+RIBBON.w/2;
  const RIBBON_Y=55,RIBBON_H=585;
  const PHOTO_BOX={x:55,y:55,w:375,h:650};
  const NOTE_AREA={x:88,y:610,w:309,h:60};

  function unifiedFrame(){panel(35,35,960,1125,TS().outerR);}

  function photoPanel(){
    const {x,y,w,h}=PHOTO_BOX;
    ctx.save();ctx.strokeStyle='#555';ctx.lineWidth=3;
    [x+78,x+w-78].forEach(px=>{
      ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,30);ctx.stroke();
      ctx.fillStyle='#777';ctx.beginPath();ctx.arc(px,37,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#333';ctx.fillRect(px-10,40,20,17);
    });
    ctx.restore();
    panel(x,y,w,h,TS().photoR);
    const {x:ix,y:iy,w:iw,h:ih}=IMG_AREA;
    ctx.save();rr(ix,iy,iw,ih,TS().softR);ctx.clip();
    ctx.fillStyle='#fff4d6';ctx.fillRect(ix,iy,iw,ih);
    if(photo&&photo.complete&&photo.naturalWidth){
      const base=Math.max(iw/photo.naturalWidth,ih/photo.naturalHeight);const sc=base*photoZoom;
      const ww=photo.naturalWidth*sc,hh=photo.naturalHeight*sc;
      ctx.drawImage(photo,ix+(iw-ww)/2+photoX,iy+(ih-hh)/2+photoY,ww,hh);
    }else{
      ctx.fillStyle=S.darkText;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='700 23px Vazirmatn';ctx.fillText('تصویر کنار تقویم',ix+iw/2,iy+ih/2);
    }
    ctx.restore();
    ctx.strokeStyle=S.frame;ctx.lineWidth=1.5;rr(ix,iy,iw,ih,TS().softR);ctx.stroke();
    drawNoteArea(NOTE_AREA.x,NOTE_AREA.y,NOTE_AREA.w,NOTE_AREA.h);
  }

  function logoRibbon(i){
    const {cx,w}=RIBBON;const x=cx-w/2,y=RIBBON_Y,h=RIBBON_H;
    ctx.fillStyle=grad(TS().goldA,TS().goldB,y,y+h);
    ctx.beginPath();
    ctx.moveTo(x+16,y);ctx.quadraticCurveTo(cx,y-20,x+w-16,y);
    ctx.lineTo(x+w-22,y+h-58);ctx.lineTo(cx,y+h);ctx.lineTo(x+22,y+h-58);ctx.closePath();ctx.fill();
    ctx.strokeStyle=TS().frame;ctx.lineWidth=3;ctx.stroke();
    ctx.save();ctx.globalAlpha=.15;ctx.fillStyle='#000';
    ctx.beginPath();ctx.moveTo(x+16,y);ctx.lineTo(x+40,y);ctx.lineTo(x+44,y+h-60);ctx.lineTo(x+22,y+h-58);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(x+w-16,y);ctx.lineTo(x+w-40,y);ctx.lineTo(x+w-44,y+h-60);ctx.lineTo(x+w-22,y+h-58);ctx.closePath();ctx.fill();
    ctx.restore();
    const ccy=y+88,ccr=60;
    ctx.fillStyle=S.darkText;ctx.beginPath();ctx.arc(cx,ccy,ccr,0,Math.PI*2);ctx.fill();
    if(logo){
      ctx.save();ctx.beginPath();ctx.arc(cx,ccy,ccr-6,0,Math.PI*2);ctx.clip();
      const sc=Math.max(((ccr-6)*2)/logo.width,((ccr-6)*2)/logo.height);
      ctx.drawImage(logo,cx-logo.width*sc/2,ccy-logo.height*sc/2,logo.width*sc,logo.height*sc);
      ctx.restore();
    }else{
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='900 24px Arial';ctx.fillText('YOUR',cx,ccy-14);ctx.fillText('LOGO',cx,ccy+16);
    }
    ctx.fillStyle=S.darkText;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='900 54px Vazirmatn';ctx.fillText(fa(i.s.y),cx,ROW_Y[0]);
    ctx.font='900 50px Vazirmatn';ctx.fillText(fa(i.h.y),cx,ROW_Y[1]);
    ctx.font='900 42px Arial';ctx.fillText(String(i.g.y),cx,ROW_Y[2]);
  }

  function dateRow(y,day,month,kind){
    ctx.strokeStyle=S.frame;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(620,y-42);ctx.lineTo(970,y-42);ctx.stroke();
    ctx.textBaseline='middle';ctx.fillStyle=S.goldText;ctx.textAlign='right';
    ctx.font='900 46px Vazirmatn';ctx.fillText(day,905,y);if(kind)drawIconByKind(kind,945,y,15,S.goldText,S.panel);
    ctx.textAlign='center';const mz=fit(month,220,34);
    ctx.font='900 '+mz+'px Vazirmatn';ctx.fillText(month,750,y);
  }

  function mainCard(i){
    panel(445,55,535,650,40);
    logoRibbon(i);
    const wdX=RIBBON_RIGHT+19,wdW=355,wdY=118,wdH=88;
    const wdCx=wdX+wdW/2,wdCy=wdY+wdH/2;
    ctx.fillStyle=grad(TS().goldA,TS().goldB,wdY,wdY+wdH);
    rr(wdX,wdY,wdW,wdH,wdH/2);ctx.fill();
    ctx.fillStyle=S.darkText;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='900 54px Vazirmatn';ctx.fillText(WD[i.wd],wdCx,wdCy);
    dateRow(ROW_Y[0],fa(i.s.d),FA_M[i.s.m-1],'calendar');
    dateRow(ROW_Y[1],fa(i.h.d),AR_M[i.h.m-1],'moon');
    dateRow(ROW_Y[2],fa(i.g.d),EN_M[i.g.m-1],'globe');
    ctx.fillStyle=grad(TS().goldA,TS().goldB,610,658);
    rr(615,610,355,48,24);ctx.fill();
    ctx.fillStyle=S.darkText;ctx.textAlign='center';
    const ch=chEl.value||'';const cz=fit(ch,320,16,700);
    ctx.font='700 '+cz+'px Arial';ctx.fillText(ch,792,634);
  }

  function dhikr(i){
    panel(55,728,925,244,34);
    ctx.fillStyle=grad(TS().goldA,TS().goldB,708,764);
    rr(320,708,445,56,28);ctx.fill();
    ctx.fillStyle=S.darkText;ctx.textAlign='center';ctx.textBaseline='middle';
    const ds=dhikrSettings[i.wd];
    ctx.font='900 '+ds.titleSize+'px Vazirmatn';ctx.fillText('ذکر روز '+WD[i.wd],542,736);
    ctx.fillStyle=grad(TS().goldA,TS().goldB,783,861);
    rr(155,783,725,78,39);ctx.fill();
    const [ar,tr]=DHIKR[i.wd];
    ctx.fillStyle=S.darkText;const az=fit(ar,495,ds.arabicSize);
    ctx.font='900 '+az+'px Vazirmatn';ctx.fillText(ar,542,822);
    ctx.fillStyle=S.goldText;const tz=fit(tr,500,ds.translationSize,700);
    ctx.font='700 '+tz+'px Vazirmatn';ctx.fillText(tr,542,930);
  }

  function footer(){
    panel(55,1000,925,140,28);
    ctx.save();ctx.fillStyle=S.goldText;ctx.textAlign='left';ctx.direction='ltr';
    ctx.font='700 22px Arial';ctx.textBaseline='middle';ctx.fillText(phEl.value||'',150,1070);ctx.restore();drawRoundIcon('phone',112,1070,24,S.goldText,S.panel);ctx.save();
    ctx.restore();
    ctx.strokeStyle=S.frame;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(490,1020);ctx.lineTo(490,1120);ctx.stroke();
    const url=(chUrlEl.value||'').trim();
    const hasQR=showQREl.checked&&!!url;
    const chName=(chEl.value||'').replace('@','');
    if(hasQR){
      drawQRCanvas(getQRMatrix(url),530,1010,120);
      const cz=fit(chName,230,20,700);
      ctx.fillStyle=S.goldText;ctx.textAlign='center';
      ctx.font='700 '+cz+'px Vazirmatn';ctx.fillText(chName,835,1070);
      drawRoundIcon('plane',705,1070,24,S.goldText,S.panel);
    }else{
      ctx.fillStyle=grad(TS().goldA,TS().goldB,1040,1100);
      ctx.beginPath();ctx.arc(625,1070,30,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=S.darkText;ctx.font='900 24px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('➤',625,1070);
      const cz=fit(chName,270,20,700);
      ctx.fillStyle=S.goldText;ctx.textAlign='left';
      ctx.font='700 '+cz+'px Vazirmatn';ctx.fillText(chName,670,1070);
    }
  }

registerTemplate({
  id:'classic',
  label:'کلاسیک سبز و طلایی',
  short:'کلاسیک',
  photoArea:{x:73,y:73,w:339,h:520},
  swatch:'linear-gradient(90deg,#063d35 0 42%,#d4a437 42% 58%,#063d35 58%)',
  style:{panel:'#063d35',frame:'#d4a437',inner:'#f7f1d9',goldText:'#f0c34f',darkText:'#10201c',bg:'#edf2ef',panelR:40,outerR:42,photoR:34,softR:18,pillR:28,goldA:'#a56a08',goldB:'#f0c34f',shadow:0.25},
  draw:function(i){background();unifiedFrame();photoPanel();mainCard(i);dhikr(i);footer();}
});
})();
