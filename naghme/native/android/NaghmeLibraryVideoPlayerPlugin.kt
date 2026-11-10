package ir.diyareghadamgah.naghme

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.documentfile.provider.DocumentFile
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
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
        val dataSource = DefaultDataSource.Factory(ctx, http)
        player = ExoPlayer.Builder(ctx)
            .setMediaSourceFactory(DefaultMediaSourceFactory(dataSource))
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

    private fun videoFile(uri: Uri): JSObject? {
        val resolver = getContext().contentResolver
        val metadata = resolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME, android.provider.OpenableColumns.SIZE), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val ni = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                val si = cursor.getColumnIndex(android.provider.OpenableColumns.SIZE)
                val fileName = if (ni >= 0) cursor.getString(ni) else null
                val size = if (si >= 0 && !cursor.isNull(si)) cursor.getLong(si) else -1L
                Pair(fileName, size)
            } else null
        }
        val fileName = metadata?.first ?: uri.lastPathSegment ?: "video"
        val extension = fileName.substringAfterLast('.', "").lowercase()
        val known = setOf("mp4","m4v","mkv","webm","mov","avi","3gp","3g2","ts","m2ts","mts","mpg","mpeg","mpe","mpv","m2v","wmv","flv","f4v","ogv","vob","divx","mxf")
        if (extension !in known && !(resolver.getType(uri) ?: "").startsWith("video/")) return null
        return JSObject().put("uri", uri.toString())
            .put("name", fileName)
            .put("size", metadata?.second ?: -1L)
            .put("mimeType", resolver.getType(uri) ?: "video/*")
    }

    private fun persistReadPermission(uri: Uri, flags: Int) {
        val grant = flags and Intent.FLAG_GRANT_READ_URI_PERMISSION
        try { getContext().contentResolver.takePersistableUriPermission(uri, grant) }
        catch (_: Exception) { /* Provider may not offer persistable grants. */ }
    }

    @PluginMethod
    fun pickVideoFiles(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("video/*", "video/x-matroska", "application/x-matroska", "application/octet-stream"))
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        }
        startActivityForResult(call, intent, "videoFilesPicked")
    }

    @ActivityCallback
    private fun videoFilesPicked(call: PluginCall, result: ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK || result.data == null) {
            call.resolve(JSObject().put("files", JSArray()))
            return
        }
        val data = result.data!!
        val uris = mutableListOf<Uri>()
        data.clipData?.let { clip -> for (i in 0 until clip.itemCount) clip.getItemAt(i)?.uri?.let { uris.add(it) } }
        if (uris.isEmpty()) data.data?.let { uris.add(it) }
        val files = JSArray()
        uris.distinctBy { it.toString() }.forEach { uri ->
            persistReadPermission(uri, data.flags)
            videoFile(uri)?.let { files.put(it) }
        }
        call.resolve(JSObject().put("files", files))
    }

    @PluginMethod
    fun pickVideoFolder(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        }
        startActivityForResult(call, intent, "videoFolderPicked")
    }

    @ActivityCallback
    private fun videoFolderPicked(call: PluginCall, result: ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK || result.data?.data == null) {
            call.resolve(JSObject().put("files", JSArray()).put("folder", ""))
            return
        }
        val data = result.data!!
        val treeUri = data.data!!
        persistReadPermission(treeUri, data.flags)
        val root = DocumentFile.fromTreeUri(getContext(), treeUri)
        val files = JSArray()
        var count = 0
        fun scan(folder: DocumentFile) {
            if (count >= 5000) return
            folder.listFiles().forEach { item ->
                if (count >= 5000) return
                if (item.isDirectory) scan(item)
                else if (item.isFile) videoFile(item.uri)?.let { files.put(it); count++ }
            }
        }
        try {
            root?.let { scan(it) }
            call.resolve(JSObject().put("files", files).put("folder", root?.name ?: ""))
        } catch (e: Exception) {
            call.reject("folder_scan_failed: " + (e.message ?: "unknown"))
        }
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
