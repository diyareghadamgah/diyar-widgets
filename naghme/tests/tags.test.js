const fs=require('fs'),T=require('../tags.js'),jpg=fs.readFileSync('fx/a.jpg'),png=fs.readFileSync('fx/b.png');
let pass=0,fail=0;const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n)};
const ss=n=>Buffer.from([(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127]);
const enc=(s,e)=>e===0?Buffer.from(s,'latin1'):e===1?Buffer.concat([Buffer.from([0xFF,0xFE]),Buffer.from(s,'utf16le')]):e===2?Buffer.from(s,'utf16le').swap16():Buffer.from(s,'utf8');
const nul=e=>e===1||e===2?Buffer.from([0,0]):Buffer.from([0]);
function frame(v,id,body,flags=[0,0]){const h=Buffer.alloc(10);h.write(id);(v===4?ss(body.length):Buffer.from([body.length>>>24,body.length>>16&255,body.length>>8&255,body.length&255])).copy(h,4);h[8]=flags[0];h[9]=flags[1];return Buffer.concat([h,body])}
const txt=(v,id,s,e=3)=>frame(v,id,Buffer.concat([Buffer.from([e]),enc(s,e)]));
const apic=(v,img,mime,type,desc,e)=>frame(v,'APIC',Buffer.concat([Buffer.from([e]),Buffer.from(mime+'\0'),Buffer.from([type]),enc(desc,e),nul(e),img]));
function tag(v,frames,flag=0,pad=64){const b=Buffer.concat([...frames,Buffer.alloc(pad)]);return Buffer.concat([Buffer.from([0x49,0x44,0x33,v,0,flag]),ss(b.length),b])}
const eq=(a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))===0;
const cov=async t=>t.cover?Buffer.from(await t.cover.arrayBuffer()):null;
(async()=>{
 for(const v of [3,4]) for(const e of [0,1,2,3]) for(const d of ['','Front cover توضیح']){
  if(e===0&&d.match(/[^\x00-\x7f]/))continue;
  const t=T.parseID3(new Uint8Array(tag(v,[txt(v,'TIT2','Song',e===0?3:e),apic(v,jpg,'image/jpeg',3,d,e)])));
  const c=await cov(t);ok(`v2.${v} enc${e} desc="${d?'full':'empty'}" JPEG بایت‌به‌بایت برابر`,c&&eq(c,jpg)&&t.cover.type==='image/jpeg'&&t.title==='Song')}
 {const t=T.parseID3(new Uint8Array(tag(3,[apic(3,png,'image/png',3,'',0)])));ok('PNG حفظ MIME و بایت‌ها',eq(await cov(t),png)&&t.cover.type==='image/png')}
 {const t=T.parseID3(new Uint8Array(tag(3,[apic(3,png,'image/jpg',3,'',0)])));ok('MIME نادرست (image/jpg برای PNG) با امضا اصلاح می‌شود',t.cover&&t.cover.type==='image/png')}
 {const t=T.parseID3(new Uint8Array(tag(3,[apic(3,png,'image/png',4,'back',0),apic(3,jpg,'image/jpeg',3,'',0),apic(3,png,'image/png',0,'',0)])));ok('چند APIC: جلد جلو (type 3) اولویت دارد',eq(await cov(t),jpg))}
 {const t=T.parseID3(new Uint8Array(tag(3,[apic(3,png,'image/png',4,'back',0),apic(3,jpg,'image/jpeg',0,'',0)])));ok('چند APIC: بدون جلد جلو، type 0 بر back اولویت دارد',eq(await cov(t),jpg))}
 {const t=T.parseID3(new Uint8Array(tag(3,[apic(3,Buffer.from('not an image at all, garbage garbage garbage garbage garbage garbage garbage garbage'),'image/jpeg',3,'',0),txt(3,'TIT2','OK')])));ok('تصویر خراب: بدون کاور، ولی بقیه‌ی تگ‌ها خوانده می‌شود',!t.cover&&t.title==='OK')}
 {const full=tag(3,[txt(3,'TIT2','T'),apic(3,jpg,'image/jpeg',3,'',0)]);const t=T.parseID3(new Uint8Array(full.subarray(0,full.length-jpg.length/2)));ok('تگ ناقص (بریده‌شده): بدون خطا',t.title==='T'||t.title===undefined)}
 {const t=T.parseID3(new Uint8Array(Buffer.from([0x49,0x44,0x33,3,0,0,0,0,0,50,1,2,3])));ok('هدر ID3 با طول نامعتبر: بدون خطا',typeof t==='object'&&!t.cover)}
 {const t=T.parseID3(new Uint8Array(Buffer.from('hello world, not an id3 tag')));ok('ورودی غیر ID3',Object.keys(t).length===0)}
 {const tg=tag(3,[apic(3,jpg,'image/jpeg',3,'',0)]);const un=[];for(let i=0;i<tg.length;i++){un.push(tg[i]);if(tg[i]===0xFF&&i>=10)un.push(0)}
  const body=Buffer.from(un.slice(10));const buf=Buffer.concat([Buffer.from([0x49,0x44,0x33,3,0,0x80]),ss(body.length),body]);const t=T.parseID3(new Uint8Array(buf));ok('v2.3 با unsynchronisation: JPEG سالم',eq(await cov(t),jpg))}
 {const body=Buffer.concat([Buffer.from([0,0,0,6,0,0,0,0,0,0]),apic(3,jpg,'image/jpeg',3,'',0)]);const buf=Buffer.concat([Buffer.from([0x49,0x44,0x33,3,0,0x40]),ss(body.length),body]);const t=T.parseID3(new Uint8Array(buf));ok('v2.3 با extended header',eq(await cov(t),jpg))}
 {const f=apic(4,jpg,'image/jpeg',3,'',0);f[9]=0x01;const inner=f.subarray(10);const dli=ss(inner.length);const fr=Buffer.concat([f.subarray(0,10),dli,inner]);fr.writeUInt8(0,4);ss(inner.length+4).copy(fr,4);const t=T.parseID3(new Uint8Array(tag(4,[fr])));ok('v2.4 با data-length-indicator',eq(await cov(t),jpg))}
 {const body=Buffer.concat([Buffer.from([0]),Buffer.from('JPG'),Buffer.from([3]),Buffer.from('\0'),jpg]);const f=Buffer.concat([Buffer.from('PIC'),Buffer.from([0,0,body.length>>8&255,body.length&255].slice(1)),body]);
  f[3]=0;f[4]=body.length>>8&255;f[5]=body.length&255;const t2=Buffer.concat([Buffer.from([0x49,0x44,0x33,2,0,0]),ss(f.length),f]);const t=T.parseID3(new Uint8Array(t2));ok('v2.2 (PIC)',eq(await cov(t),jpg))}
 {const t=T.parseID3(new Uint8Array(tag(3,[txt(3,'TIT2','سلام',1),txt(3,'TPE1','علی',2),txt(3,'TALB','آلبوم',3),txt(3,'TYER','1399'),txt(3,'TRCK','4/12'),txt(3,'TCON','(13)Pop')])));ok('متن فارسی UTF-16/UTF-16BE/UTF-8 و سال/ترک/سبک',t.title==='سلام'&&t.artist==='علی'&&t.album==='آلبوم'&&t.year==='1399'&&t.track===4&&t.genre==='Pop')}
 {const t=T.parseID3(new Uint8Array(tag(3,[frame(3,'TIT2',Buffer.concat([Buffer.from([0]),Buffer.from('سلام','utf8')]))])));ok('enc=0 با بایت‌های UTF-8 درست خوانده می‌شود',t.title==='سلام')}
 {const t=T.parseID3(new Uint8Array(tag(3,[frame(3,'TIT2',Buffer.concat([Buffer.from([0]),Buffer.from([0xD3,0xE1,0xC7,0xE3])]))])));ok('enc=0 با cp1256 (سلام) درست خوانده می‌شود',t.title==='سلام')}
 {const v1=Buffer.alloc(128);v1.write('TAG');v1.write('Old Title',3);v1.write('Old Artist',33);const t=T.parseV1(new Uint8Array(v1));ok('ID3v1',t.title==='Old Title'&&t.artist==='Old Artist')}
 {const f={name:'ff.mp3',size:fs.statSync('fx/ff.mp3').size,slice:(a,b)=>new Blob([fs.readFileSync('fx/ff.mp3').subarray(a,b)])};const t=await T.readTags(f);const c=await cov(t);
  ok('فایل MP3 واقعی ساخته‌ی ffmpeg: تگ‌ها',t.title==='Real Title'&&t.artist==='Real Artist'&&t.album==='Real Album'&&t.year==='2020');
  let dim='';try{const m=await require('/opt/npm-tools/node_modules/sharp')(c).metadata();dim=m.format+m.width+'x'+m.height}catch(e){dim='ERR'+e.message}
  ok('فایل MP3 واقعی: کاور کامل و قابل‌رمزگشایی ('+dim+')',c&&t.cover.type==='image/png'&&dim==='png96x96')}
 console.log(`\n${pass} PASS / ${fail} FAIL`);process.exit(fail?1:0)})();
