package ir.diyareghadamgah.naghme

import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * پلیر بومی مستقل برای کتابخانه ویدئو.
 * عمداً از NaghmeVideoPlayer (پلیر IPTV) جداست تا وضعیت ویدئو و تلویزیون تداخل نداشته باشد.
 */
@CapacitorPlugin(name = "NaghmeLibraryVideoPlayer")
class NaghmeLibraryVideoPlayerPlugin : Plugin() {
    private var player: ExoPlayer? = null
    private var view: PlayerView? = null

    private fun ensurePlayer() {
        if (player != null) return
        val ctx = activity ?: throw IllegalStateException("Activity not available")
        val http = DefaultHttpDataSource.Factory()
            .setUserAgent("Naghme/2.3 Android")
            .setAllowCrossProtocolRedirects(true)
        player = ExoPlayer.Builder(ctx)
            .setMediaSourceFactory(DefaultMediaSourceFactory(http))
            .build().also { p ->
                p.addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        val data = JSObject()
                        data.put("state", when (state) {
                            Player.STATE_READY -> "ready"
                            Player.STATE_BUFFERING -> "buffering"
                            Player.STATE_ENDED -> "ended"
                            else -> "idle"
                        })
                        notifyListeners("state", data)
                    }
                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        val data = JSObject()
                        data.put("isPlaying", isPlaying)
                        notifyListeners("playingChanged", data)
                    }
                    override fun onPlayerError(error: PlaybackException) {
                        val data = JSObject()
                        data.put("code", error.errorCode)
                        data.put("name", error.errorCodeName)
                        data.put("message", error.message ?: "Playback error")
                        notifyListeners("error", data)
                    }
                })
            }
        view = PlayerView(ctx).apply {
            useController = false
            resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
            setBackgroundColor(Color.BLACK)
            player = this@NaghmeLibraryVideoPlayerPlugin.player
        }
        val params = FrameLayout.LayoutParams(1, 1).apply { gravity = Gravity.TOP or Gravity.START }
        ctx.addContentView(view, params)
        view?.visibility = View.GONE
    }

    @PluginMethod
    fun play(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) { call.reject("url_required"); return }
        val act = activity ?: run { call.reject("activity_unavailable"); return }
        act.runOnUiThread {
            try {
                ensurePlayer()
                view?.visibility = View.VISIBLE
                player?.setMediaItem(MediaItem.fromUri(url))
                player?.prepare()
                player?.playWhenReady = true
                call.resolve(JSObject().put("accepted", true))
            } catch (e: Exception) { call.reject("play_failed: " + e.message) }
        }
    }

    @PluginMethod
    fun setBounds(call: PluginCall) {
        val x = call.getFloat("x") ?: 0f
        val y = call.getFloat("y") ?: 0f
        val w = call.getFloat("width") ?: 1f
        val h = call.getFloat("height") ?: 1f
        activity?.runOnUiThread {
            try {
                val v = view ?: run { call.resolve(); return@runOnUiThread }
                val p = v.layoutParams as FrameLayout.LayoutParams
                p.gravity = Gravity.TOP or Gravity.START
                p.leftMargin = x.toInt(); p.topMargin = y.toInt()
                p.width = w.toInt().coerceAtLeast(1); p.height = h.toInt().coerceAtLeast(1)
                v.layoutParams = p
                call.resolve()
            } catch (e: Exception) { call.reject("bounds_failed: " + e.message) }
        } ?: call.reject("activity_unavailable")
    }

    @PluginMethod fun setVisible(call: PluginCall) {
        val visible = call.getBoolean("visible") ?: true
        activity?.runOnUiThread { view?.visibility = if (visible) View.VISIBLE else View.GONE; call.resolve() }
            ?: call.reject("activity_unavailable")
    }
    @PluginMethod fun pause(call: PluginCall) { activity?.runOnUiThread { player?.pause(); call.resolve() } ?: call.reject("activity_unavailable") }
    @PluginMethod fun resume(call: PluginCall) { activity?.runOnUiThread { player?.play(); call.resolve() } ?: call.reject("activity_unavailable") }
    @PluginMethod fun stop(call: PluginCall) { activity?.runOnUiThread { player?.stop(); player?.clearMediaItems(); call.resolve() } ?: call.reject("activity_unavailable") }
    @PluginMethod fun seekTo(call: PluginCall) {
        val ms = call.getLong("positionMs") ?: 0L
        activity?.runOnUiThread { player?.seekTo(ms.coerceAtLeast(0)); call.resolve() } ?: call.reject("activity_unavailable")
    }
    @PluginMethod fun setSpeed(call: PluginCall) {
        val speed = (call.getFloat("speed") ?: 1f).coerceIn(0.25f, 3f)
        activity?.runOnUiThread { player?.setPlaybackSpeed(speed); call.resolve() } ?: call.reject("activity_unavailable")
    }
    @PluginMethod fun setResizeMode(call: PluginCall) {
        val mode = call.getString("mode") ?: "fit"
        activity?.runOnUiThread {
            view?.resizeMode = when (mode) {
                "fill" -> AspectRatioFrameLayout.RESIZE_MODE_FILL
                "zoom" -> AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                else -> AspectRatioFrameLayout.RESIZE_MODE_FIT
            }
            call.resolve()
        } ?: call.reject("activity_unavailable")
    }
    @PluginMethod fun getStatus(call: PluginCall) {
        val p = player
        val out = JSObject()
        out.put("positionMs", p?.currentPosition ?: 0L)
        out.put("durationMs", p?.duration?.takeIf { it > 0 } ?: 0L)
        out.put("isPlaying", p?.isPlaying ?: false)
        call.resolve(out)
    }
    @PluginMethod fun release(call: PluginCall) {
        activity?.runOnUiThread {
            try {
                view?.let { (it.parent as? ViewGroup)?.removeView(it) }
                view = null; player?.release(); player = null
                call.resolve()
            } catch (e: Exception) { call.reject("release_failed: " + e.message) }
        } ?: call.reject("activity_unavailable")
    }

    override fun handleOnDestroy() {
        try {
            view?.let { (it.parent as? ViewGroup)?.removeView(it) }
            view = null; player?.release(); player = null
        } catch (_: Exception) {}
        super.handleOnDestroy()
    }
}
