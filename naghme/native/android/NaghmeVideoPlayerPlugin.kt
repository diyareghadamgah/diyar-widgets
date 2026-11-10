package ir.diyareghadamgah.naghme

import android.graphics.Color
import android.util.Log
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NaghmeVideoPlayer")
class NaghmeVideoPlayerPlugin : Plugin() {
    private var player: ExoPlayer? = null
    private var playerView: PlayerView? = null

    @PluginMethod
    fun play(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) {
            call.reject("URL is required")
            return
        }
        val act = activity ?: return call.reject("Activity not available")
        act.runOnUiThread {
            try {
                if (player == null) {
                    player = ExoPlayer.Builder(act).build()
                    setupListeners()
                }
                if (playerView == null) {
                    playerView = PlayerView(act).apply {
                        useController = true
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        setBackgroundColor(Color.BLACK)
                    }
                    val metrics = act.resources.displayMetrics
                    val w = metrics.widthPixels
                    val h = (w * 9 / 16)
                    val params = FrameLayout.LayoutParams(w, h).apply {
                        gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                        topMargin = 140 // مقدار پیش‌فرض
                    }
                    act.addContentView(playerView, params)
                }
                playerView?.player = player
                player?.setMediaItem(MediaItem.fromUri(url))
                player?.prepare()
                player?.playWhenReady = true
                val ret = JSObject()
                ret.put("status", "loading")
                call.resolve(ret)
            } catch (e: Exception) {
                Log.e("NaghmeVideoPlayer", "play failed", e)
                call.reject("Play failed: " + e.message)
            }
        }
    }

    @PluginMethod
    fun setBounds(call: PluginCall) {
        val x = call.getFloat("x")?.toInt() ?: 0
        val y = call.getFloat("y")?.toInt() ?: 0
        val width = call.getFloat("width")?.toInt() ?: 0
        val height = call.getFloat("height")?.toInt() ?: 0

        activity?.runOnUiThread {
            try {
                playerView?.let { pv ->
                    val params = pv.layoutParams as FrameLayout.LayoutParams
                    params.gravity = Gravity.TOP or Gravity.LEFT
                    params.leftMargin = x
                    params.topMargin = y
                    params.width = width
                    params.height = height
                    pv.layoutParams = params
                    pv.requestLayout()
                }
                call.resolve()
            } catch (e: Exception) {
                call.reject("setBounds failed: " + e.message)
            }
        } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun setVisible(call: PluginCall) {
        val visible = call.getBoolean("visible") ?: true
        activity?.runOnUiThread {
            playerView?.visibility = if (visible) android.view.View.VISIBLE else android.view.View.GONE
            call.resolve()
        } ?: call.reject("Activity not available")
    }

    private fun setupListeners() {
        player?.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                val d = JSObject()
                when (state) {
                    Player.STATE_READY -> { d.put("state", "ready"); notifyListeners("ready", d) }
                    Player.STATE_BUFFERING -> { d.put("state", "buffering"); notifyListeners("buffering", d) }
                    Player.STATE_ENDED -> { d.put("state", "ended"); notifyListeners("ended", d) }
                }
            }
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                val d = JSObject()
                d.put("isPlaying", isPlaying)
                notifyListeners(if (isPlaying) "playing" else "paused", d)
            }
            override fun onPlayerError(error: PlaybackException) {
                val d = JSObject()
                d.put("message", error.message ?: "Unknown")
                d.put("code", error.errorCode)
                d.put("name", error.errorCodeName)
                notifyListeners("error", d)
            }
        })
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        activity?.runOnUiThread {
            player?.stop()
            player?.clearMediaItems()
            call.resolve()
        } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        activity?.runOnUiThread { player?.pause(); call.resolve() } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        activity?.runOnUiThread { player?.play(); call.resolve() } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun release(call: PluginCall) {
        activity?.runOnUiThread {
            try {
                playerView?.let { pv -> (pv.parent as? ViewGroup)?.removeView(pv) }
                playerView = null
                player?.release()
                player = null
                call.resolve()
            } catch (e: Exception) {
                call.reject("Release failed: " + e.message)
            }
        } ?: call.reject("Activity not available")
    }

    override fun handleOnDestroy() {
        try {
            activity?.runOnUiThread {
                playerView?.let { pv -> (pv.parent as? ViewGroup)?.removeView(pv) }
                playerView = null
                player?.release()
                player = null
            }
        } catch (_: Exception) {}
        super.handleOnDestroy()
    }
}
