/* قالب «گلبهی رزگلد» */
(function(){
'use strict';
const THEME={
  shape:'round',
  acc:['#b5707b','#f2c3bb'], line:['#b5707b','#f4cfc8'], pillText:'#3f1820',
  card:'rgba(255,255,255,.80)', box:'rgba(255,255,255,.82)', innerLine:'rgba(181,112,123,.45)',
  text:'#4a2128', sub:'#9a5560', arabic:'#4a2128', trans:'#8a4a55', glow:null,
  foot:['#c98790','#8b4552'], sil:'rgba(255,255,255,.17)', footText:'#ffffff',
  ringInner:'#fff6f2', noteFill:'rgba(255,255,255,.9)', noteText:'#4a2128',
  paint(W,H,line){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#fff6f2');g.addColorStop(1,'#f6d9d3');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    [[W*.85,140,'rgba(244,190,190,.45)'],[W*.12,H*.55,'rgba(255,214,200,.5)']].forEach(([x,y,c])=>{
      const r=ctx.createRadialGradient(x,y,10,x,y,420);r.addColorStop(0,c);r.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=r;ctx.fillRect(0,0,W,H);
    });
    let s=11;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
    for(let k=0;k<22;k++){
      ctx.save();ctx.globalAlpha=.25+rnd()*.25;ctx.translate(rnd()*W,rnd()*H);ctx.rotate(rnd()*6);
      ctx.fillStyle='#e9a7ae';ctx.beginPath();ctx.ellipse(0,0,9+rnd()*8,4+rnd()*3,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    [[40,40,52],[W-40,40,46],[40,H-40,46],[W-40,H-40,52]].forEach(([x,y,r],n)=>{
      ctx.save();ctx.globalAlpha=.75;
      drawBlossom(x,y,r,'#f0b5bc','#d9a24a');
      drawBlossom(x+(x<W/2?44:-44),y+(y<H/2?30:-30),r*.6,'#f7cfd1','#d9a24a');
      ctx.restore();
    });
    ctx.strokeStyle=line(20,H-20);ctx.lineWidth=6;rr(20,20,W-40,H-40,34);ctx.stroke();
    ctx.strokeStyle='rgba(181,112,123,.45)';ctx.lineWidth=1.5;rr(34,34,W-68,H-68,26);ctx.stroke();
  }
};
registerTemplate({
  id:'rosegold',
  label:'گلبهی رزگلد 🌸',
  short:'گلبهی',
  photoArea:{x:60,y:85,w:380,h:525},
  swatch:'linear-gradient(135deg,#fff6f2,#f2c3bb 50%,#b5707b)',
  style:{panel:'#fff6f2',frame:'#b5707b',inner:'#f4cfc8',goldText:'#9a5560',darkText:'#4a2128',bg:'#fff6f2',panelR:34,outerR:34,photoR:28,softR:18,pillR:24,goldA:'#b5707b',goldB:'#f2c3bb',shadow:.2},
  draw:function(i){drawThemedCard(i,THEME);}
});
})();
