/* لایه‌ی انتزاعی پلتفرم نغمه
   • وب (PWA): بدون هیچ تغییر؛ انتخاب فایل همان <input type="file"> قبلی است.
   • Capacitor/اندروید: پلاگین بومی «NaghmeStorage» (SAF) — دسترسی دائمی با takePersistableUriPermission.
   بدون وابستگی و بدون bundler: در اندروید، Capacitor خودش window.Capacitor را تزریق می‌کند. */
(function(g){'use strict';
const C=g.Capacitor,isNative=!!(C&&typeof C.isNativePlatform==='function'&&C.isNativePlatform());
const P={isNative,plugin:null};
/* دریافت تنبل و چندمرحله‌ای پلاگین. دلیل: در اندروید «بدون bundler» ممکن است Capacitor.registerPlugin اصلاً تعریف نشده باشد
   (آن تابع بخشی از جاوااسکریپت @capacitor/core است که فقط با bundler وارد برنامه می‌شود)، اما پل بومی همیشه
   Capacitor.Plugins.<نام> و Capacitor.nativePromise را می‌سازد. ترتیب:
   ۱) Capacitor.Plugins.NaghmeStorage   ۲) Capacitor.registerPlugin('NaghmeStorage')   ۳) Capacitor.nativePromise('NaghmeStorage', متد, گزینه‌ها)
   هرگز null کش نمی‌شود؛ اگر هیچ‌کدام نبود، خطای NaghmeStorage_not_registered همراه با اطلاعات تشخیصی پرتاب می‌شود. */
const has=p=>!!p&&typeof p.pickDirectory==='function';
function viaNativePromise(C2){if(!C2||typeof C2.nativePromise!=='function')return null;
 return new Proxy({},{get:(_,m)=>typeof m==='string'&&m!=='then'?o=>C2.nativePromise('NaghmeStorage',m,o||{}):undefined})}
function plug(){if(P.plugin)return P.plugin;const C2=g.Capacitor;let p=null;
 try{p=C2&&C2.Plugins&&C2.Plugins.NaghmeStorage}catch{}
 if(!has(p)){p=null;try{if(C2&&typeof C2.registerPlugin==='function'){const r=C2.registerPlugin('NaghmeStorage');if(has(r))p=r}}catch(e){console.warn('registerPlugin',e)}}
 if(!has(p)){try{p=viaNativePromise(C2)}catch{p=null}}
 if(!p){const e=new Error('NaghmeStorage_not_registered');e.diag=P.diagnose();throw e}
 return P.plugin=p}
P.getPlugin=plug;
P.diagnose=()=>{const C2=g.Capacitor||{};let keys=[],hdr=[],pk=[];
 try{keys=Object.keys(C2).slice(0,40)}catch{}try{pk=Object.keys(C2.Plugins||{})}catch{}try{hdr=(C2.PluginHeaders||[]).map(h=>h&&h.name)}catch{}
 return {native:isNative,platform:C2.getPlatform?C2.getPlatform():null,registerPlugin:typeof C2.registerPlugin==='function',nativePromise:typeof C2.nativePromise==='function',
  pluginsEntry:!!(C2.Plugins&&C2.Plugins.NaghmeStorage),pluginsKeys:pk,headerNames:hdr,inHeaders:hdr.includes('NaghmeStorage'),ready:!!P.plugin,capacitorKeys:keys}};
P.ping=async()=>{try{return await plug().ping()}catch(e){return {error:String(e&&e.message||e)}}};
/* آدرس قابل‌استفاده در WebView برای یک uri بومی (Capacitor.convertFileSrc). پخش پیش‌فرض نغمه همچنان Blob است؛ این تابع برای استفاده‌ی مستقیم/آزمایشی است. */
P.fileUrl=uri=>{try{return C&&typeof C.convertFileSrc==='function'?C.convertFileSrc(uri):uri}catch{return uri}};
const CH=1048576,MIME={mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',flac:'audio/flac',ogg:'audio/ogg',opus:'audio/ogg',wav:'audio/wav',wma:'audio/x-ms-wma'};
function b64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
async function readRange(uri,a,b){const parts=[];let pos=a,total=0;
 while(pos<b){const len=Math.min(CH,b-pos),r=await plug().readChunk({uri,offset:pos,length:len});const u=b64(r.data||'');if(!u.length)break;parts.push(u);pos+=u.length;total+=u.length;if(u.length<len)break}
 const out=new Uint8Array(total);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out.buffer}
const cache=new Map();      // حافظه‌ی کوتاه‌مدت: حداکثر ۲ آهنگ اخیر (پخش دوباره و جست‌وجو بدون خواندن مجدد)
class NativeFile{
 constructor(m){this.name=m.name;this.size=+m.size||0;this.lastModified=+m.lastModified||0;this.webkitRelativePath=m.path||m.name;this.uri=m.uri;this.tree=m.tree||'';this.native=true}
 slice(a=0,b){const s=this,e=Math.min(b===undefined?s.size:b,s.size);return {arrayBuffer:()=>readRange(s.uri,Math.max(0,a),e)}}
 async toBlob(){const c=cache.get(this.uri);if(c)return c;
  const ext=(this.name.split('.').pop()||'').toLowerCase(),buf=await readRange(this.uri,0,this.size);
  if(this.size&&buf.byteLength<this.size)throw new Error('read_incomplete');
  const b=new Blob([buf],{type:MIME[ext]||'audio/mpeg'});cache.set(this.uri,b);while(cache.size>2)cache.delete(cache.keys().next().value);return b}
 async arrayBuffer(){return (await this.toBlob()).arrayBuffer()}
}
const wrap=(items,tree)=>items.map(m=>new NativeFile({...m,path:(tree&&tree.name?tree.name+'/':'')+(m.rel||m.name),tree:tree?tree.uri:''}));
P.NativeFile=NativeFile;
P.fromSong=s=>s&&s.uri?new NativeFile({name:s.name,size:s.size,uri:s.uri,path:s.path,tree:s.tree}):null;
P.pickFolder=async()=>{const t=await plug().pickDirectory();if(!t||t.cancelled||!t.uri)return null;const tree={uri:t.uri,name:t.name||'پوشه'};const r=await plug().listAudio({uri:tree.uri});return {tree,files:wrap(r.files||[],tree)}};
P.rescan=async tree=>{const r=await plug().listAudio({uri:tree.uri});return wrap(r.files||[],tree)};
P.pickFiles=async()=>{const r=await plug().pickFiles();if(!r||r.cancelled)return null;return wrap(r.files||[],null)};
P.persisted=async()=>{try{return (await plug().getPersisted()).trees||[]}catch{return []}};
P.releaseTree=async uri=>plug().releaseTree({uri});
P.duration=async f=>{try{const r=await plug().duration({uri:f.uri});return typeof r.duration==='number'&&isFinite(r.duration)?r.duration:null}catch{return null}};
g.NaghmePlatform=P;
})(typeof window!=='undefined'?window:globalThis);
