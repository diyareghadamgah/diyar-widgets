/* قالب «رمضان» */
(function(){
'use strict';
const THEME={
  shape:'arch',
  acc:['#b8862b','#ffe39a'], line:['#b8862b','#ffe39a'], pillText:'#24123f',
  card:'rgba(255,255,255,.08)', box:'rgba(255,255,255,.07)', innerLine:'rgba(255,227,154,.35)',
  text:'#fff4d6', sub:'#e2c98a', arabic:'#ffe9a8', trans:'#f1e4c4', glow:'rgba(255,214,120,.55)',
  foot:['#4a2a85','#170c33'], sil:'rgba(255,227,154,.13)', footText:'#fff4d6',
  ringInner:'#170c33', noteFill:'rgba(255,248,225,.95)', noteText:'#24123f',
  paint(W,H,line){
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#150a33');g.addColorStop(.5,'#35205f');g.addColorStop(1,'#120a2b');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const gl=ctx.createRadialGradient(W*.82,150,10,W*.82,150,520);
    gl.addColorStop(0,'rgba(255,214,120,.28)');gl.addColorStop(1,'rgba(255,214,120,0)');
    ctx.fillStyle=gl;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.07;ctx.strokeStyle='#ffe39a';ctx.lineWidth=1.5;
    for(let x=55;x<W;x+=110)for(let y=55;y<H;y+=110){drawStar8(x,y,30,0);ctx.stroke();}
    ctx.restore();
    drawCrescent(W-130,640,70,'#ffe39a',.14);
    let s=5;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
    ctx.fillStyle='#ffe9a8';
    for(let k=0;k<60;k++){ctx.globalAlpha=.2+rnd()*.5;ctx.beginPath();ctx.arc(rnd()*W,rnd()*H,rnd()*1.6+.4,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
    ctx.strokeStyle=line(20,H-20);ctx.lineWidth=6;rr(20,20,W-40,H-40,34);ctx.stroke();
    ctx.strokeStyle='rgba(255,227,154,.5)';ctx.lineWidth=1.5;rr(34,34,W-68,H-68,26);ctx.stroke();
  }
};
registerTemplate({
  id:'ramadan', group:'مناسبتی', label:'رمضان 🌙', short:'رمضان',
  swatch:'linear-gradient(135deg,#150a33,#4a2a85 55%,#ffe39a)',
  photoArea:{x:60,y:85,w:380,h:525},
  style:{panel:'#24123f',frame:'#b8862b',inner:'#ffe39a',goldText:'#ffe9a8',darkText:'#24123f',bg:'#150a33',panelR:34,outerR:34,photoR:28,softR:18,pillR:24,goldA:'#b8862b',goldB:'#ffe39a',shadow:.3},
  draw:function(i){drawThemedCard(i,THEME);}
});
})();
