package ir.diyareghadamgah.naghme

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.Gravity
import android.util.Log
import java.io.File
import java.io.FileOutputStream
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
    private val diagnosticLock = Any()
    private var lastBoundsSignature = ""

    // گزارش فقط در حافظه خصوصی برنامه ذخیره می‌شود و به کتابخانه دست نمی‌زند.
    private fun diagnostic(message: String, error: Throwable? = null) {
        val line = System.currentTimeMillis().toString() + " " + message + "\n" +
            (if (error != null) Log.getStackTraceString(error) + "\n" else "")
        try {
            synchronized(diagnosticLock) {
                val file = File(getContext().filesDir, "naghme-video-diagnostics.log")
                if (file.exists() && file.length() > 262144) {
                    file.writeText(file.readText(Charsets.UTF_8).takeLast(131072), Charsets.UTF_8)
                }
                FileOutputStream(file, true).use { it.write(line.toByteArray(Charsets.UTF_8)) }
            }
        } catch (writeError: Exception) { Log.e("NaghmeLibraryVideo", "diagnostic_write_failed", writeError) }
        if (error != null) Log.e("NaghmeLibraryVideo", message, error) else Log.i("NaghmeLibraryVideo", message)
    }

    private fun ensurePlayer() {
        if (player != null) return
        val ctx = activity ?: throw IllegalStateException("Activity not available")
        diagnostic("player_initializing")
        val http = DefaultHttpDataSource.Factory()
            .setUserAgent("Naghme/2.3 Android")
            .setAllowCrossProtocolRedirects(true)
        val dataSource = DefaultDataSource.Factory(ctx, http)
        player = ExoPlayer.Builder(ctx)
            .setMediaSourceFactory(DefaultMediaSourceFactory(dataSource))
            .build().also { p ->
                p.addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(state: Int) {
                        diagnostic("playback_state=" + state)
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
                        diagnostic("is_playing=" + isPlaying)
                        val data = JSObject()
                        data.put("isPlaying", isPlaying)
                        notifyListeners("playingChanged", data)
                    }
                    override fun onPlayerError(error: PlaybackException) {
                        val causes = generateSequence(error as Throwable?) { it.cause }.take(6)
                            .joinToString(" <- ") { it.javaClass.simpleName + (it.message?.let { m -> ": " + m } ?: "") }
                        diagnostic("player_error code=" + error.errorCode + " name=" + error.errorCodeName + " causes=" + causes, error)
                        val data = JSObject()
                        data.put("code", error.errorCode)
                        data.put("name", error.errorCodeName)
                        data.put("message", error.message ?: "Playback error")
                        notifyListeners("error", data)
                    }
                })
                diagnostic("player_initialized")
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
        diagnostic("play_requested scheme=" + (Uri.parse(url).scheme ?: "unknown"))
        val act = activity ?: run { call.reject("activity_unavailable"); return }
        act.runOnUiThread {
            try {
                ensurePlayer()
                view?.visibility = View.VISIBLE
                player?.setMediaItem(MediaItem.fromUri(url))
                player?.prepare()
                player?.playWhenReady = true
                diagnostic("play_command_accepted")
                call.resolve(JSObject().put("accepted", true))
            } catch (e: Exception) {
                diagnostic("play_command_failed", e)
                call.reject("play_failed: " + e.message)
            }
        }
    }

    @PluginMethod
    fun setBounds(call: PluginCall) {
        // JavaScript sends CSS pixels relative to the WebView viewport.
        // PlayerView is attached to android.R.id.content, so translate both origins
        // into the same screen coordinate space before applying layout margins.
        val cssX = call.getFloat("x") ?: 0f
        val cssY = call.getFloat("y") ?: 0f
        val cssW = call.getFloat("width") ?: 1f
        val cssH = call.getFloat("height") ?: 1f
        activity?.runOnUiThread {
            try {
                val v = view ?: run { call.resolve(); return@runOnUiThread }
                val act = activity ?: run { call.reject("activity_unavailable"); return@runOnUiThread }
                val content = act.findViewById<View>(android.R.id.content)
                    ?: run { call.reject("content_view_unavailable"); return@runOnUiThread }
                val web = getBridge().getWebView()
                val webLocation = IntArray(2)
                val contentLocation = IntArray(2)
                web.getLocationOnScreen(webLocation)
                content.getLocationOnScreen(contentLocation)
                val density = act.resources.displayMetrics.density
                val x = webLocation[0] - contentLocation[0] + cssX * density
                val y = webLocation[1] - contentLocation[1] + cssY * density
                val w = cssW * density
                val h = cssH * density
                val p = v.layoutParams as FrameLayout.LayoutParams
                p.gravity = Gravity.TOP or Gravity.START
                p.leftMargin = x.toInt()
                p.topMargin = y.toInt()
                p.width = w.toInt().coerceAtLeast(1)
                p.height = h.toInt().coerceAtLeast(1)
                v.layoutParams = p
                val signature = p.leftMargin.toString() + "," + p.topMargin + "," + p.width + "," + p.height
                if (signature != lastBoundsSignature) {
                    lastBoundsSignature = signature
                    diagnostic("player_view_bounds=" + signature + " css=" + cssX + "," + cssY + "," + cssW + "," + cssH +
                        " web=" + webLocation.joinToString(",") + " content=" + contentLocation.joinToString(",") +
                        " density=" + density)
                }
                call.resolve()
            } catch (e: Exception) {
                diagnostic("bounds_failed", e)
                call.reject("bounds_failed: " + (e.message ?: e.javaClass.simpleName))
            }
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
    @PluginMethod
    fun getDiagnostics(call: PluginCall) {
        try {
            val file = File(getContext().filesDir, "naghme-video-diagnostics.log")
            val report = if (file.exists()) file.readText(Charsets.UTF_8).takeLast(80000) else "هنوز گزارشی ثبت نشده است."
            call.resolve(JSObject().put("text", report).put("exists", file.exists()))
        } catch (e: Exception) { call.reject("diagnostics_read_failed: " + (e.message ?: e.javaClass.simpleName)) }
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
        diagnostic("plugin_handle_on_destroy")
        try {
            view?.let { (it.parent as? ViewGroup)?.removeView(it) }
            view = null; player?.release(); player = null
        } catch (_: Exception) {}
        super.handleOnDestroy()
    }
}
