/* قالب «محرم» — مشکی و سرخ، آرام و باوقار */
(function(){
'use strict';
const THEME={
  shape:'round',
  acc:['#7d1414','#c53030'], line:['#8f8f8f','#f2f2f2'], pillText:'#ffffff',
  card:'rgba(255,255,255,.06)', box:'rgba(255,255,255,.05)', innerLine:'rgba(255,255,255,.28)',
  text:'#f4f4f4', sub:'#c9a3a3', arabic:'#ffffff', trans:'#dcdcdc', glow:'rgba(255,255,255,.35)',
  foot:['#3a0c0c','#120404'], sil:'rgba(255,255,255,.09)', footText:'#f4f4f4',
  ringInner:'#0b0b0d', noteFill:'rgba(255,255,255,.92)', noteText:'#1b1b1b',
  paint(W,H,line){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b0b0d');g.addColorStop(.6,'#1a1214');g.addColorStop(1,'#0b0b0d');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const r=ctx.createRadialGradient(W/2,H,50,W/2,H,700);r.addColorStop(0,'rgba(160,30,30,.38)');r.addColorStop(1,'rgba(160,30,30,0)');
    ctx.fillStyle=r;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.05;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;
    for(let x=55;x<W;x+=110)for(let y=55;y<H;y+=110){drawStar8(x,y,30,0);ctx.stroke();}
    ctx.restore();
    ctx.strokeStyle=line(20,H-20);ctx.lineWidth=5;rr(20,20,W-40,H-40,30);ctx.stroke();
    ctx.strokeStyle='#8a1c1c';ctx.lineWidth=2.5;rr(32,32,W-64,H-64,24);ctx.stroke();
  }
};
registerTemplate({
  id:'muharram', group:'مناسبتی', label:'محرم 🖤', short:'محرم',
  swatch:'linear-gradient(135deg,#0b0b0d,#7d1414 60%,#f2f2f2)',
  photoArea:{x:60,y:85,w:380,h:525},
  style:{panel:'#0b0b0d',frame:'#8f8f8f',inner:'#f2f2f2',goldText:'#f4f4f4',darkText:'#1b1b1b',bg:'#0b0b0d',panelR:30,outerR:30,photoR:28,softR:18,pillR:24,goldA:'#7d1414',goldB:'#c53030',shadow:.3},
  draw:function(i){drawThemedCard(i,THEME);}
});
})();
