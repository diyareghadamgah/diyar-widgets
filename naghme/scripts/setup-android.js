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
/* بررسی ثبت پلاگین: registerPlugin باید قبل از super.onCreate باشد، و هیچ ارجاع قدیمی به FilePicker نماند */
{const ma=rd(path.join(jdir,'MainActivity.java')).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,''),i1=ma.indexOf('registerPlugin(NaghmeStoragePlugin.class)'),i2=ma.indexOf('super.onCreate');   // کامنت‌ها نادیده گرفته می‌شوند
 if(i1<0||i2<0||i1>i2){console.error('✗ MainActivity: registerPlugin(NaghmeStoragePlugin.class) باید قبل از super.onCreate باشد');process.exit(1)}}
{const hits=[],re=/file-picker|FilePicker|capawesome/i;
 const scan=p=>{if(!fs.existsSync(p))return;const st=fs.statSync(p);if(st.isDirectory()){for(const e of fs.readdirSync(p)){if(['build','.gradle','node_modules'].includes(e))continue;scan(path.join(p,e))}}else if(/\.(java|kt|gradle|json|xml|properties)$/.test(p)&&re.test(rd(p)))hits.push(path.relative(root,p))};
 scan(path.join(root,'package.json'));scan(path.join(android,'app/src/main'));scan(path.join(android,'capacitor.settings.gradle'));scan(path.join(android,'app/capacitor.build.gradle'));
 if(hits.length){console.error('✗ آثار قدیمیِ FilePicker/capawesome پیدا شد (پوشه‌ی android قدیمی یا package.json قدیمی):\n  '+hits.join('\n  ')+'\n  راه‌حل: پوشه‌ی android را پاک کنید (rm -rf android) و دوباره npm run android:add');process.exit(1)}
 console.log('✓ بررسی ثبت پلاگین و نبود FilePicker')}
/* namespace گریدل باید با appId یکی باشد، وگرنه «.MainActivity» در مانیفست به کلاس دیگری اشاره می‌کند */
{const bg=path.join(android,'app/build.gradle');if(fs.existsSync(bg)){const m=rd(bg).match(/namespace\s*=?\s*["']([^"']+)["']/);
 if(m&&m[1]!==pkg){console.error('✗ namespace در android/app/build.gradle ('+m[1]+') با appId ('+pkg+') یکی نیست؛ capacitor.config.json را اصلاح و پوشه‌ی android را پاک کنید');process.exit(1)}
 else if(m)console.log('✓ namespace = appId ('+pkg+')');else warn.push('namespace در build.gradle پیدا نشد')}}
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
