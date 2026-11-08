/* خواندن تگ ID3 (v2.2 / v2.3 / v2.4 و v1) و استخراج کاور — بدون وابستگی */
(function(g){'use strict';
const latin=(d)=>{let s='';for(const b of d)s+=String.fromCharCode(b);return s};
function dec(d,e){try{
 if(e===1)return new TextDecoder('utf-16').decode(d);           // BOM تعیین‌کننده‌ی ترتیب بایت
 if(e===2)return new TextDecoder('utf-16be').decode(d);
 if(e===3)return new TextDecoder('utf-8').decode(d);
 try{return new TextDecoder('utf-8',{fatal:true}).decode(d)}catch{return new TextDecoder('windows-1256').decode(d)}
}catch{return ''}}
function sniff(d){
 if(d[0]===0xFF&&d[1]===0xD8&&d[2]===0xFF)return 'image/jpeg';
 if(d[0]===0x89&&d[1]===0x50&&d[2]===0x4E&&d[3]===0x47)return 'image/png';
 if(d[0]===0x47&&d[1]===0x49&&d[2]===0x46&&d[3]===0x38)return 'image/gif';
 if(d[0]===0x52&&d[1]===0x49&&d[2]===0x46&&d[3]===0x46&&d[8]===0x57&&d[9]===0x45&&d[10]===0x42&&d[11]===0x50)return 'image/webp';
 return ''}
function unsync(b){const o=new Uint8Array(b.length);let j=0;for(let i=0;i<b.length;i++){o[j++]=b[i];if(b[i]===0xFF&&b[i+1]===0)i++}return o.subarray(0,j)}
const sync4=(b,p)=>((b[p]&127)<<21)|((b[p+1]&127)<<14)|((b[p+2]&127)<<7)|(b[p+3]&127);
const be4=(b,p)=>((b[p]<<24)>>>0)+(b[p+1]<<16)+(b[p+2]<<8)+b[p+3];
const T3={TIT2:'title',TPE1:'artist',TALB:'album',TYER:'year',TDRC:'year',TRCK:'track',TCON:'genre',TCOM:'composer',TEXT:'lyricist'};
const T2={TT2:'title',TP1:'artist',TAL:'album',TYE:'year',TRK:'track',TCO:'genre',TCM:'composer',TXT:'lyricist'};
/* ساختار APIC: enc, mime\0, type, description (به‌اندازه‌ی enc), data */
function parseAPIC(d,v22){
 if(d.length<8)return null;const e=d[0];let i=1,mime='';
 if(v22){mime=latin(d.subarray(1,4));i=4}else{while(i<d.length&&d[i])mime+=String.fromCharCode(d[i++]);i++}
 const type=d[i++];
 if(e===1||e===2){while(i+1<d.length&&(d[i]||d[i+1]))i+=2;i+=2}else{while(i<d.length&&d[i])i++;i++}
 let at=i,m=at<d.length?sniff(d.subarray(at)):'';
 if(!m){ // مرز داده‌ی تصویر با ساختار قابل‌اتکا نبود: جست‌وجوی امضای تصویر
  for(let k=Math.max(0,i-8);k<Math.min(d.length-12,i+600);k++){const mm=sniff(d.subarray(k));if(mm){at=k;m=mm;break}}}
 if(!m)return null;
 const data=d.slice(at);if(data.length<64)return null;
 return {type,mime:m,data}}
const rank=t=>t===3?0:t===0?1:(t===1||t===2)?4:t===4?5:2;
function parseID3(u8){
 const t={};if(u8.length<10||u8[0]!==0x49||u8[1]!==0x44||u8[2]!==0x33)return t;
 const ver=u8[3],fl=u8[5];if(ver<2||ver>4)return t;
 const size=sync4(u8,6);let b=u8.subarray(10,Math.min(u8.length,10+size));
 if(fl&0x80&&ver<4)b=unsync(b);
 let p=0;
 if(fl&0x40&&ver>2){p=ver===4?sync4(b,0):be4(b,0)+4}
 const hl=ver===2?6:10,pics=[];
 while(p+hl<=b.length&&b[p]){
  const id=ver===2?latin(b.subarray(p,p+3)):latin(b.subarray(p,p+4));
  const fs=ver===2?(b[p+3]<<16)|(b[p+4]<<8)|b[p+5]:ver===4?sync4(b,p+4):be4(b,p+4);
  const f1=ver>2?b[p+8]:0,f2=ver>2?b[p+9]:0;
  if(!/^[A-Z0-9]{3,4}$/.test(id)||fs<=0||p+hl+fs>b.length)break;
  let d=b.subarray(p+hl,p+hl+fs);p+=hl+fs;
  let skip=false;
  if(ver===3){if(f2&0xC0)skip=true;else if(f2&0x20)d=d.subarray(1)}            // فشرده/رمزشده رد می‌شود
  if(ver===4){if(f2&0x0C)skip=true;else{let o=0;if(f2&0x40)o+=1;if(f2&0x01)o+=4;d=d.subarray(o);if(f2&0x02)d=unsync(d)}}
  if(skip||!d.length)continue;
  const key=(ver===2?T2:T3)[id];
  if(key){let v=dec(d.subarray(1),d[0]).split('\0')[0].trim();
   if(v){if(key==='year')v=(v.match(/\d{4}/)||[''])[0];else if(key==='track')v=parseInt(v)||0;else if(key==='genre'){const m=v.match(/^\((\d+)\)(.*)$/);v=m?m[2].trim():/^\d+$/.test(v)?'':v}
    if(v!==''&&v!==0&&!t[key])t[key]=v}}
  else if(id==='APIC'||id==='PIC'){try{const a=parseAPIC(d,id==='PIC');if(a)pics.push(a)}catch{}}
 }
 if(pics.length){pics.sort((x,y)=>rank(x.type)-rank(y.type));const a=pics[0];t.cover=new Blob([a.data],{type:a.mime})}
 return t}
function parseV1(u8){const t={};if(u8.length<128)return t;const o=u8.length-128;if(u8[o]!==0x54||u8[o+1]!==0x41||u8[o+2]!==0x47)return t;
 const s=(a,n)=>dec(u8.subarray(o+a,o+a+n),0).replace(/\0.*$/s,'').trim();
 t.title=s(3,30);t.artist=s(33,30);t.album=s(63,30);const y=s(93,4);if(/^\d{4}$/.test(y))t.year=y;if(u8[o+125]===0&&u8[o+126])t.track=u8[o+126];
 Object.keys(t).forEach(k=>{if(!t[k])delete t[k]});return t}
async function readTags(f){let t={};
 try{if(!/\.mp3$/i.test(f.name))return t;
  const h=new Uint8Array(await f.slice(0,10).arrayBuffer());
  if(h[0]===0x49&&h[1]===0x44&&h[2]===0x33){const size=sync4(h,6);if(size>0&&size<32e6)t=parseID3(new Uint8Array(await f.slice(0,10+size).arrayBuffer()))}
  if(!t.title||!t.artist){const v1=parseV1(new Uint8Array(await f.slice(Math.max(0,f.size-128)).arrayBuffer()));for(const k in v1)if(!t[k])t[k]=v1[k]}
 }catch(e){}
 return t}
g.NaghmeTags={readTags,parseID3,parseV1,sniff};
if(typeof module!=='undefined')module.exports=g.NaghmeTags;
})(typeof window!=='undefined'?window:globalThis);
