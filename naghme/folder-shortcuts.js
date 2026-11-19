/* میان‌بُر پوشه‌های نغمه برای مرورگرهای دارای File System Access API.
   فقط FileSystemHandle ذخیره می‌شود؛ محتوای صوتی/تصویری کپی نمی‌شود. */
(function(g){
'use strict';
const DB='naghme-folder-shortcuts', STORE='folders';
let opening;
function database(){
 if(!opening)opening=new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
 return opening;
}
async function request(mode,fn){
 const d=await database();
 return new Promise((resolve,reject)=>{
  const t=d.transaction(STORE,mode),s=t.objectStore(STORE);let q;
  try{q=fn(s)}catch(e){reject(e);return}
  t.oncomplete=()=>resolve(q&&q.result);t.onerror=()=>reject(t.error);
 });
}
const all=()=>request('readonly',s=>s.getAll());
const put=x=>request('readwrite',s=>s.put(x));
const del=id=>request('readwrite',s=>s.delete(id));
const supported=()=>!!(g.showDirectoryPicker&&g.indexedDB&&g.isSecureContext);
const audio=/\.(mp3|m4a|aac|flac|ogg|opus|wav|wma)$/i;
const video=/\.(mp4|m4v|mkv|webm|mov|avi|3gp|3g2|ts|m2ts|mts|mpg|mpeg|mpe|mpv|m2v|wmv|flv|f4v|ogv|vob|divx|mxf)$/i;
async function scan(rec){
 const files=[];
 async function walk(dir,prefix,depth){
  if(depth>12)return;
  for await(const [name,entry] of dir.entries()){
   const rel=prefix?prefix+'/'+name:name;
   if(entry.kind==='directory'){await walk(entry,rel,depth+1);continue}
   if(!(rec.kind==='music'?audio:video).test(name))continue;
   try{
    const f=await entry.getFile();
    Object.defineProperties(f,{
     webkitRelativePath:{value:rec.name+'/'+rel,configurable:true},
     _naghmeFileHandle:{value:entry,configurable:true},
     _naghmeFolderId:{value:rec.id,configurable:true}
    });
    files.push(f);
   }catch(e){console.warn('[NaghmeFolders] file unavailable',rel,e)}
  }
 }
 await walk(rec.handle,'',0);
 return files;
}
async function pick(kind){
 if(!supported())throw new Error('این مرورگر میان‌بُر پوشه را پشتیبانی نمی‌کند؛ از انتخاب پوشهٔ معمولی استفاده کنید.');
 const handle=await g.showDirectoryPicker({id:'naghme-'+kind,mode:'read'});
 try{if(g.navigator&&g.navigator.storage&&g.navigator.storage.persist)await g.navigator.storage.persist()}catch(e){console.warn('[NaghmeFolders] persistent storage request unavailable',e)}
 const rec={id:kind+':'+Date.now().toString(36)+':'+Math.random().toString(36).slice(2,7),kind,name:handle.name||'پوشه',handle,added:Date.now()};
 await put(rec);
 return {record:rec,files:await scan(rec)};
}
async function permission(rec,ask){
 try{
  let p=await rec.handle.queryPermission({mode:'read'});
  if(p!=='granted'&&ask)p=await rec.handle.requestPermission({mode:'read'});
  return p;
 }catch(e){return 'denied'}
}
async function restore(kind){
 const records=(await all()).filter(x=>x.kind===kind),files=[],pending=[];
 for(const rec of records){
  const p=await permission(rec,false);
  if(p==='granted'){
   try{files.push(...await scan(rec))}catch(e){pending.push({id:rec.id,name:rec.name,error:String(e)})}
  }else pending.push({id:rec.id,name:rec.name,permission:p});
 }
 return {files,pending,records};
}
async function reconnect(id){
 const rec=(await all()).find(x=>x.id===id);
 if(!rec)throw new Error('میان‌بُر پوشه پیدا نشد.');
 const p=await permission(rec,true);
 if(p!=='granted')throw new Error('اجازهٔ دسترسی به پوشه داده نشد.');
 return {record:rec,files:await scan(rec)};
}
async function remove(id){return del(id)}
async function list(kind){return (await all()).filter(x=>!kind||x.kind===kind).map(({handle,...x})=>x)}
g.NaghmeFolderShortcuts={supported,pick,restore,reconnect,remove,list};
})(typeof window!=='undefined'?window:globalThis);
