package ir.diyareghadamgah.naghme

import android.graphics.Color
import android.util.Log
import android.view.Gravity
import java.net.HttpURLConnection
import java.net.URL
import java.io.ByteArrayOutputStream
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

@CapacitorPlugin(name = "NaghmeVideoPlayer")
class NaghmeVideoPlayerPlugin : Plugin() {
    private var player: ExoPlayer? = null
    private var playerView: PlayerView? = null

    /** دریافت فهرست M3U در اندروید؛ WebView ممکن است به‌دلیل CORS نتواند آن را بخواند. */
    @PluginMethod
    fun fetchText(call: PluginCall) {
        val raw = call.getString("url")
        if (raw.isNullOrBlank() || !(raw.startsWith("https://") || raw.startsWith("http://"))) {
            call.reject("invalid_http_url")
            return
        }
        Thread {
            var connection: HttpURLConnection? = null
            try {
                connection = (URL(raw).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 20000
                    readTimeout = 30000
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "VLC/3.0.20 LibVLC/3.0.20")
                    setRequestProperty("Accept", "application/vnd.apple.mpegurl, audio/x-mpegurl, */*")
                    setRequestProperty("Cache-Control", "no-cache")
                }
                val status = connection.responseCode
                if (status !in 200..299) throw IllegalStateException("HTTP $status")
                val input = connection.inputStream
                val out = ByteArrayOutputStream()
                val buffer = ByteArray(16384)
                var total = 0
                input.use { stream ->
                    while (true) {
                        val n = stream.read(buffer)
                        if (n < 0) break
                        total += n
                        if (total > 20 * 1024 * 1024) throw IllegalStateException("playlist_too_large")
                        out.write(buffer, 0, n)
                    }
                }
                val body = out.toString("UTF-8")
                if (!body.trimStart().startsWith("#EXTM3U")) throw IllegalStateException("invalid_m3u_response")
                call.resolve(JSObject().put("text", body).put("status", status).put("url", connection.url.toString()))
            } catch (e: Exception) {
                call.reject("playlist_fetch_failed: " + (e.message ?: e.javaClass.simpleName))
            } finally {
                connection?.disconnect()
            }
        }.start()
    }

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
                    val httpFactory = DefaultHttpDataSource.Factory()
                        .setUserAgent("VLC/3.0.20 LibVLC/3.0.20")
                        .setAllowCrossProtocolRedirects(true)

                    val mediaSourceFactory = DefaultMediaSourceFactory(httpFactory)

                    player = ExoPlayer.Builder(act)
                        .setMediaSourceFactory(mediaSourceFactory)
                        .build()
                    setupListeners()
                }
                if (playerView == null) {
                    playerView = PlayerView(act).apply {
                        useController = true
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        setBackgroundColor(Color.BLACK)
                    }
                    val params = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 400).apply {
                        gravity = Gravity.TOP or Gravity.LEFT
                    }
                    act.addContentView(playerView, params)
                }
                playerView?.player = player
                playerView?.visibility = android.view.View.VISIBLE
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
        val x = call.getFloat("x") ?: 0f
        val y = call.getFloat("y") ?: 0f
        val width = call.getFloat("width") ?: 0f
        val height = call.getFloat("height") ?: 0f

        activity?.runOnUiThread {
            try {
                playerView?.let { pv ->
                    val params = pv.layoutParams as FrameLayout.LayoutParams
                    params.gravity = Gravity.TOP or Gravity.LEFT
                    params.leftMargin = x.toInt()
                    params.topMargin = y.toInt()
                    params.width = width.toInt()
                    params.height = height.toInt()
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
                val details = generateSequence(error as Throwable?) { it.cause }
                    .take(5)
                    .joinToString(" <- ") { cause ->
                        cause.javaClass.simpleName + (cause.message?.let { ": $it" } ?: "")
                    }
                d.put("message", details.ifBlank { error.message ?: "Unknown playback error" })
                d.put("code", error.errorCode)
                d.put("name", error.errorCodeName)
                notifyListeners("error", d)
                Log.e("NaghmeVideoPlayer", "Playback error [" + error.errorCodeName + "]: " + details, error)
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
