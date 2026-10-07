(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const audio = $('#audio');
  const els = {
    list: $('#libraryList'), empty: $('#emptyState'), search: $('#searchInput'), filter: $('#filterSelect'), category: $('#categorySelect'), sort: $('#sortSelect'), count: $('#libraryCount'),
    cover: $('#albumCover'), title: $('#songTitle'), artist: $('#songArtist'), source: $('#sourceBadge'), format: $('#formatBadge'),
    progress: $('#progressBar'), fill: $('#progressFill'), current: $('#currentTime'), duration: $('#duration'),
    play: $('#playBtn'), prev: $('#prevBtn'), next: $('#nextBtn'), shuffle: $('#shuffleBtn'), repeat: $('#repeatBtn'),
    volume: $('#volumeSlider'), mute: $('#muteBtn'), favBtn: $('#currentFavBtn'), favCount: $('#favCount'),
    recent: $('#recentList'), queue: $('#queueList'), drawer: $('#queueDrawer'), toast: $('#toast'),
    sleepPanel: $('#sleepPanel'), sleepStatus: $('#sleepStatus'), speed: $('#speedSelect'), theme: $('#themeBtn'),
    install: $('#installBtn'), network: $('#networkStatus'), visualizer: $('#visualizer'), visualizerBox: $('#visualizerBox')
  };
  const KEY='diyar_player_v1_2';
  const DB='diyar_player_media_v1';
  const defaults={index:0,time:0,volume:.8,repeat:'none',shuffle:false,favorites:[],recent:[],theme:'dark',speed:1,wasPlaying:false};
  let state=loadState(), playlist=[], currentIndex=0, isDragging=false, sleepTimer=null, deferredInstall=null;
  let dbPromise=null, audioCtx=null, analyser=null, sourceNode=null, raf=0, lastSavedSecond=-1;

  function loadState(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify({...state,index:currentIndex,time:audio.currentTime,wasPlaying:!audio.paused}))}catch{}}
  function toast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),2200)}
  function time(v){if(!Number.isFinite(v)||v<0)return'0:00';const m=Math.floor(v/60),s=Math.floor(v%60);return `${m}:${String(s).padStart(2,'0')}`}
  function cover(song){return song?.cover||'covers/default-cover.png'}
  function id(song){return song?.id||song?.file||`${song?.title||''}|${song?.artist||''}`}
  function fav(song){return !!song&&state.favorites.includes(id(song))}
  function current(){return playlist[currentIndex]}
  function normalizeSong(s,source='دیار',local=false){return {...s,id:s.id||s.file||(window.crypto?.randomUUID?crypto.randomUUID():`local-${Date.now()}-${Math.random().toString(36).slice(2)}`),source,local,cover:s.cover||'covers/default-cover.png',title:s.title||'بدون عنوان',artist:s.artist||'ناشناخته',album:s.album||'دیار قدمگاه',category:s.category||'عمومی',type:s.type||'audio/mpeg'}}
  function esc(v){return String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}

  function openDB(){
    if(!('indexedDB' in window))return Promise.resolve(null);
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(resolve=>{
      const r=indexedDB.open(DB,1);
      r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('files'))db.createObjectStore('files',{keyPath:'id'})};
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>resolve(null);
    });
    return dbPromise;
  }
  async function getLocalFiles(){const db=await openDB();if(!db)return[];return new Promise(resolve=>{const t=db.transaction('files','readonly'),s=t.objectStore('files'),q=s.getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>resolve([])})}
  async function saveLocalFile(song,blob){const db=await openDB();if(!db)return;return new Promise(resolve=>{const t=db.transaction('files','readwrite');t.objectStore('files').put({id:song.id,title:song.title,artist:song.artist,type:song.type,blob,updated:Date.now()});t.oncomplete=resolve;t.onerror=resolve})}
  async function deleteLocalFile(id){const db=await openDB();if(!db)return;return new Promise(resolve=>{const t=db.transaction('files','readwrite');t.objectStore('files').delete(id);t.oncomplete=resolve;t.onerror=resolve})}

  async function loadPlaylist(){
    try{const r=await fetch('playlist.json',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();playlist=(Array.isArray(data)?data:[]).map(s=>normalizeSong(s));}
    catch{playlist=[];toast('کتابخانه آنلاین در دسترس نیست')}
    const locals=await getLocalFiles();
    locals.forEach(x=>{x.file=URL.createObjectURL(x.blob);x.source='من';x.local=true;x.cover='covers/default-cover.png';playlist.push(normalizeSong(x,'من',true))});
    if(!playlist.length){render();return}
    currentIndex=Math.min(Math.max(0,Number(state.index)||0),playlist.length-1);
    render();loadSong(currentIndex,false);
  }
  function filtered(){const q=els.search.value.trim().toLowerCase(),f=els.filter.value,c=els.category.value,sort=els.sort.value;let items=playlist.map((s,i)=>({s,i})).filter(({s})=>{const text=`${s.title} ${s.artist} ${s.album||''} ${s.category||''}`.toLowerCase();if(q&&!text.includes(q))return false;if(f==='favorites'&&!fav(s))return false;if(f==='recent'&&!state.recent.includes(id(s)))return false;if(f==='local'&&!s.local)return false;if(c!=='all'&&(s.category||'عمومی')!==c)return false;return true});if(sort==='title')items.sort((a,b)=>a.s.title.localeCompare(b.s.title,'fa'));if(sort==='artist')items.sort((a,b)=>a.s.artist.localeCompare(b.s.artist,'fa'));if(sort==='recent')items.sort((a,b)=>{const ai=state.recent.indexOf(id(a.s)),bi=state.recent.indexOf(id(b.s));return (ai<0?9999:ai)-(bi<0?9999:bi)});return items}
  function renderCategories(){const current=els.category.value;const cats=[...new Set(playlist.map(s=>s.category||'عمومی'))].sort((a,b)=>a.localeCompare(b,'fa'));els.category.innerHTML='<option value="all">همه دسته‌ها</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');els.category.value=cats.includes(current)?current:'all'}
  function render(){
    renderCategories();const items=filtered();els.count.textContent=`${playlist.length} فایل`;els.list.innerHTML='';els.empty.classList.toggle('hidden',items.length>0);
    items.forEach(({s,i})=>{const el=document.createElement('article');el.className='track'+(i===currentIndex?' active':'');el.innerHTML=`<img src="${esc(cover(s))}" alt=""><div><div class="track-title"></div><div class="track-artist"></div></div><div class="track-actions"><button class="play-item" title="پخش">▶</button><button class="fav-item ${fav(s)?'active':''}" title="علاقه‌مندی">${fav(s)?'♥':'♡'}</button>${s.local?'<button class="delete-item" title="حذف فایل شخصی">🗑</button>':''}</div>`;el.querySelector('.track-title').textContent=s.title;el.querySelector('.track-artist').textContent=s.artist+(s.local?' · فایل من':'');el.querySelector('.play-item').onclick=e=>{e.stopPropagation();loadSong(i,true)};el.querySelector('.fav-item').onclick=e=>{e.stopPropagation();toggleFav(s)};const del=el.querySelector('.delete-item');if(del)del.onclick=async e=>{e.stopPropagation();if(!confirm('این فایل شخصی از کتابخانه حذف شود؟'))return;await deleteLocalFile(s.id);if(audio.src===s.file){audio.pause();audio.removeAttribute('src');audio.load()}playlist.splice(i,1);if(currentIndex>=playlist.length)currentIndex=Math.max(0,playlist.length-1);save();render();toast('فایل حذف شد')};el.onclick=()=>loadSong(i,true);els.list.appendChild(el)});
    renderRecent();renderQueue();updateFavCount();updateCurrentFav();
  }
  function renderRecent(){els.recent.innerHTML='';const map=new Map(playlist.map(s=>[id(s),s]));state.recent.slice(0,10).map(x=>map.get(x)).filter(Boolean).forEach(s=>{const e=document.createElement('article');e.className='recent-item';e.innerHTML=`<img src="${esc(cover(s))}" alt=""><strong></strong><small></small>`;e.querySelector('strong').textContent=s.title;e.querySelector('small').textContent=s.artist;e.onclick=()=>loadSong(playlist.indexOf(s),true);els.recent.appendChild(e)})}
  function renderQueue(){els.queue.innerHTML='';playlist.forEach((s,i)=>{const e=document.createElement('div');e.className='queue-item'+(i===currentIndex?' active':'');e.innerHTML=`<img src="${esc(cover(s))}" alt=""><div><strong></strong><small></small></div><button class="small-btn">▶</button>`;e.querySelector('strong').textContent=s.title;e.querySelector('small').textContent=s.artist;e.querySelector('button').onclick=()=>loadSong(i,true);els.queue.appendChild(e)})}
  function updateFavCount(){els.favCount.textContent=state.favorites.length}
  function updateCurrentFav(){const s=current();els.favBtn.classList.toggle('active',!!s&&fav(s));els.favBtn.textContent=!!s&&fav(s)?'♥':'♡'}
  async function shareCurrent(){const s=current();if(!s)return;const url=s.local?location.href:new URL(s.file,location.href).href;const data={title:s.title,text:`${s.title} — ${s.artist}`,url};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(url);toast('لینک کپی شد')}}catch(e){if(e?.name!=='AbortError')toast('اشتراک‌گذاری انجام نشد')}}
  function toggleFav(s){const k=id(s),i=state.favorites.indexOf(k);i>=0?state.favorites.splice(i,1):state.favorites.unshift(k);save();render();toast(i>=0?'از علاقه‌مندی‌ها حذف شد':'به علاقه‌مندی‌ها اضافه شد')}

  function loadSong(i,autoplay){
    if(!playlist.length)return;i=(i+playlist.length)%playlist.length;currentIndex=i;const s=current();const savedIndex=Number(state.index);const savedTime=savedIndex===i?Number(state.time)||0:0;
    audio.pause();audio.src=s.file;audio.playbackRate=Number(state.speed)||1;audio.load();els.cover.src=cover(s);els.cover.onerror=()=>{els.cover.src='covers/default-cover.png'};els.title.textContent=s.title;els.artist.textContent=s.artist;els.source.textContent=s.source==='من'?'فایل من':'دیار';els.format.textContent=(s.type||'audio').split('/').pop().toUpperCase();state.index=i;state.time=savedTime;lastSavedSecond=-1;
    state.recent=[id(s),...state.recent.filter(x=>x!==id(s))].slice(0,20);render();audio.addEventListener('loadedmetadata',restorePosition,{once:true});updateMedia(s);if(autoplay)audio.play().catch(()=>toast('برای پخش دوباره دکمه پخش را بزنید'));
  }
  function restorePosition(){const t=Number(state.time)||0;if(t>0&&t<audio.duration-1)audio.currentTime=t;updateProgress();save()}
  function play(){audio.play().catch(()=>toast('مرورگر اجازه پخش خودکار نداد؛ دکمه پخش را بزنید'))}
  function toggle(){audio.paused?play():audio.pause()}
  function next(){if(!playlist.length)return;if(state.shuffle&&playlist.length>1){let n;do n=Math.floor(Math.random()*playlist.length);while(n===currentIndex);loadSong(n,true);return}if(currentIndex<playlist.length-1){loadSong(currentIndex+1,true)}else if(state.repeat==='all'){loadSong(0,true)}else{audio.pause();audio.currentTime=0;updateProgress()}}
  function prev(){if(audio.currentTime>3){audio.currentTime=0;return}loadSong(currentIndex-1,true)}
  function updateProgress(){const d=audio.duration||0,c=audio.currentTime||0,p=d?Math.min(100,c/d*100):0;els.fill.style.width=p+'%';els.current.textContent=time(c);els.duration.textContent=time(d);els.progress.setAttribute('aria-valuenow',String(Math.round(p)))}
  function seek(clientX){if(!audio.duration)return;const r=els.progress.getBoundingClientRect(),x=Math.max(0,Math.min(1,(clientX-r.left)/r.width));audio.currentTime=x*audio.duration;updateProgress();save()}
  function toggleTheme(){state.theme=state.theme==='dark'?'light':'dark';applyTheme();save()}
  function applyTheme(){document.body.classList.toggle('light',state.theme==='light');els.theme.textContent=state.theme==='light'?'☀':'☾'}
  function setRepeat(){state.repeat=state.repeat==='none'?'all':state.repeat==='all'?'one':'none';els.repeat.textContent=state.repeat==='one'?'🔂':'🔁';els.repeat.classList.toggle('active',state.repeat!=='none');save()}
  function setSleep(min){clearTimeout(sleepTimer);if(!min){els.sleepStatus.textContent='خاموش';return}els.sleepStatus.textContent=`خاموشی در ${min} دقیقه`;sleepTimer=setTimeout(()=>{audio.pause();els.sleepStatus.textContent='خاموش شد';toast('پخش متوقف شد')},min*60000)}

  async function addFiles(files){
    const added=[];
    for(const f of files){if(!f.type.startsWith('audio/')&&!f.type.startsWith('video/'))continue;const song=normalizeSong({title:f.name.replace(/\.[^.]+$/,''),artist:'فایل شخصی',type:f.type},'من',true);song.file=URL.createObjectURL(f);await saveLocalFile(song,f);added.push(song)}
    if(!added.length){toast('فایل رسانه‌ای معتبر انتخاب نشده است');return}playlist.push(...added);state.index=playlist.length-added.length;save();render();loadSong(state.index,true);toast(`${added.length} فایل اضافه و ذخیره شد`)
  }
  function openDrawer(open=true){els.drawer.classList.toggle('open',open);els.drawer.setAttribute('aria-hidden',String(!open))}
  function setupMedia(){if(!('mediaSession'in navigator))return;const safe=(a,fn)=>{try{navigator.mediaSession.setActionHandler(a,fn)}catch{}};safe('play',play);safe('pause',()=>audio.pause());safe('nexttrack',next);safe('previoustrack',prev);safe('seekbackward',d=>audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10)));safe('seekforward',d=>audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(d.seekOffset||10)));safe('seekto',d=>{if(Number.isFinite(d.seekTime))audio.currentTime=Math.min(d.seekTime,audio.duration||d.seekTime)})}
  function updateMedia(s){if(!('mediaSession'in navigator)||!s)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:s.artist,album:s.album||'دیار قدمگاه',artwork:[{src:new URL(cover(s),location.href).href,sizes:'512x512',type:'image/png'}]})}catch{}}

  function setupVisualizer(){
    if(!els.visualizer)return;
    try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();analyser=audioCtx.createAnalyser();analyser.fftSize=128;sourceNode=audioCtx.createMediaElementSource(audio);sourceNode.connect(analyser);analyser.connect(audioCtx.destination);drawVisualizer()}catch{els.visualizerBox?.classList.add('unsupported')}
  }
  function drawVisualizer(){if(!analyser||!els.visualizer)return;const c=els.visualizer,ctx=c.getContext('2d'),dpr=Math.max(1,devicePixelRatio||1);const w=c.clientWidth,h=c.clientHeight;c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);const data=new Uint8Array(analyser.frequencyBinCount);const frame=()=>{analyser.getByteFrequencyData(data);ctx.clearRect(0,0,w,h);const bars=Math.min(32,data.length),gap=3,bw=(w-gap*(bars-1))/bars;for(let i=0;i<bars;i++){const v=data[i]/255,bh=Math.max(3,v*h*.92),x=i*(bw+gap),y=h-bh;ctx.fillStyle=document.body.classList.contains('light')?'rgba(29,112,79,.75)':'rgba(214,173,85,.8)';ctx.fillRect(x,y,bw,bh)}raf=requestAnimationFrame(frame)};cancelAnimationFrame(raf);frame()}

  function updateNetwork(){if(!els.network)return;const online=navigator.onLine;els.network.textContent=online?'● آنلاین':'● آفلاین';els.network.classList.toggle('offline',!online)}
  function setupInstall(){window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;els.install?.classList.remove('hidden')});els.install?.addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;els.install.classList.add('hidden')});window.addEventListener('appinstalled',()=>els.install?.classList.add('hidden'))}

  $('#openFilesBtn').onclick=()=>$('#fileInput').click();$('#fileInput').onchange=e=>{addFiles([...e.target.files]);e.target.value=''};$('#scrollLibraryBtn').onclick=()=>$('#librarySection').scrollIntoView({behavior:'smooth'});
  $('#queueBtn').onclick=()=>openDrawer(true);$('#closeQueueBtn').onclick=()=>openDrawer(false);document.addEventListener('click',e=>{if(els.drawer.classList.contains('open')&&!els.drawer.contains(e.target)&&!$('#queueBtn').contains(e.target))openDrawer(false)});
  els.theme.onclick=toggleTheme;$('#shareBtn').onclick=shareCurrent;els.category.onchange=render;els.sort.onchange=render;$('#favoritesBtn').onclick=()=>{els.filter.value='favorites';render();$('#librarySection').scrollIntoView({behavior:'smooth'})};els.search.oninput=render;els.filter.onchange=render;
  els.play.onclick=toggle;els.next.onclick=next;els.prev.onclick=prev;els.shuffle.onclick=()=>{state.shuffle=!state.shuffle;els.shuffle.classList.toggle('active',state.shuffle);save()};els.repeat.onclick=setRepeat;els.favBtn.onclick=()=>{if(current())toggleFav(current())};
  els.volume.oninput=()=>{audio.volume=Number(els.volume.value);if(audio.volume>0)state.volume=audio.volume;els.mute.textContent=audio.volume?'🔊':'🔇';save()};els.mute.onclick=()=>{if(audio.volume){state.volume=audio.volume;audio.volume=0;els.volume.value=0;els.mute.textContent='🔇'}else{audio.volume=state.volume||.8;els.volume.value=audio.volume;els.mute.textContent='🔊'}save()};
  els.speed.onchange=()=>{state.speed=Number(els.speed.value);audio.playbackRate=state.speed;save()};$('#sleepBtn').onclick=()=>els.sleepPanel.classList.toggle('hidden');els.sleepPanel.querySelectorAll('button').forEach(b=>b.onclick=()=>setSleep(Number(b.dataset.min)));$('#clearRecentBtn').onclick=()=>{state.recent=[];save();render();toast('تاریخچه پاک شد')};
  els.progress.addEventListener('pointerdown',e=>{isDragging=true;els.progress.setPointerCapture?.(e.pointerId);seek(e.clientX)});els.progress.addEventListener('pointermove',e=>{if(isDragging)seek(e.clientX)});els.progress.addEventListener('pointerup',e=>{if(isDragging)seek(e.clientX);isDragging=false});els.progress.addEventListener('pointercancel',()=>isDragging=false);els.progress.addEventListener('keydown',e=>{if(!audio.duration)return;if(e.key==='ArrowLeft')audio.currentTime=Math.max(0,audio.currentTime-5);if(e.key==='ArrowRight')audio.currentTime=Math.min(audio.duration,audio.currentTime+5);updateProgress();save()});
  audio.addEventListener('timeupdate',()=>{if(!isDragging)updateProgress();const sec=Math.floor(audio.currentTime);if(sec>0&&sec%5===0&&sec!==lastSavedSecond){lastSavedSecond=sec;save()}});audio.addEventListener('loadedmetadata',()=>{updateProgress();updateMedia(current())});audio.addEventListener('play',()=>{els.play.textContent='⏸';$('#coverWrap').classList.add('playing');if(audioCtx?.state==='suspended')audioCtx.resume();save()});audio.addEventListener('pause',()=>{els.play.textContent='▶';$('#coverWrap').classList.remove('playing');save()});audio.addEventListener('ended',()=>{if(state.repeat==='one'){audio.currentTime=0;play()}else next()});audio.addEventListener('error',()=>toast('فایل قابل پخش نیست'));
  document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();toggle()}else if(e.key==='ArrowRight'){audio.currentTime=Math.min(audio.duration||0,audio.currentTime+5)}else if(e.key==='ArrowLeft'){audio.currentTime=Math.max(0,audio.currentTime-5)}else if(e.key.toLowerCase()==='n')next()});
  window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);window.addEventListener('resize',()=>drawVisualizer());window.addEventListener('beforeunload',save);
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  applyTheme();updateNetwork();setupInstall();setupMedia();setupVisualizer();audio.volume=Number(state.volume)||.8;els.volume.value=audio.volume;els.speed.value=String(state.speed||1);els.shuffle.classList.toggle('active',!!state.shuffle);els.repeat.textContent=state.repeat==='one'?'🔂':'🔁';els.repeat.classList.toggle('active',state.repeat!=='none');loadPlaylist();
})();
