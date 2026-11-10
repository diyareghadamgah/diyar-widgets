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
        play: function (url) {
            var p = this.get();
            if (!p) return Promise.reject(new Error('NaghmeVideoPlayer plugin not available'));
            return p.play({ url: url });
        },
        stop: function () { var p = this.get(); return p ? p.stop() : Promise.resolve(); },
        pause: function () { var p = this.get(); return p ? p.pause() : Promise.resolve(); },
        resume: function () { var p = this.get(); return p ? p.resume() : Promise.resolve(); },
        release: function () { var p = this.get(); return p ? p.release() : Promise.resolve(); },
        setVisible: function (visible) {
            var p = this.get();
            if (p && p.setVisible) return p.setVisible({ visible: visible });
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

    window.NaghmeVideoPlayer = plugin;

    // Test button removed
    console.log('[NaghmeVideoPlayer] loaded, isNative=', isNative);
})();
