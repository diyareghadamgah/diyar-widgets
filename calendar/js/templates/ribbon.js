/* قالب «روبان طلایی» */
(function(){
'use strict';
  function drawWreath(cx,cy,R){
    for(const side of [-1,1]){
      const a0=Math.PI/2-side*0.38,a1=Math.PI/2-side*(0.38+1.95);
      const r0=R+5;
      ctx.save();ctx.strokeStyle='#8a6a10';ctx.lineWidth=3.5;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(cx,cy,r0,Math.min(a0,a1),Math.max(a0,a1));ctx.stroke();ctx.restore();
      for(let k=0;k<12;k++){
        const t=k/11,ang=Math.PI/2-side*(0.38+t*1.95);
        const px=cx+Math.cos(ang)*r0,py=cy+Math.sin(ang)*r0;
        const tan=ang-side*Math.PI/2,sz=1-t*.3,L=44*sz,W=9.5*sz;
        [[ side*.62,'#c9a44a'],[-side*.62,'#e6cb7c']].forEach(([off,col],n)=>{
          const la=tan+off;
          ctx.save();ctx.translate(px+Math.cos(la)*L/2,py+Math.sin(la)*L/2);ctx.rotate(la);
          ctx.fillStyle=col;ctx.strokeStyle='#8a6a10';ctx.lineWidth=1.2;
          ctx.beginPath();ctx.ellipse(0,0,L/2,W,0,0,Math.PI*2);ctx.fill();ctx.stroke();
          ctx.strokeStyle='rgba(138,106,16,.55)';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(-L/2+4,0);ctx.lineTo(L/2-4,0);ctx.stroke();
          ctx.restore();
        });
      }
    }
  }

  function drawRibbonTemplate(i){
    const green='#1f5b48', greenDark='#0e3d31';
    const bg=ctx.createRadialGradient(cv.width/2,cv.height/2,100,cv.width/2,cv.height/2,900);
    bg.addColorStop(0,'#fdf6e6');bg.addColorStop(1,'#efe3c8');
    ctx.fillStyle=bg;ctx.fillRect(0,0,cv.width,cv.height);
    ctx.save();ctx.globalAlpha=.09;ctx.strokeStyle='#b8913a';ctx.lineWidth=1.4;
    for(let x=55;x<cv.width;x+=110)for(let y=55;y<cv.height;y+=110){ctx.beginPath();for(let k=0;k<16;k++){const a=k*Math.PI/8,r=k%2?14:28;ctx[k?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.closePath();ctx.stroke();}
    ctx.restore();
    ctx.strokeStyle='#c9a44a';ctx.lineWidth=5;rr(18,18,1014,1144,30);ctx.stroke();
    ctx.strokeStyle='#e0c576';ctx.lineWidth=1.5;rr(28,28,994,1124,24);ctx.stroke();

    /* شاخه‌های تزئینی گوشه‌ها */
  

    /* ---------- عکس دایره‌ای با قاب طلایی چندلایه، چسبیده و بلند ---------- */
    const PCX=285, PCY=340, PR=180;
    const R_LIP = PR + 2;    // لبهٔ نازک دور عکس
    const R_IN  = PR + 8;    // حلقهٔ طلایی روشن (نزدیک به عکس)
    const R_MID = PR + 18;   // حلقهٔ میانی تیره (بلندتر)
    const R_OUT = PR + 26;   // لبهٔ بیرونی

    // سایهٔ نرم زیر حلقه
    ctx.save();
    ctx.shadowColor='#0005';ctx.shadowBlur=22;ctx.shadowOffsetY=7;
    ctx.fillStyle='#d9b45b';
    ctx.beginPath();ctx.arc(PCX,PCY,R_OUT,0,Math.PI*2);ctx.fill();
    ctx.restore();

    // گرادیان طلایی روی حلقهٔ ضخیم بیرونی
    const ringGrad = ctx.createRadialGradient(PCX,PCY,R_MID,PCX,PCY,R_OUT);
    ringGrad.addColorStop(0,'#c9a44a');
    ringGrad.addColorStop(0.55,'#e0bd6a');
    ringGrad.addColorStop(1,'#8a6a10');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();ctx.arc(PCX,PCY,R_OUT,0,Math.PI*2);ctx.fill();

    // حلقهٔ نازک تیره روی لبهٔ بیرونی
    ctx.strokeStyle='#6d4a06';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(PCX,PCY,R_OUT,0,Math.PI*2);ctx.stroke();

    // خط تیره در آستانهٔ حلقهٔ داخلی
    ctx.strokeStyle='#6d4a06';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.arc(PCX,PCY,R_MID,0,Math.PI*2);ctx.stroke();

    // حلقهٔ طلایی روشن (نزدیک به عکس)
    ctx.fillStyle='#e8c974';
    ctx.beginPath();ctx.arc(PCX,PCY,R_IN,0,Math.PI*2);ctx.fill();

    // خط تیرهٔ نازک بین حلقهٔ روشن و عکس
    ctx.strokeStyle='#8a6a10';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(PCX,PCY,R_IN,0,Math.PI*2);ctx.stroke();

    // لبهٔ نازک طلایی روشن دور عکس
    ctx.fillStyle='#f0d78e';
    ctx.beginPath();ctx.arc(PCX,PCY,R_LIP,0,Math.PI*2);ctx.fill();

    // خط تیرهٔ نازک روی لبهٔ عکس
    ctx.strokeStyle='#a07d24';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(PCX,PCY,R_LIP,0,Math.PI*2);ctx.stroke();

    /* ---------- عکس داخل حلقه ---------- */
    ctx.save();ctx.beginPath();ctx.arc(PCX,PCY,PR,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#fff8e7';ctx.fillRect(PCX-PR,PCY-PR,PR*2,PR*2);
    if(photo&&photo.complete&&photo.naturalWidth){
      const base=Math.max((PR*2)/photo.naturalWidth,(PR*2)/photo.naturalHeight);
      const sc=base*photoZoom;
      const ww=photo.naturalWidth*sc,hh=photo.naturalHeight*sc;
      ctx.drawImage(photo,PCX-ww/2+photoX,PCY-hh/2+photoY,ww,hh);
    }else{
      drawCameraIcon(PCX,PCY-14,42);
      ctx.fillStyle='#a89878';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='700 20px Vazirmatn';ctx.fillText('تصویر کنار تقویم',PCX,PCY+54);
    }
    ctx.restore();

    /* برگ‌های تزئینی چسبیده به حلقه */
    drawWreath(PCX,PCY,R_OUT);

    /* ---------- روبان نام کانال زیر عکس ---------- */
    const RB_Y=PCY+R_OUT-14,RB_CX=PCX,RB_W=310,RB_H=60;
    const RB_L=RB_CX-RB_W/2,RB_R=RB_CX+RB_W/2;
    const ch=(chEl.value||'').replace('@','');
    ctx.save();
    ctx.lineJoin='round';ctx.strokeStyle='#6d4a06';ctx.lineWidth=2;
    [[-1,RB_L],[1,RB_R]].forEach(([sd,bx])=>{
      ctx.fillStyle='#b4851e';ctx.beginPath();
      ctx.moveTo(bx-sd*6,RB_Y+22);ctx.lineTo(bx+sd*64,RB_Y+30);ctx.lineTo(bx+sd*42,RB_Y+60);
      ctx.lineTo(bx+sd*64,RB_Y+92);ctx.lineTo(bx-sd*6,RB_Y+RB_H+4);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#7c5610';ctx.beginPath();
      ctx.moveTo(bx,RB_Y+RB_H+6);ctx.lineTo(bx+sd*18,RB_Y+RB_H+17);ctx.lineTo(bx,RB_Y+RB_H+20);ctx.closePath();ctx.fill();
    });
    const bandPath=()=>{ctx.beginPath();ctx.moveTo(RB_L,RB_Y+10);ctx.quadraticCurveTo(RB_CX,RB_Y-10,RB_R,RB_Y+10);
      ctx.lineTo(RB_R,RB_Y+RB_H+8);ctx.quadraticCurveTo(RB_CX,RB_Y+RB_H-12,RB_L,RB_Y+RB_H+8);ctx.closePath();};
    const bg2=ctx.createLinearGradient(RB_L,0,RB_R,0);
    bg2.addColorStop(0,'#c9a032');bg2.addColorStop(.5,'#f6dc85');bg2.addColorStop(1,'#c9a032');
    ctx.shadowColor='#0005';ctx.shadowBlur=10;ctx.shadowOffsetY=4;
    bandPath();ctx.fillStyle=bg2;ctx.fill();
    ctx.shadowColor='transparent';bandPath();ctx.strokeStyle='#6d4a06';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#3a2a00';ctx.textAlign='center';ctx.textBaseline='middle';
    const cz=fit(ch,RB_W-50,30,800);ctx.font='800 '+cz+'px Vazirmatn';
    ctx.fillText(ch,RB_CX,RB_Y+RB_H/2+4);
    ctx.restore();

    /* ---------- پیل روز هفته ---------- */
    const DP={x:545,y:66,w:460,h:104};
    ctx.fillStyle=greenDark;rr(DP.x,DP.y,DP.w,DP.h,26);ctx.fill();
    ctx.fillStyle='#fff';const dz=fit(WD[i.wd],DP.w-60,58,900);
    ctx.font='900 '+dz+'px Vazirmatn';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(WD[i.wd],DP.x+DP.w/2,DP.y+DP.h/2);

    /* ---------- ردیف‌های تاریخ ---------- */
    const rows=[
      [fa(i.s.d),FA_M[i.s.m-1],fa(i.s.y),'calendar'],
      [fa(i.h.d),AR_M[i.h.m-1],fa(i.h.y),'moon'],
      [fa(i.g.d),EN_M[i.g.m-1],String(i.g.y),'globe']
    ];
    const RX=545,RW=460,RH=140,RY0=192,RGAP=24;
    rows.forEach((r,k)=>{
      const y=RY0+k*(RH+RGAP);
      ctx.fillStyle='#fffdf5';rr(RX,y,RW,RH,26);ctx.fill();
      ctx.strokeStyle=green;ctx.lineWidth=2.5;rr(RX,y,RW,RH,26);ctx.stroke();
      const ICX=RX+58,ICY=y+RH/2,ICR=40;
      ctx.fillStyle=green;ctx.beginPath();ctx.arc(ICX,ICY,ICR,0,Math.PI*2);ctx.fill();
      drawIconByKind(r[3],ICX,ICY,21,'#ffffff',green);
      const edge=RX+RW-28;
      ctx.fillStyle='#10201c';ctx.textAlign='right';
      const dz2=fit(r[0],70,52,900);ctx.font='900 '+dz2+'px Vazirmatn';
      ctx.fillText(r[0],edge,ICY);
      ctx.textAlign='center';const mz=fit(r[1],210,38,900);
      ctx.font='900 '+mz+'px Vazirmatn';ctx.fillText(r[1],edge-175,ICY);
      ctx.save();ctx.globalAlpha=.75;ctx.textAlign='left';ctx.fillStyle=greenDark;
      const isNum=/^\d+$/.test(r[2]);
      ctx.font='900 22px '+(isNum?'Arial':'Vazirmatn');
      ctx.fillText(r[2],RX+104,ICY);ctx.restore();
    });

    /* ---------- پیل ذکر روز ---------- */
    const ds=dhikrSettings[i.wd];
    const TITLE='ذکر روز '+WD[i.wd];
    const tpw=400,tpx=(cv.width-tpw)/2,tpy=736,tph=58;
    ctx.fillStyle=greenDark;rr(tpx,tpy,tpw,tph,tph/2);ctx.fill();
    ctx.fillStyle='#fff';const tz=fit(TITLE,tpw-40,ds.titleSize-3,900);
    ctx.font='900 '+tz+'px Vazirmatn';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(TITLE,cv.width/2,tpy+tph/2);

    /* ---------- جعبه ذکر ---------- */
    ctx.fillStyle='#fffdf5';rr(45,760,960,240,22);ctx.fill();
    ctx.strokeStyle=grad('#a56a08','#f0c34f',760,1000);ctx.lineWidth=4.5;rr(45,760,960,240,22);ctx.stroke();
    ctx.strokeStyle='#d6b25a';ctx.lineWidth=1.3;rr(57,772,936,216,17);ctx.stroke();
    ctx.fillStyle=greenDark;rr(tpx,tpy,tpw,tph,tph/2);ctx.fill();ctx.strokeStyle='#c9a44a';ctx.lineWidth=2.5;rr(tpx,tpy,tpw,tph,tph/2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 '+tz+'px Vazirmatn';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(TITLE,cv.width/2,tpy+tph/2);
    const [ar,tr]=DHIKR[i.wd];
    ctx.fillStyle='#10201c';const az=fit(ar,850,ds.arabicSize+6);
    ctx.font='900 '+az+'px Vazirmatn';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(ar,cv.width/2,862);
    ctx.fillStyle='#2a3a34';const trz=fit(tr,850,ds.translationSize,700);
    ctx.font='700 '+trz+'px Vazirmatn';ctx.fillText(tr,cv.width/2,945);

    /* ---------- فوتر: بنر روبان طلایی ---------- */
    const FY=1050,FH=80,FCY=FY+FH/2;
    const bannerPath=()=>{ctx.beginPath();ctx.moveTo(40,FY);ctx.lineTo(1010,FY);ctx.lineTo(990,FCY);ctx.lineTo(1010,FY+FH);ctx.lineTo(40,FY+FH);ctx.lineTo(60,FCY);ctx.closePath();};
    ctx.save();ctx.shadowColor='#0004';ctx.shadowBlur=12;ctx.shadowOffsetY=5;
    bannerPath();ctx.fillStyle=grad('#b57a1a','#f3d983',FY,FY+FH);ctx.fill();ctx.restore();
    bannerPath();ctx.strokeStyle='#8a6a10';ctx.lineWidth=2.5;ctx.stroke();
    ctx.strokeStyle='rgba(255,243,190,.7)';ctx.lineWidth=1.2;ctx.beginPath();
    ctx.moveTo(75,FY+7);ctx.lineTo(975,FY+7);ctx.moveTo(75,FY+FH-7);ctx.lineTo(975,FY+FH-7);ctx.stroke();
    const dot=cx=>{ctx.fillStyle=greenDark;ctx.beginPath();ctx.arc(cx,FCY,23,0,Math.PI*2);ctx.fill();};
    dot(105);
    ctx.save();ctx.translate(105,FCY);ctx.rotate(-Math.PI/4);
    ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=4;ctx.lineCap='round';
    ctx.beginPath();ctx.arc(0,-2,9,Math.PI*.2,Math.PI*.8);ctx.stroke();
    [[7.3,3.3],[-7.3,3.3]].forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],3.6,0,Math.PI*2);ctx.fill();});
    ctx.restore();
    dot(650);
    ctx.fillStyle='#fff';ctx.beginPath();
    ctx.moveTo(640,FCY+1);ctx.lineTo(661,FCY-8);ctx.lineTo(654,FCY+10);ctx.lineTo(650,FCY+3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#1b1405';ctx.textBaseline='middle';ctx.textAlign='left';
    ctx.save();ctx.direction='ltr';ctx.font='800 '+fit(phEl.value||'',280,22,800)+'px Arial';ctx.fillText(phEl.value||'',142,FCY);ctx.restore();
    ctx.font='800 '+fit(ch,270,22,800)+'px Vazirmatn';ctx.fillText(ch,688,FCY);
    const url=(chUrlEl.value||'').trim();
    if(showQREl.checked&&url){
      ctx.save();ctx.shadowColor='#0006';ctx.shadowBlur=14;ctx.shadowOffsetY=4;
      ctx.fillStyle=greenDark;rr(463,FY-22,124,FH+44,18);ctx.fill();ctx.restore();
      ctx.strokeStyle='#c9a44a';ctx.lineWidth=3;rr(463,FY-22,124,FH+44,18);ctx.stroke();
      drawQRCanvas(getQRMatrix(url),471,FY-14,108);
    }

    /* لوگو: گوشهٔ بالا-چپ قالب */
    if(logo&&logo.naturalWidth)drawLogoBadge(82, 92, 40, {ringOuter:'#c9a44a', ringInner:'#8a6a10', bg:'#fffdf5', placeholderColor:'#8a7f52', placeholderFont:15});
  }

registerTemplate({
  id:'ribbon',
  label:'روبان طلایی',
  short:'روبان طلایی',
  photoArea:{x:79,y:134,w:412,h:412},
  swatch:'linear-gradient(135deg,#d8b25b,#fff0a8 48%,#b77a19)',
  style:{panel:'#e7c96f',frame:'#8b5d16',inner:'#fff1b5',goldText:'#1d1d1d',darkText:'#1b1b1b',bg:'#edf2ef',panelR:54,outerR:46,photoR:30,softR:22,pillR:18,goldA:'#b57a1a',goldB:'#ffe58a',shadow:0.20},
  draw:drawRibbonTemplate
});
})();
