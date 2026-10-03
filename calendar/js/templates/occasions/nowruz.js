/* قالب «نوروز» */
(function(){
'use strict';
const THEME=lightTheme({shape:'circle',acc:['#2f9e44','#8ad36f'],line:['#c79a2f','#f6dc85'],pillText:'#ffffff',text:'#1d3b1d',sub:'#2f7a2f',foot:['#3fae55','#1c6b30'],
  scene:{bg:['#fffdf0','#e6f6dc'],petals:['#ffd1dc','#ffe08a','#c8f0b0','#ffb3c1'],blossoms:{col:'#ffb3c1',center:'#f4c542'},inner:'rgba(47,158,68,.5)'}});
registerThemed({id:'nowruz',label:'نوروز 🌱',short:'نوروز',theme:THEME});
})();
