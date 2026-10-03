/* قالب «روز مادر» */
(function(){
'use strict';
const THEME=lightTheme({shape:'circle',acc:['#d6336c','#ff8fab'],line:['#d6336c','#ffc2d1'],pillText:'#ffffff',text:'#5a1230',sub:'#c2255c',foot:['#e0527f','#a61e4d'],
  scene:{bg:['#fff5f7','#ffe0e8'],petals:['#ffc2d1','#ff8fab'],blossoms:{col:'#ff8fab',center:'#ffd166'},inner:'rgba(214,51,108,.4)'}});
registerThemed({id:'mothersday',label:'روز مادر 🌹',short:'مادر',theme:THEME});
})();
