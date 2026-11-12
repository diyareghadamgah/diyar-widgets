#!/usr/bin/env node
/* کپی فایل‌های وب به www/ (webDir کاپاسیتور). بدون وابستگی. */
const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const out=path.join(root,'www');
const FILES=['index.html','app.js','tags.js','platform.js','style.css','manifest.json','sw.js','native-player.js','iptv-native.js','video.js','player-settings.js','mode-shell.js','hls.min.js','icon-192.png','icon-512.png','icon-maskable-512.png','favicon.png'];
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const missing=[];
for(const f of FILES){const s=path.join(root,f);if(!fs.existsSync(s)){missing.push(f);continue}fs.copyFileSync(s,path.join(out,f))}
let ver='?';try{ver=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version}catch{}
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({version:ver,built:new Date().toISOString()}));   // برای تشخیص «APK قدیمی» در برنامه
const fonts=path.join(root,'fonts');if(fs.existsSync(fonts))fs.cpSync(fonts,path.join(out,'fonts'),{recursive:true});
if(missing.length){console.error('فایل‌های ناموجود: '+missing.join(', '));process.exit(1)}
console.log('www آماده شد ('+FILES.length+' فایل) → '+out);
