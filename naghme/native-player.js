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

    // Prototype test button (will be removed after IPTV integration)
    if (isNative) {
        setTimeout(function () {
            var btn = document.createElement('button');
            btn.id = 'ngtvp-test-btn';
            btn.textContent = 'Test Native';
            btn.style.cssText = 'position:fixed;top:60px;left:10px;z-index:99999;padding:8px 12px;background:#0a8;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.5);cursor:pointer;';
            btn.onclick = function () {
                btn.textContent = 'loading...';
                plugin.on('ready', function () { btn.textContent = 'ready OK'; });
                plugin.on('playing', function () { btn.textContent = 'playing'; });
                plugin.on('error', function (e) {
                    btn.textContent = 'ERR ' + ((e && e.message) || 'err').substring(0, 22);
                });
                plugin.on('ended', function () { btn.textContent = 'ended'; });
                plugin.play('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8').then(function() {
                    // وقتی دکمه تست زده شد، پلیر را روی کادر IPTV قرار بده
                    setTimeout(function() {
                        plugin.fitToVideoElement('iptvVideo');
                    }, 500);
                }).catch(function (e) {
                    btn.textContent = 'ERR ' + ((e && e.message) || 'fail').substring(0, 22);
                });
            };
            document.body.appendChild(btn);
        }, 2500);
    }
    console.log('[NaghmeVideoPlayer] loaded, isNative=', isNative);
})();
