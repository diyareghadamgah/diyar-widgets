/* ============================================
   script.js — Complete Music Player Logic
   ============================================ */

(function() {
    'use strict';

    // ---------- DOM References ----------
    const audio = new Audio();
    audio.preload = 'metadata';
    const albumCover = document.getElementById('albumCover');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const muteBtn = document.getElementById('muteBtn');
    const playlistToggle = document.getElementById('playlistToggle');
    const playlistDrawer = document.getElementById('playlistDrawer');
    const closePlaylist = document.getElementById('closePlaylist');
    const playlistList = document.getElementById('playlistList');
    const favoritesBtn = document.getElementById('favoritesBtn');
    const favCount = document.getElementById('favCount');
    const recentlyPlayed = document.getElementById('recentlyPlayed');
    const recentList = document.getElementById('recentList');
    const miniPlayer = document.getElementById('miniPlayer');
    const miniCover = document.getElementById('miniCover');
    const miniTitle = document.getElementById('miniTitle');
    const miniArtist = document.getElementById('miniArtist');
    const miniPlayBtn = document.getElementById('miniPlayBtn');
    const miniNextBtn = document.getElementById('miniNextBtn');
    const miniExpandBtn = document.getElementById('miniExpandBtn');
    const albumRing = document.getElementById('albumRing');
    const eqOverlay = document.getElementById('eqOverlay');
    const mainContent = document.getElementById('mainContent');

    // ---------- State ----------
    let playlist = [];
    let currentIndex = 0;
    let isPlaying = false;
    let isShuffled = false;
    let repeatMode = 'none'; // 'none', 'one', 'all'
    let favorites = [];
    let recentlyPlayedList = [];
    let isDragging = false;
    let isMuted = false;
    let previousVolume = 0.8;

    // ---------- Constants ----------
    const STORAGE_KEYS = {
        currentIndex: 'player_currentIndex',
        currentTime: 'player_currentTime',
        volume: 'player_volume',
        repeat: 'player_repeat',
        shuffle: 'player_shuffle',
        favorites: 'player_favorites',
        recentlyPlayed: 'player_recentlyPlayed'
    };

    // ---------- Utility Functions ----------
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function debounce(fn, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function throttle(fn, limit) {
        let inThrottle = false;
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ---------- Storage ----------
    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEYS.currentIndex, String(currentIndex));
            localStorage.setItem(STORAGE_KEYS.currentTime, String(audio.currentTime));
            localStorage.setItem(STORAGE_KEYS.volume, String(audio.volume));
            localStorage.setItem(STORAGE_KEYS.repeat, repeatMode);
            localStorage.setItem(STORAGE_KEYS.shuffle, String(isShuffled));
            localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
            localStorage.setItem(STORAGE_KEYS.recentlyPlayed, JSON.stringify(recentlyPlayedList.slice(0, 20)));
        } catch (e) { /* ignore */ }
    }

    function loadState() {
        try {
            const idx = localStorage.getItem(STORAGE_KEYS.currentIndex);
            if (idx !== null) currentIndex = parseInt(idx, 10) || 0;
            const time = localStorage.getItem(STORAGE_KEYS.currentTime);
            if (time !== null) audio.currentTime = parseFloat(time) || 0;
            const vol = localStorage.getItem(STORAGE_KEYS.volume);
            if (vol !== null) audio.volume = parseFloat(vol) || 0.8;
            const rep = localStorage.getItem(STORAGE_KEYS.repeat);
            if (rep !== null && ['none', 'one', 'all'].includes(rep)) repeatMode = rep;
            const shuf = localStorage.getItem(STORAGE_KEYS.shuffle);
            if (shuf !== null) isShuffled = shuf === 'true';
            const favs = localStorage.getItem(STORAGE_KEYS.favorites);
            if (favs) favorites = JSON.parse(favs) || [];
            const recent = localStorage.getItem(STORAGE_KEYS.recentlyPlayed);
            if (recent) recentlyPlayedList = JSON.parse(recent) || [];
        } catch (e) { /* ignore */ }
    }

    // ---------- Playlist Management ----------
    function loadPlaylist() {
        fetch('playlist.json')
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                playlist = data;
                if (!playlist.length) {
                    playlist = [{
                        title: 'آهنگ نمونه',
                        artist: 'خواننده نمونه',
                        cover: 'covers/c.png',
                        file: 'music/1.mp3'
                    }];
                }
                renderPlaylist();
                renderRecentlyPlayed();
                updateFavBadge();
                // Ensure currentIndex is valid
                if (currentIndex >= playlist.length) currentIndex = 0;
                loadSong(currentIndex);
                // Restore playback state after load
                if (audio.currentTime > 0 && audio.paused) {
                    // If we have a saved time but not playing, just update UI
                    updateProgress();
                }
                // Register service worker
                registerSW();
                // Setup Media Session
                setupMediaSession();
            })
            .catch(err => {
                console.warn('Failed to load playlist, using fallback:', err);
                playlist = [{
                    title: 'آهنگ نمونه',
                    artist: 'خواننده نمونه',
                    cover: 'covers/c.png',
                    file: 'music/1.mp3'
                }];
                renderPlaylist();
                renderRecentlyPlayed();
                updateFavBadge();
                loadSong(0);
                registerSW();
                setupMediaSession();
            });
    }

    function loadSong(index) {
        if (!playlist.length) return;
        if (index < 0) index = playlist.length - 1;
        if (index >= playlist.length) index = 0;
        currentIndex = index;
        const song = playlist[currentIndex];
        audio.src = song.file;
        audio.load();
        // Update UI
        albumCover.src = song.cover || 'covers/c.png';
        songTitle.textContent = song.title || 'بی‌عنوان';
        songArtist.textContent = song.artist || 'ناشناس';
        miniCover.src = song.cover || 'covers/c.png';
        miniTitle.textContent = song.title || 'بی‌عنوان';
        miniArtist.textContent = song.artist || 'ناشناس';
        // Highlight active playlist item
        document.querySelectorAll('.playlist-item').forEach((el, i) => {
            el.classList.toggle('active', i === currentIndex);
        });
        // Update progress
        updateProgress();
        // Save state
        saveState();
        // Add to recently played (if not already first)
        addRecentlyPlayed(song);
        // Update Media Session metadata
        updateMediaMetadata(song);
        // If audio was playing, resume
        if (isPlaying) {
            audio.play().catch(e => console.warn('Autoplay blocked?', e));
        }
    }

    function addRecentlyPlayed(song) {
        // Remove duplicates
        recentlyPlayedList = recentlyPlayedList.filter(s => s.file !== song.file);
        recentlyPlayedList.unshift(song);
        if (recentlyPlayedList.length > 20) recentlyPlayedList.pop();
        renderRecentlyPlayed();
        saveState();
    }

    // ---------- Render Functions ----------
    function renderPlaylist() {
        playlistList.innerHTML = '';
        playlist.forEach((song, index) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            if (index === currentIndex) li.classList.add('active');
            li.setAttribute('role', 'listitem');
            li.dataset.index = index;

            const img = document.createElement('img');
            img.src = song.cover || 'covers/c.png';
            img.alt = 'جلد';
            img.loading = 'lazy';

            const info = document.createElement('div');
            info.className = 'pl-info';
            const titleSpan = document.createElement('div');
            titleSpan.className = 'pl-title';
            titleSpan.textContent = song.title || 'بی‌عنوان';
            const artistSpan = document.createElement('div');
            artistSpan.className = 'pl-artist';
            artistSpan.textContent = song.artist || 'ناشناس';
            info.appendChild(titleSpan);
            info.appendChild(artistSpan);

            const favBtn = document.createElement('span');
            favBtn.className = 'pl-fav';
            favBtn.textContent = favorites.includes(song.file) ? '♥' : '♡';
            favBtn.setAttribute('role', 'button');
            favBtn.setAttribute('aria-label', 'افزودن به علاقه‌مندی‌ها');
            favBtn.dataset.file = song.file;

            li.appendChild(img);
            li.appendChild(info);
            li.appendChild(favBtn);

            // Click on item -> load song
            li.addEventListener('click', (e) => {
                if (e.target.closest('.pl-fav')) return;
                const idx = parseInt(li.dataset.index, 10);
                if (!isNaN(idx) && idx !== currentIndex) {
                    loadSong(idx);
                    if (!isPlaying) togglePlay();
                }
                closePlaylistDrawer();
            });

            // Favorite toggle
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(song.file);
            });

            playlistList.appendChild(li);
        });
        updateFavBadge();
    }

    function renderRecentlyPlayed() {
        recentList.innerHTML = '';
        if (!recentlyPlayedList.length) {
            const li = document.createElement('li');
            li.textContent = 'هیچ‌';
            li.style.color = 'var(--text-muted)';
            li.style.fontSize = '0.7rem';
            recentList.appendChild(li);
            return;
        }
        recentlyPlayedList.slice(0, 10).forEach(song => {
            const li = document.createElement('li');
            li.setAttribute('role', 'listitem');
            const img = document.createElement('img');
            img.src = song.cover || 'covers/c.png';
            img.alt = 'جلد';
            img.loading = 'lazy';
            const span = document.createElement('span');
            span.textContent = song.title || 'بی‌عنوان';
            li.appendChild(img);
            li.appendChild(span);
            li.addEventListener('click', () => {
                const idx = playlist.findIndex(s => s.file === song.file);
                if (idx !== -1) {
                    loadSong(idx);
                    if (!isPlaying) togglePlay();
                }
            });
            recentList.appendChild(li);
        });
    }

    function updateFavBadge() {
        favCount.textContent = favorites.length;
        // Update playlist favorites icons
        document.querySelectorAll('.pl-fav').forEach(el => {
            const file = el.dataset.file;
            el.textContent = favorites.includes(file) ? '♥' : '♡';
        });
        saveState();
    }

    // ---------- Favorite Management ----------
    function toggleFavorite(file) {
        const idx = favorites.indexOf(file);
        if (idx > -1) {
            favorites.splice(idx, 1);
        } else {
            favorites.push(file);
        }
        updateFavBadge();
        // Re-render playlist to update icons
        renderPlaylist();
        // Re-highlight active
        document.querySelectorAll('.playlist-item').forEach((el, i) => {
            el.classList.toggle('active', i === currentIndex);
        });
    }

    // ---------- Audio Controls ----------
    function togglePlay() {
        if (audio.paused) {
            audio.play().catch(e => console.warn('Play blocked:', e));
        } else {
            audio.pause();
        }
    }

    function updatePlayButton() {
        const icon = isPlaying ? '⏸' : '▶';
        playBtn.textContent = icon;
        miniPlayBtn.textContent = icon;
        albumRing.classList.toggle('playing', isPlaying);
        eqOverlay.classList.toggle('active', isPlaying);
        // Media session playback state
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }

    function prevSong() {
        if (playlist.length <= 1) return;
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = playlist.length - 1;
        loadSong(newIndex);
    }

    function nextSong() {
        if (!playlist.length) return;

        // A single track can still repeat in 'all' or 'one' mode.
        if (playlist.length === 1) {
            if (repeatMode === 'all' || repeatMode === 'one') {
                audio.currentTime = 0;
                audio.play().catch(() => {});
            } else {
                audio.pause();
                audio.currentTime = 0;
            }
            return;
        }

        let newIndex = currentIndex + 1;
        if (isShuffled) {
            let randomIdx;
            do {
                randomIdx = Math.floor(Math.random() * playlist.length);
            } while (randomIdx === currentIndex);
            newIndex = randomIdx;
        } else if (newIndex >= playlist.length) {
            if (repeatMode === 'all') {
                newIndex = 0;
            } else {
                audio.pause();
                audio.currentTime = 0;
                return;
            }
        }

        loadSong(newIndex);
        audio.play().catch(() => {});
    }

    function updateProgress() {
        const duration = audio.duration || 0;
        const current = audio.currentTime || 0;
        const percent = duration ? (current / duration) * 100 : 0;
        progressFill.style.width = `${Math.min(percent, 100)}%`;
        currentTimeEl.textContent = formatTime(current);
        durationEl.textContent = formatTime(duration);
        // Update aria
        progressBar.setAttribute('aria-valuenow', Math.round(percent));
    }

    // ---------- Event Listeners ----------
    // Play/Pause
    playBtn.addEventListener('click', togglePlay);
    miniPlayBtn.addEventListener('click', togglePlay);

    // Previous / Next
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    miniNextBtn.addEventListener('click', nextSong);

    // Shuffle
    shuffleBtn.addEventListener('click', () => {
        isShuffled = !isShuffled;
        shuffleBtn.classList.toggle('active', isShuffled);
        saveState();
    });

    // Repeat
    repeatBtn.addEventListener('click', () => {
        const modes = ['none', 'one', 'all'];
        const currentIdx = modes.indexOf(repeatMode);
        const nextIdx = (currentIdx + 1) % modes.length;
        repeatMode = modes[nextIdx];
        repeatBtn.classList.toggle('active', repeatMode !== 'none');
        if (repeatMode === 'one') {
            repeatBtn.textContent = '🔂';
        } else if (repeatMode === 'all') {
            repeatBtn.textContent = '🔁';
        } else {
            repeatBtn.textContent = '🔁';
            repeatBtn.classList.remove('active');
        }
        saveState();
    });

    // Volume
    volumeSlider.addEventListener('input', function() {
        audio.volume = parseFloat(this.value);
        if (audio.volume === 0) {
            isMuted = true;
            muteBtn.textContent = '🔇';
        } else {
            isMuted = false;
            muteBtn.textContent = '🔊';
        }
        saveState();
    });

    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        if (isMuted) {
            previousVolume = audio.volume;
            audio.volume = 0;
            volumeSlider.value = 0;
            muteBtn.textContent = '🔇';
        } else {
            audio.volume = previousVolume || 0.8;
            volumeSlider.value = audio.volume;
            muteBtn.textContent = '🔊';
        }
        saveState();
    });

    // Progress seek — pointer events work consistently with mouse, touch and pen.
    let lastPointerEvent = null;
    progressBar.addEventListener('pointerdown', (e) => {
        if (!audio.duration) return;
        isDragging = true;
        lastPointerEvent = e;
        progressBar.setPointerCapture?.(e.pointerId);
        seek(e);
    });
    progressBar.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        lastPointerEvent = e;
        seek(e);
    });
    progressBar.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        lastPointerEvent = e;
        seek(e);
        isDragging = false;
        commitSeek();
        progressBar.releasePointerCapture?.(e.pointerId);
    });
    progressBar.addEventListener('pointercancel', () => {
        if (!isDragging) return;
        isDragging = false;
        commitSeek();
    });

    function commitSeek() {
        if (!audio.duration || !lastPointerEvent) return;
        const rect = progressBar.getBoundingClientRect();
        let x = (lastPointerEvent.clientX - rect.left) / rect.width;
        x = Math.max(0, Math.min(1, x));
        audio.currentTime = x * audio.duration;
        saveState();
    }

    function seek(e) {
        if (!audio.duration) return;
        const rect = progressBar.getBoundingClientRect();
        let x = (e.clientX - rect.left) / rect.width;
        x = Math.max(0, Math.min(1, x));
        const time = x * audio.duration;
        progressFill.style.width = `${x * 100}%`;
        currentTimeEl.textContent = formatTime(time);
    }

    // Audio events
    audio.addEventListener('timeupdate', () => {
        if (!isDragging) {
            updateProgress();
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        updateProgress();
        // Restore saved time if any
        const savedTime = localStorage.getItem(STORAGE_KEYS.currentTime);
        if (savedTime !== null && !isNaN(parseFloat(savedTime))) {
            const t = parseFloat(savedTime);
            if (t < audio.duration) audio.currentTime = t;
        }
        // Restore volume
        const vol = localStorage.getItem(STORAGE_KEYS.volume);
        if (vol !== null) {
            audio.volume = parseFloat(vol);
            volumeSlider.value = audio.volume;
        }
    });

    audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayButton();
        // Keep screen awake (using no external lib)
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(() => {});
        }
    });

    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayButton();
        saveState();
    });

    audio.addEventListener('ended', () => {
        if (repeatMode === 'one') {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } else if (playlist.length > 1 || repeatMode === 'all') {
            nextSong();
        } else {
            isPlaying = false;
            updatePlayButton();
        }
        saveState();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        switch (e.key) {
            case ' ':
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight':
                e.preventDefault();
                audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || 0);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                audio.currentTime = Math.max(audio.currentTime - 5, 0);
                break;
            case 'k':
                togglePlay();
                break;
            case 'j':
                prevSong();
                break;
            case 'l':
                nextSong();
                break;
        }
    });

    // Playlist drawer toggle
    playlistToggle.addEventListener('click', () => {
        playlistDrawer.classList.toggle('open');
    });
    closePlaylist.addEventListener('click', closePlaylistDrawer);
    document.addEventListener('click', (e) => {
        if (playlistDrawer.classList.contains('open') &&
            !playlistDrawer.contains(e.target) &&
            !playlistToggle.contains(e.target)) {
            closePlaylistDrawer();
        }
    });

    function closePlaylistDrawer() {
        playlistDrawer.classList.remove('open');
    }

    // Favorites button: show only favorites in playlist view
    favoritesBtn.addEventListener('click', () => {
        // Toggle filter: we just open playlist and highlight favorites?
        // Actually we can show a filtered view - but for simplicity we open playlist
        if (playlistDrawer.classList.contains('open')) {
            // If already open, scroll to first favorite
            const firstFav = document.querySelector('.pl-fav.active');
            if (firstFav) {
                firstFav.closest('.playlist-item')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            playlistDrawer.classList.add('open');
            // Highlight favorites
            setTimeout(() => {
                const firstFav = document.querySelector('.pl-fav.active');
                if (firstFav) {
                    firstFav.closest('.playlist-item')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    });

    // Mini player expand: scroll to main player
    miniExpandBtn.addEventListener('click', () => {
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Also focus on play button
        playBtn.focus();
    });

    // ---------- Media Session API ----------
    function setupMediaSession() {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.setActionHandler('play', () => {
            if (audio.paused) togglePlay();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (!audio.paused) togglePlay();
        });
        navigator.mediaSession.setActionHandler('previoustrack', prevSong);
        navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined && audio.duration) {
                audio.currentTime = Math.min(details.seekTime, audio.duration);
            }
        });
    }

    function updateMediaMetadata(song) {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title || 'بی‌عنوان',
            artist: song.artist || 'ناشناس',
            album: 'آلبوم',
            artwork: [
                { src: song.cover || 'covers/c.png', sizes: '512x512', type: 'image/png' }
            ]
        });
    }

    // ---------- Service Worker Registration ----------
    function registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(() => console.log('SW registered'))
                .catch(err => console.warn('SW registration failed:', err));
        }
    }

    // ---------- Auto-resume (if was playing) ----------
    // We'll check if audio was playing when page unloaded
    // We save playing state in session? Not needed; we use isPlaying flag.
    // But we need to restore play state if user left page while playing.
    // We'll save isPlaying in sessionStorage? For simplicity, we just check if
    // audio has currentTime > 0 and we were playing before? We'll use a flag.
    // We'll store a 'playing' flag in localStorage and restore.
    // On page load, if we have a saved playing state, we resume.
    function restorePlayState() {
        const wasPlaying = localStorage.getItem('player_wasPlaying');
        if (wasPlaying === 'true' && audio.src) {
            audio.play().catch(() => {});
        }
    }

    // Save play state on beforeunload
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('player_wasPlaying', String(isPlaying));
        saveState();
    });

    // ---------- Initialize ----------
    function init() {
        loadState();
        // Set initial UI states
        shuffleBtn.classList.toggle('active', isShuffled);
        if (repeatMode === 'one') {
            repeatBtn.textContent = '🔂';
            repeatBtn.classList.add('active');
        } else if (repeatMode === 'all') {
            repeatBtn.textContent = '🔁';
            repeatBtn.classList.add('active');
        } else {
            repeatBtn.textContent = '🔁';
            repeatBtn.classList.remove('active');
        }
        // Volume
        volumeSlider.value = audio.volume;
        if (audio.volume === 0) {
            muteBtn.textContent = '🔇';
            isMuted = true;
        } else {
            muteBtn.textContent = '🔊';
            isMuted = false;
        }
        loadPlaylist();
        // Show mini player after a moment
        setTimeout(() => {
            miniPlayer.classList.add('visible');
        }, 1000);
        // Restore play state after load
        setTimeout(restorePlayState, 500);

        // Handle visibility change to pause/resume if needed? Not necessary.
        // Handle network status? Not needed.
    }

    // ---------- Start ----------
    document.addEventListener('DOMContentLoaded', init);
})();
