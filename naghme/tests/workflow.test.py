# اعتبارسنجی ساختاری فایل workflow (بدون اجرا روی GitHub). نیازمند PyYAML.
import sys,yaml,re
p=sys.argv[1] if len(sys.argv)>1 else '../.github-template/naghme-android.yml'
raw=open(p,encoding='utf8').read();ok=True
def chk(n,c,d=''):
    global ok;ok&=bool(c);print(('PASS ' if c else 'FAIL ')+n+((' — '+d) if d else ''))
chk('بدون TAB',not re.search(r'\t',raw))
ind=[len(l)-len(l.lstrip(' ')) for l in raw.split('\n') if l.strip() and not l.lstrip().startswith('#')]
chk('تورفتگی‌ها مضرب ۲ هستند',all(i%2==0 for i in ind))
d=yaml.safe_load(raw);on=d.get('on',d.get(True))
chk('کلیدهای اصلی: name/on/jobs',d.get('name')=='naghme-android' and isinstance(on,dict) and isinstance(d.get('jobs'),dict))
chk('push.paths لیست رشته است (نه path)',isinstance(on.get('push',{}).get('paths'),list) and 'path' not in on.get('push',{}) and all(isinstance(x,str) for x in on['push']['paths']))
job=d['jobs']['apk'];st=job['steps']
chk('runs-on و defaults.run.working-directory',job['runs-on']=='ubuntu-latest' and job['defaults']['run']['working-directory']=='naghme')
chk('هر مرحله uses یا run دارد (نه هر دو)',all(('uses' in s)!=('run' in s) for s in st))
chk('with فقط دیکشنری و فقط کنار uses',all(isinstance(s['with'],dict) and 'uses' in s for s in st if 'with' in s))
allkeys=set(k for s in st for k in s)
chk('کلید path فقط داخل with (هیچ path سطح مرحله نیست)','path' not in allkeys and 'paths' not in allkeys,str(sorted(allkeys)))
chk('کلیدهای مجاز مرحله',allkeys<= {'name','uses','with','run','if','id','env','working-directory','continue-on-error','timeout-minutes'},str(sorted(allkeys)))
ups=[s for s in st if s.get('uses','').startswith('actions/upload-artifact')]
chk('دو مرحله‌ی upload-artifact@v4 با name و path',len(ups)==2 and all(u['uses']=='actions/upload-artifact@v4' and 'name' in u['with'] and 'path' in u['with'] for u in ups))
chk('ترتیب: build-web ← cap add ← setup-android ← cap sync ← gradlew',[i for i,s in enumerate(st) if 'build-web' in s.get('run','')][0]<[i for i,s in enumerate(st) if 'cap add' in s.get('run','')][0]<[i for i,s in enumerate(st) if 'setup-android' in s.get('run','')][0]<[i for i,s in enumerate(st) if 'cap sync' in s.get('run','')][0]<[i for i,s in enumerate(st) if 'gradlew' in s.get('run','')][0])
chk('پوشه‌ی android قدیمی پاک می‌شود',any('rm -rf android' in s.get('run','') for s in st))
chk('JDK 17',any(s.get('uses','').startswith('actions/setup-java') and str(s['with']['java-version'])=='17' for s in st))
chk('مرحله‌ی بررسی محتوای APK (پلاگین در dex و وب‌اسِت‌های به‌روز) قبل از آپلود',[i for i,s in enumerate(st) if 'Verify APK' in s.get('name','')]!=[] and [i for i,s in enumerate(st) if 'Verify APK' in s.get('name','')][0]<[i for i,s in enumerate(st) if s.get('name')=='Upload APK'][0] and 'NaghmeStoragePlugin' in [s for s in st if 'Verify APK' in s.get('name','')][0]['run'])
print('\nALL OK' if ok else '\nFAILED');sys.exit(0 if ok else 1)
