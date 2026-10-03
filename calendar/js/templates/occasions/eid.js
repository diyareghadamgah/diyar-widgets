/* قالب «عید» — سفید، سبز و طلایی */
(function(){
'use strict';
const THEME={
  shape:'circle',
  acc:['#0f7a55','#34c08f'], line:['#b98a2c','#f3d57f'], pillText:'#ffffff',
  card:'rgba(255,255,255,.9)', box:'rgba(255,255,255,.92)', innerLine:'rgba(15,122,85,.4)',
  text:'#0c3a2a', sub:'#0f7a55', arabic:'#0c3a2a', trans:'#0f6a4a', glow:null,
  foot:['#13966a','#075238'], sil:'rgba(255,255,255,.16)', footText:'#ffffff',
  ringInner:'#ffffff', noteFill:'rgba(255,255,255,.95)', noteText:'#0c3a2a',
  paint(W,H,line){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#fbfffc');g.addColorStop(1,'#dff3e6');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    drawCrescent(W-110,620,80,'#f3d57f',.35);
    let s=3;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
    const cols=['#f3d57f','#34c08f','#e9a7ae','#8fd3c0'];
    for(let k=0;k<70;k++){
      ctx.save();ctx.globalAlpha=.35+rnd()*.4;ctx.translate(rnd()*W,rnd()*H);ctx.rotate(rnd()*6);
      ctx.fillStyle=cols[k%4];
      if(k%3===0){drawStar8(0,0,6+rnd()*6,0);ctx.fill();}else{ctx.fillRect(-4,-1.5,8+rnd()*6,3);}
      ctx.restore();
    }
    ctx.strokeStyle=line(20,H-20);ctx.lineWidth=6;rr(20,20,W-40,H-40,34);ctx.stroke();
    ctx.strokeStyle='rgba(15,122,85,.55)';ctx.lineWidth=2;rr(34,34,W-68,H-68,26);ctx.stroke();
  }
};
registerTemplate({
  id:'eid', group:'مناسبتی', label:'عید 🎉', short:'عید',
  swatch:'linear-gradient(135deg,#fbfffc,#34c08f 55%,#f3d57f)',
  photoArea:{x:60,y:120,w:380,h:380},
  style:{panel:'#ffffff',frame:'#b98a2c',inner:'#f3d57f',goldText:'#0f7a55',darkText:'#0c3a2a',bg:'#fbfffc',panelR:34,outerR:34,photoR:28,softR:18,pillR:24,goldA:'#0f7a55',goldB:'#34c08f',shadow:.2},
  draw:function(i){drawThemedCard(i,THEME);}
});
})();
