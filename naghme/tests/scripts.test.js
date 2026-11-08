// آزمون اسکریپت‌های راه‌اندازی (Node). اسکلت android/ از روی قالب Capacitor 6 ساخته می‌شود؛ قالب واقعی در این محیط (بدون اینترنت) در دسترس نبود.
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const proj=path.resolve(__dirname,'..');let pass=0,fail=0;
const ok=(n,c,d='')=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(d?' — '+d:''))};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'nag-'));
fs.cpSync(path.join(proj,'native'),path.join(tmp,'native'),{recursive:true});
fs.copyFileSync(path.join(proj,'capacitor.config.json'),path.join(tmp,'capacitor.config.json'));
const A=path.join(tmp,'android');fs.mkdirSync(path.join(A,'app/src/main/java/com/example/old'),{recursive:true});
fs.writeFileSync(path.join(A,'app/src/main/java/com/example/old/MainActivity.java'),'package com.example.old;\nimport com.getcapacitor.BridgeActivity;\npublic class MainActivity extends BridgeActivity {}\n');
fs.writeFileSync(path.join(A,'app/src/main/AndroidManifest.xml'),`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
    </application>

    <!-- Permissions -->

    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
`);
fs.writeFileSync(path.join(A,'variables.gradle'),`ext {
    minSdkVersion = 22
    compileSdkVersion = 34
    targetSdkVersion = 33
    androidxActivityVersion = '1.8.0'
}`);
const run=()=>cp.spawnSync('node',[path.join(proj,'scripts/setup-android.js'),tmp],{encoding:'utf8'});
let r=run();ok('setup-android: اجرای اول موفق',r.status===0,r.stderr.trim().slice(0,150));
const man=()=>fs.readFileSync(path.join(A,'app/src/main/AndroidManifest.xml'),'utf8'),vg=()=>fs.readFileSync(path.join(A,'variables.gradle'),'utf8');
const jd=path.join(A,'app/src/main/java/ir/diyareghadamgah/naghme');
ok('پلاگین و MainActivity در مسیر بسته‌ی appId',fs.existsSync(jd+'/NaghmeStoragePlugin.java')&&fs.existsSync(jd+'/MainActivity.java')&&/^package ir\.diyareghadamgah\.naghme;/m.test(fs.readFileSync(jd+'/MainActivity.java','utf8')));
ok('MainActivity قدیمیِ قالب حذف شد (فقط یکی می‌ماند)',!fs.existsSync(path.join(A,'app/src/main/java/com/example/old/MainActivity.java')));
ok('MainActivity پلاگین را ثبت می‌کند',/registerPlugin\(NaghmeStoragePlugin\.class\)/.test(fs.readFileSync(jd+'/MainActivity.java','utf8')));
const m=man();ok('مجوزها: INTERNET یک‌بار، READ_EXTERNAL_STORAGE با maxSdk 32، READ_MEDIA_AUDIO',(m.match(/permission\.INTERNET/g)||[]).length===1&&/READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/.test(m)&&/READ_MEDIA_AUDIO/.test(m)&&/largeHeap="true"/.test(m));
const v=vg();ok('Gradle: minSdk=23، targetSdk=34، compileSdk=34',/minSdkVersion = 23/.test(v)&&/targetSdkVersion = 34/.test(v)&&/compileSdkVersion = 34/.test(v));
const before=man()+vg();r=run();ok('اجرای دوم (idempotent): هیچ تغییر و تکراری ایجاد نمی‌شود',r.status===0&&before===man()+vg()&&(man().match(/READ_MEDIA_AUDIO/g)||[]).length===1&&(man().match(/largeHeap/g)||[]).length===1);
fs.rmSync(path.join(tmp,'android'),{recursive:true});r=run();ok('بدون پوشه‌ی android: خطای واضح',r.status!==0&&/npx cap add android/.test(r.stderr));
// build-web
const w=path.join(os.tmpdir(),'nagw-'+Date.now());fs.mkdirSync(w);for(const f of fs.readdirSync(proj))if(/\.(html|js|json|png|css)$/.test(f)&&!['package.json'].includes(f)||f==='fonts')fs.cpSync(path.join(proj,f),path.join(w,f),{recursive:true});
r=cp.spawnSync('node',[path.join(proj,'scripts/build-web.js'),w],{encoding:'utf8'});const L=fs.existsSync(w+'/www')?fs.readdirSync(w+'/www'):[];
ok('build-web: همه‌ی ۱۱ فایل لازم در www',r.status===0&&['index.html','app.js','tags.js','platform.js','style.css','manifest.json','sw.js','icon-192.png','icon-512.png','icon-maskable-512.png','favicon.png'].every(f=>L.includes(f)),L.length+' files');
fs.rmSync(w+'/www/platform.js');fs.rmSync(w+'/platform.js');r=cp.spawnSync('node',[path.join(proj,'scripts/build-web.js'),w],{encoding:'utf8'});ok('build-web: فایل ناموجود گزارش می‌شود',r.status!==0&&/platform\.js/.test(r.stderr));
const cc=JSON.parse(fs.readFileSync(path.join(proj,'capacitor.config.json'),'utf8'));ok('capacitor.config.json: appId، نام، webDir',cc.appId==='ir.diyareghadamgah.naghme'&&cc.appName==='نغمه'&&cc.webDir==='www');
const pk=JSON.parse(fs.readFileSync(path.join(proj,'package.json'),'utf8'));ok('package.json: وابستگی‌های Capacitor',!!pk.dependencies['@capacitor/core']&&!!pk.dependencies['@capacitor/android']&&!!pk.devDependencies['@capacitor/cli']);
console.log(`\n${pass} PASS / ${fail} FAIL`);process.exit(fail?1:0);
