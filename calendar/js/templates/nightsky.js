/* قالب «آسمان شب» */
(function(){
'use strict';
const THEME={
  shape:'circle',
  acc:['#8c9bd0','#f3f6ff'], line:['#7f8fc8','#eef2ff'], pillText:'#0a1238',
  card:'rgba(255,255,255,.08)', box:'rgba(255,255,255,.07)', innerLine:'rgba(220,230,255,.35)',
  text:'#f3f6ff', sub:'#b9c4ee', arabic:'#ffffff', trans:'#c4cdf0', glow:'rgba(180,200,255,.6)',
  foot:['#1a2c75','#070d2b'], sil:'rgba(220,230,255,.13)', footText:'#f3f6ff',
  ringInner:'#060b26', noteFill:'rgba(255,255,255,.92)', noteText:'#0a1238',
  paint(W,H,line){
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#050a22');g.addColorStop(.55,'#12215a');g.addColorStop(1,'#060b26');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const gl=ctx.createRadialGradient(W*.8,120,10,W*.8,120,560);
    gl.addColorStop(0,'rgba(170,190,255,.30)');gl.addColorStop(1,'rgba(170,190,255,0)');
    ctx.fillStyle=gl;ctx.fillRect(0,0,W,H);
    let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
    ctx.fillStyle='#fff';
    for(let k=0;k<170;k++){ctx.globalAlpha=.2+rnd()*.6;ctx.beginPath();ctx.arc(rnd()*W,rnd()*H,rnd()*1.7+.4,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#dfe8ff';
    for(let k=0;k<16;k++){
      const x=rnd()*W,y=rnd()*H,r=5+rnd()*9;ctx.globalAlpha=.55+rnd()*.35;
      ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.quadraticCurveTo(x,y,x,y+r);
      ctx.quadraticCurveTo(x,y,x-r,y);ctx.quadraticCurveTo(x,y,x,y-r);ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.strokeStyle=line(20,H-20);ctx.lineWidth=6;rr(20,20,W-40,H-40,34);ctx.stroke();
    ctx.strokeStyle='rgba(220,230,255,.45)';ctx.lineWidth=1.5;rr(34,34,W-68,H-68,26);ctx.stroke();
  }
};
registerTemplate({
  id:'nightsky',
  label:'آسمان شب 🌙',
  short:'آسمان شب',
  photoArea:{x:60,y:120,w:380,h:380},
  swatch:'linear-gradient(135deg,#050a22,#1b2f7a 55%,#e8eeff)',
  style:{panel:'#0a1238',frame:'#8c9bd0',inner:'#eef2ff',goldText:'#f3f6ff',darkText:'#0a1238',bg:'#050a22',panelR:34,outerR:34,photoR:28,softR:18,pillR:24,goldA:'#8c9bd0',goldB:'#f3f6ff',shadow:.3},
  draw:function(i){drawThemedCard(i,THEME);}
});
})();
