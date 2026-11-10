# ساخت داده‌ی آزمایشی (نیازمند ffmpeg): python3 make-fixtures.py /مسیر/خروجی
import os,subprocess,struct,sys,shutil
O=sys.argv[1] if len(sys.argv)>1 else '/home/claude/t';os.chdir(O) if os.path.isdir(O) else (os.makedirs(O),os.chdir(O))
R='lib/آرشیو موسیقی'
def sh(*a):subprocess.run(a,check=True,stderr=subprocess.DEVNULL)
os.makedirs('cv',exist_ok=True)
for i,c in enumerate(['red','blue','green','orange','purple','teal']): sh('ffmpeg','-y','-loglevel','error','-f','lavfi','-i',f'color=c={c}:s=500x500','-frames:v','1',f'cv/{i}.jpg')
songs=[('علی رضایی','آلبوم یک',1,'سلام',0),('علی رضایی','آلبوم یک',2,'خداحافظ',0),('علی رضایی','آلبوم دو',1,'باران',1),('Maryam','Night',1,'Moon',2),('Maryam','Night',2,'Sun',2),('Maryam','Night',3,'Star',2),('گروه سرود','',1,'سرود یک',None)]
for k,(ar,al,tr,ti,cv) in enumerate(songs):
    d=f'{R}/خوانندگان/{ar}'+(f'/{al}' if al else '');os.makedirs(d,exist_ok=True)
    cmd=['ffmpeg','-y','-loglevel','error','-f','lavfi','-i',f'sine=frequency={300+k*40}:duration=40']
    if cv is not None: cmd+=['-i',f'cv/{cv}.jpg','-map','0','-map','1','-c:v','copy','-id3v2_version','3']
    cmd+=['-c:a','libmp3lame','-b:a','32k','-metadata',f'title={ti}','-metadata',f'artist={ar}','-metadata',f'track={tr}','-metadata','date=2021']+(['-metadata',f'album={al}'] if al else [])
    sh(*cmd,f'{d}/{k:02d} {ti}.mp3')
os.makedirs(f'{R}/نامشخص',exist_ok=True)
sh('ffmpeg','-y','-loglevel','error','-f','lavfi','-i','sine=frequency=700:duration=5','-c:a','libmp3lame','-map_metadata','-1','-write_id3v2','0','-write_id3v1','0',f'{R}/نامشخص/بی تگ.mp3')
open(f'{R}/نامشخص/خراب.mp3','wb').write(os.urandom(3000))
open(f'{R}/نامشخص/تگ ناقص.mp3','wb').write(b'ID3\x03\x00\x00\x00\x10\x00\x00'+b'TIT2\x00\x00\x00\x50\x00\x00\x03abc')
shutil.copy(f'{R}/خوانندگان/علی رضایی/آلبوم یک/00 سلام.mp3',f'{R}/نامشخص/نسخه تکراری.mp3')
shutil.copy(f'{R}/خوانندگان/Maryam/Night/03 Moon.mp3','moon.mp3')
os.makedirs('lib/Download/حلیه المتقین',exist_ok=True)
sh('ffmpeg','-y','-loglevel','error','-f','lavfi','-i','sine=frequency=500:duration=3','-c:a','libmp3lame','lib/Download/حلیه المتقین/صفحه 1.mp3')
sh('ffmpeg','-y','-loglevel','error','-f','lavfi','-i','sine=frequency=500:duration=3','-c:a','libmp3lame','lib/Download/Voice Note 1.mp3')
open('lib/Download/readme.txt','w').write('x')
os.makedirs('big',exist_ok=True);frame=b'\xff\xfb\x90\x00'+b'\x00'*413
ss=lambda n:bytes([(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127])
def fr(i,t):b=bytes([3])+t.encode();return i+struct.pack('>I',len(b))+b'\x00\x00'+b
for n in range(5000):
    body=fr(b'TIT2',f'Track {n:05d}')+fr(b'TPE1',f'Artist {n%60:02d}')+fr(b'TALB',f'Album {n%300:03d}')+fr(b'TRCK',str(n%12+1))
    open(f'big/t{n:05d}.mp3','wb').write(b'ID3\x03\x00\x00'+ss(len(body))+body+frame*(4+n%9))
# ویدئوی آزمایشی برای tests/iptv.test.js (WebM/VP8 + Vorbis)
os.makedirs('tv',exist_ok=True)
sh('ffmpeg','-y','-loglevel','error','-f','lavfi','-i','testsrc=size=320x180:rate=15:duration=40','-f','lavfi','-i','sine=frequency=440:duration=40','-c:v','libvpx','-b:v','150k','-c:a','libvorbis','-shortest','tv/red.webm')
