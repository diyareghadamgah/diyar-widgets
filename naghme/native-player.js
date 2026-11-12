// Naghme Native Video Player - Capacitor bridge (Phase 2: Overlay)
(function () {
    'use strict';

    var isNative = !!(window.Capacitor &&
        typeof window.Capacitor.isNativePlatform === 'function' &&
        window.Capacitor.isNativePlatform());

    var plugin = {
        isNative: isNative,
        _p: null,
        get: function () {
            if (this._p) return this._p;
            if (!isNative) return null;
            try {
                if (window.Capacitor.Plugins && window.Capacitor.Plugins.NaghmeVideoPlayer) {
                    this._p = window.Capacitor.Plugins.NaghmeVideoPlayer;
                } else if (typeof window.Capacitor.registerPlugin === 'function') {
                    this._p = window.Capacitor.registerPlugin('NaghmeVideoPlayer');
                }
            } catch (e) {
                console.warn('[NaghmeVideoPlayer] registration failed', e);
            }
            return this._p;
        },
        fetchText: function (url) { var p = this.get(); if (!p || !p.fetchText) return Promise.reject(new Error("native playlist fetch unavailable")); return p.fetchText({ url: url }); },
        openOfficialPage: function (url) { var p = this.get(); if (!p || !p.openOfficialPage) return Promise.reject(new Error('official page viewer unavailable')); return p.openOfficialPage({ url: url || 'https://www.fam.ir/channels' }); },
        closeOfficialPage: function () { var p = this.get(); return p && p.closeOfficialPage ? p.closeOfficialPage() : Promise.resolve(); },
        play: function (url) {
            var p = this.get();
            if (!p) return Promise.reject(new Error('NaghmeVideoPlayer plugin not available'));
            return p.play({ url: url });
        },
        stop: function () { var p = this.get(); return p ? p.stop() : Promise.resolve(); },
        pause: function () { var p = this.get(); return p ? p.pause() : Promise.resolve(); },
        resume: function () { var p = this.get(); return p ? p.resume() : Promise.resolve(); },
        seekTo: function (positionMs) { var p = this.get(); return p && p.seekTo ? p.seekTo({ positionMs: Math.max(0, Number(positionMs) || 0) }) : Promise.reject(new Error('پرش زمانی IPTV در دسترس نیست')); },
        setSpeed: function (speed) { var p = this.get(); return p && p.setSpeed ? p.setSpeed({ speed: Math.max(0.25, Math.min(3, Number(speed) || 1)) }) : Promise.reject(new Error('تنظیم سرعت IPTV در دسترس نیست')); },
        status: function () { var p = this.get(); return p && p.getStatus ? p.getStatus() : Promise.reject(new Error('وضعیت پلیر IPTV در دسترس نیست')); },
        setLocked: function (locked) { var p = this.get(); return p && p.setLocked ? p.setLocked({ locked: !!locked }) : Promise.reject(new Error('قفل لمس IPTV در دسترس نیست')); },
        release: function () { var p = this.get(); return p ? p.release() : Promise.resolve(); },
        setVisible: function (visible) {
            var p = this.get();
            if (p && p.setVisible) return p.setVisible({ visible: visible });
            return Promise.resolve();
        },
        setFullscreen: function (enabled) {
            var p = this.get();
            if (p && p.setFullscreen) return p.setFullscreen({ enabled: !!enabled });
            return Promise.resolve();
        },
        fitToVideoElement: function (elementId) {
            var el = document.getElementById(elementId);
            if (!el || !this.isNative) return;
            var rect = el.getBoundingClientRect();
            var dpr = window.devicePixelRatio || 1;
            var p = this.get();
            if (p && p.setBounds) {
                p.setBounds({
                    x: rect.left * dpr,
                    y: rect.top * dpr,
                    width: rect.width * dpr,
                    height: rect.height * dpr
                }).catch(function (e) { console.warn('setBounds failed', e); });
            }
        },
        on: function (event, cb) {
            var p = this.get();
            if (p && typeof p.addListener === 'function') return p.addListener(event, cb);
            return { remove: function () {} };
        }
    };


    // پلیر مستقل کتابخانه؛ با پلیر IPTV اشتراک وضعیت ندارد.
    var libraryPlugin = null;
    var libraryVideo = {
        isNative: isNative,
        get: function () {
            if (!isNative) return null;
            if (libraryPlugin) return libraryPlugin;
            try {
                if (window.Capacitor.Plugins && window.Capacitor.Plugins.NaghmeLibraryVideoPlayer) {
                    libraryPlugin = window.Capacitor.Plugins.NaghmeLibraryVideoPlayer;
                } else if (typeof window.Capacitor.registerPlugin === 'function') {
                    libraryPlugin = window.Capacitor.registerPlugin('NaghmeLibraryVideoPlayer');
                }
            } catch (e) { console.warn('[NaghmeLibraryVideoPlayer] registration failed', e); }
            return libraryPlugin;
        },
        call: function (method, args) {
            var p = this.get();
            if (!p || typeof p[method] !== 'function') return Promise.reject(new Error('پلیر بومی کتابخانه در دسترس نیست'));
            return p[method](args || {});
        },
        play: function (url) { return this.call('play', {url:url}); },
        stop: function () { return this.call('stop'); },
        pause: function () { return this.call('pause'); },
        resume: function () { return this.call('resume'); },
        seekTo: function (positionMs) { return this.call('seekTo', {positionMs:positionMs}); },
        setSpeed: function (speed) { return this.call('setSpeed', {speed:speed}); },
        setRepeatMode: function (mode) { return this.call('setRepeatMode', {mode:mode === 'one' ? 'one' : 'off'}); },
        setLocked: function (locked) { return this.call('setLocked', {locked:!!locked}); },
        status: function () { return this.call('getStatus'); },
        visible: function (visible) { return this.call('setVisible', {visible:visible}); },
        bounds: function (element) {
            if (!element) return Promise.resolve();
            // getBoundingClientRect() is in CSS pixels relative to the WebView viewport.
            // Native code converts it to the Activity content-view coordinates.
            var r = element.getBoundingClientRect();
            return this.call('setBounds', {x:r.left,y:r.top,width:r.width,height:r.height});
        },
        release: function () { return this.call('release'); },
        diagnostics: function () { return this.call('getDiagnostics'); },
        pickFiles: function () { return this.call('pickVideoFiles'); },
        pickFolder: function () { return this.call('pickVideoFolder'); }
    };
    window.NaghmeLibraryVideo = libraryVideo;

    window.NaghmeVideoPlayer = plugin;

    // Test button removed
    console.log('[NaghmeVideoPlayer] loaded, isNative=', isNative);
})();
