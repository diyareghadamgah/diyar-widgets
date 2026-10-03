/* قالب «شب قدر» */
(function(){
'use strict';
const THEME=darkTheme({shape:'circle',acc:['#c8962c','#ffe9a8'],line:['#c8962c','#ffe9a8'],pillText:'#0a1020',arabic:'#ffe9a8',sub:'#ecd592',foot:['#10234f','#02040f'],
  scene:{bg:['#02040f','#0b1a3d','#02040f'],glow:'rgba(255,215,120,.36)',glowAt:[.5,.3],moon:{x:925,y:655,r:92,color:'#ffe39a',alpha:.15},dots:'#ffe9a8',inner:'rgba(255,233,168,.45)'}});
registerThemed({id:'qadr',label:'شب قدر 🌌',short:'شب قدر',theme:THEME});
})();
