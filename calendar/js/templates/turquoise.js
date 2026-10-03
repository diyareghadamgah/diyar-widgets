/* قالب «فیروزه‌ای کاشی» */
(function(){
'use strict';
const THEME={
  shape:'arch',
  acc:['#0a6b73','#1db3b0'], line:['#a8741a','#f1d27a'], pillText:'#ffffff',
  card:'#fffdf6', box:'#fffdf6', innerLine:'rgba(11,122,127,.55)',
  text:'#0d2b33', sub:'#0b6b73', arabic:'#0d2b33', trans:'#0b6b73', glow:null,
  foot:['#0c8a90','#055058'], sil:'rgba(255,255,255,.16)', footText:'#ffffff',
  ringInner:'#fffdf6', noteFill:'#fffdf6', noteText:'#0d2b33',
  paint(W,H,line){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#fffaf0');g.addColorStop(1,'#f1e7cc');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.10;ctx.strokeStyle='#0b7a7f';ctx.lineWidth=2;
    for(let x=0;x<W+60;x+=120)for(let y=0;y<H+60;y+=120){
      drawStar8(x,y,34,0);ctx.stroke();
      drawStar8(x+60,y+60,22,Math.PI/8);ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle='#0b7a7f';ctx.lineWidth=14;rr(14,14,W-28,H-28,30);ctx.stroke();
    ctx.strokeStyle=line(20,H-20);ctx.lineWidth=3;rr(25,25,W-50,H-50,24);ctx.stroke();
    ctx.fillStyle='#f1d27a';
    for(let x=60;x<W-40;x+=45){[20,H-20].forEach(y=>{ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill();});}
    for(let y=60;y<H-40;y+=45){[20,W-20].forEach(x=>{ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill();});}
    [[34,34],[W-34,34],[34,H-34],[W-34,H-34]].forEach(([x,y])=>{drawStar8(x,y,15,0);ctx.fillStyle='#f1d27a';ctx.fill();ctx.strokeStyle='#a8741a';ctx.lineWidth=1.5;ctx.stroke();});
  }
};
registerTemplate({
  id:'turquoise',
  label:'فیروزه‌ای کاشی 🔷',
  short:'فیروزه‌ای',
  photoArea:{x:60,y:85,w:380,h:525},
  swatch:'linear-gradient(135deg,#fffaf0,#1db3b0 50%,#0a6b73)',
  style:{panel:'#fffdf6',frame:'#0b7a7f',inner:'#f1d27a',goldText:'#0b6b73',darkText:'#0d2b33',bg:'#fffaf0',panelR:34,outerR:34,photoR:28,softR:18,pillR:24,goldA:'#0a6b73',goldB:'#1db3b0',shadow:.2},
  draw:function(i){drawThemedCard(i,THEME);}
});
})();
