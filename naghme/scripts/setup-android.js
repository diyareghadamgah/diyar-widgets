#!/usr/bin/env node
/* پس از «npx cap add android» اجرا می‌شود (و بی‌خطر می‌تواند دوباره اجرا شود):
   ۱) پلاگین بومی و MainActivity  ۲) مجوزهای مانیفست  ۳) minSdk=23 و targetSdk=34 */
const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const cfg=JSON.parse(fs.readFileSync(path.join(root,'capacitor.config.json'),'utf8'));
const pkg=cfg.appId,android=path.join(root,'android'),warn=[];
if(!fs.existsSync(android)){console.error('پوشه‌ی android/ وجود ندارد. ابتدا: npx cap add android');process.exit(1)}
const rd=p=>fs.readFileSync(p,'utf8'),wr=(p,t)=>fs.writeFileSync(p,t);
/* ۱) جاوا */
const jdir=path.join(android,'app/src/main/java',...pkg.split('.'));fs.mkdirSync(jdir,{recursive:true});
const nat=path.join(root,'native/android');
wr(path.join(jdir,'NaghmeStoragePlugin.java'),rd(path.join(nat,'NaghmeStoragePlugin.java')).replace(/^package [^;]+;/m,'package '+pkg+';'));
wr(path.join(jdir,'MainActivity.java'),rd(path.join(nat,'MainActivity.java')).replace(/^package [^;]+;/m,'package '+pkg+';'));
console.log('✓ پلاگین بومی و MainActivity در '+path.relative(root,jdir));
/* اگر قالب کاپاسیتور MainActivity را در بسته‌ای دیگر ساخته باشد، آن را حذف می‌کنیم تا دو MainActivity نداشته باشیم */
const base=path.join(android,'app/src/main/java');
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name==='MainActivity.java'&&path.dirname(p)!==jdir){fs.rmSync(p);warn.push('MainActivity اضافی حذف شد: '+path.relative(root,p))}}})(base);
/* ۲) مانیفست */
const mp=path.join(android,'app/src/main/AndroidManifest.xml');let m=rd(mp);
const PERMS=[
 ['android.permission.INTERNET','<uses-permission android:name="android.permission.INTERNET" />'],
 ['android.permission.READ_EXTERNAL_STORAGE','<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'],
 ['android.permission.READ_MEDIA_AUDIO','<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />']];
for(const [n,line] of PERMS){if(!m.includes(n)){if(!m.includes('</manifest>')){warn.push('مانیفست قابل‌ویرایش نبود: '+n);continue}m=m.replace('</manifest>','    '+line+'\n</manifest>')}}
if(!/android:largeHeap=/.test(m)){if(/<application\b/.test(m))m=m.replace(/<application\b/,'<application\n        android:largeHeap="true"');else warn.push('تگ application پیدا نشد (largeHeap اعمال نشد)')}
wr(mp,m);console.log('✓ مجوزهای مانیفست (INTERNET، READ_EXTERNAL_STORAGE≤۳۲، READ_MEDIA_AUDIO) + largeHeap');
/* ۳) Gradle */
const vp=path.join(android,'variables.gradle');
if(fs.existsSync(vp)){let v=rd(vp);
 const setv=(key,val,atLeast)=>{const re=new RegExp('('+key+'\\s*=\\s*)(\\d+)');if(!re.test(v)){warn.push(key+' در variables.gradle پیدا نشد');return}v=v.replace(re,(_,a,b)=>a+(atLeast?Math.max(+b,val):val))};
 setv('minSdkVersion',23,false);setv('targetSdkVersion',34,false);setv('compileSdkVersion',34,true);wr(vp,v);
 console.log('✓ variables.gradle: minSdk=23، targetSdk=34، compileSdk≥34')}
else warn.push('variables.gradle پیدا نشد؛ minSdk/targetSdk را دستی تنظیم کنید');
for(const w of warn)console.warn('⚠ '+w);
console.log('انجام شد. بعدی: npx cap sync android  سپس  cd android && ./gradlew assembleDebug');
