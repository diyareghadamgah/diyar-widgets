package ir.diyareghadamgah.naghme

import android.content.pm.ActivityInfo
import android.graphics.Color
import android.util.Log
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.BaseAdapter
import android.widget.EditText
import android.text.TextWatcher
import android.text.Editable
import android.text.InputType
import android.view.inputmethod.EditorInfo
import java.util.Locale
import org.json.JSONArray
import android.widget.TextView
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
    companion object {
        @Volatile private var activePlugin: NaghmeVideoPlayerPlugin? = null

        @JvmStatic
        fun handleHardwareVolumeKey(keyCode: Int): Boolean {
            val plugin = activePlugin ?: return false
            val p = plugin.player ?: return false
            if (plugin.playerView?.visibility != View.VISIBLE) return false
            if (keyCode != KeyEvent.KEYCODE_VOLUME_UP && keyCode != KeyEvent.KEYCODE_VOLUME_DOWN) return false
            val delta = if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) 0.05f else -0.05f
            val next = (p.volume + delta).coerceIn(0f, 1f)
            p.volume = next
            plugin.notifyListeners("volumeChanged", JSObject().put("volume", next))
            return true
        }
    }

    init { activePlugin = this }
    private var player: ExoPlayer? = null
    private var iptvHttpFactory: DefaultHttpDataSource.Factory? = null
    private var playerView: PlayerView? = null
    private var lockOverlay: FrameLayout? = null
    private var isPlayerLocked: Boolean = false
    private var iptvFullscreenButton: Button? = null
    private var iptvChannelMenuButton: Button? = null
    private var iptvChannelMenuPanel: LinearLayout? = null
    private var iptvChannelListView: ListView? = null
    private var iptvChannelSearch: EditText? = null
    private var iptvChannelRows: JSONArray = JSONArray()
    private var iptvFilteredChannels: ArrayList<org.json.JSONObject> = arrayListOf()
    private var iptvChannelAdapter: BaseAdapter? = null
    private var iptvSelectedChannelKey: String = ""
    private var iptvOriginalSystemUi: Int? = null
    private var iptvOriginalOrientation: Int? = null
    private var iptvOriginalBrightness: Float? = null
    private var famContainer: LinearLayout? = null
    private var famWebView: WebView? = null
    private var famCustomView: View? = null
    private var famCustomViewCallback: WebChromeClient.CustomViewCallback? = null
    private var famOriginalSystemUi: Int? = null
    private var famOriginalOrientation: Int? = null

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


    /** نمایش صفحه رسمی فام در WebView داخلی؛ تبلیغات و کنترل‌های خود سایت حفظ می‌شوند. */
    @PluginMethod
    fun openOfficialPage(call: PluginCall) {
        val raw = call.getString("url") ?: "https://www.fam.ir/channels"
        val parsed = try { URL(raw) } catch (_: Exception) {
            call.reject("invalid_official_url")
            return
        }
        if (parsed.protocol != "https" || !(parsed.host == "www.fam.ir" || parsed.host == "fam.ir")) {
            call.reject("only_official_fam_https_urls_allowed")
            return
        }
        val act = activity ?: return call.reject("Activity not available")
        act.runOnUiThread {
            try {
                closeFamPageInternal()
                famOriginalOrientation = act.requestedOrientation
                act.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
                player?.pause()
                playerView?.visibility = View.GONE

                val root = LinearLayout(act).apply {
                    orientation = LinearLayout.VERTICAL
                    setBackgroundColor(Color.BLACK)
                    layoutDirection = View.LAYOUT_DIRECTION_RTL
                }
                val toolbar = LinearLayout(act).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                    setPadding(8, 8, 8, 8)
                    setBackgroundColor(Color.rgb(20, 20, 20))
                }
                val back = Button(act).apply { text = "بازگشت" }
                val close = Button(act).apply { text = "بستن" }
                val title = TextView(act).apply {
                    text = "تلویزیون فام"
                    setTextColor(Color.WHITE)
                    textSize = 16f
                    gravity = Gravity.CENTER
                    layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
                }
                val web = WebView(act).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    settings.loadsImagesAutomatically = true
                    settings.javaScriptCanOpenWindowsAutomatically = true
                    settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
                    CookieManager.getInstance().setAcceptCookie(true)
                    CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                    webChromeClient = object : WebChromeClient() {
                        override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                            if (famCustomView != null) {
                                callback.onCustomViewHidden()
                                return
                            }
                            val decor = act.window.decorView as? ViewGroup ?: run {
                                callback.onCustomViewHidden()
                                return
                            }
                            famCustomView = view
                            famCustomViewCallback = callback
                            famOriginalSystemUi = decor.systemUiVisibility
                            toolbar.visibility = View.GONE
                            root.visibility = View.GONE
                            decor.addView(view, ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            ))
                            decor.systemUiVisibility = (
                                View.SYSTEM_UI_FLAG_FULLSCREEN or
                                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            )
                            act.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
                        }

                        override fun onHideCustomView() {
                            exitFamFullscreen(act)
                        }
                    }
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                            return request.url.scheme != "https"
                        }
                    }
                }
                back.setOnClickListener {
                    if (web.canGoBack()) web.goBack() else closeFamPageInternal()
                }
                close.setOnClickListener { closeFamPageInternal() }
                toolbar.addView(back)
                toolbar.addView(title)
                toolbar.addView(close)
                root.addView(toolbar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
                root.addView(web, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
                act.addContentView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                famContainer = root
                famWebView = web
                web.loadUrl(parsed.toString())
                call.resolve(JSObject().put("status", "opening"))
            } catch (e: Exception) {
                closeFamPageInternal()
                call.reject("official_page_open_failed: " + (e.message ?: e.javaClass.simpleName))
            }
        }
    }

    @PluginMethod
    fun closeOfficialPage(call: PluginCall) {
        activity?.runOnUiThread {
            closeFamPageInternal()
            playerView?.visibility = View.VISIBLE
            call.resolve()
        } ?: call.reject("Activity not available")
    }

    private fun exitFamFullscreen(act: android.app.Activity) {
        val view = famCustomView ?: return
        try {
            (view.parent as? ViewGroup)?.removeView(view)
            famCustomViewCallback?.onCustomViewHidden()
        } catch (_: Exception) {}
        famCustomView = null
        famCustomViewCallback = null
        val decor = act.window.decorView
        famOriginalSystemUi?.let { decor.systemUiVisibility = it }
        famOriginalSystemUi = null
        famContainer?.visibility = View.VISIBLE
        famContainer?.getChildAt(0)?.visibility = View.VISIBLE
    }

    private fun closeFamPageInternal() {
        try {
            activity?.let { act ->
                if (famCustomView != null) exitFamFullscreen(act)
                famOriginalOrientation?.let { act.requestedOrientation = it }
                famOriginalOrientation = null
            }
            famWebView?.let { it.stopLoading(); it.loadUrl("about:blank"); it.destroy() }
            famContainer?.let { (it.parent as? ViewGroup)?.removeView(it) }
        } catch (_: Exception) {}
        famWebView = null
        famContainer = null
        playerView?.visibility = View.VISIBLE
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
                    iptvHttpFactory = httpFactory

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
                    installLockOverlay(playerView!!, act)
                }
                playerView?.player = player
                playerView?.visibility = android.view.View.VISIBLE
                val requestedUserAgent = call.getString("userAgent")?.trim()
                    ?.takeIf { it.isNotEmpty() && it.length <= 512 && !it.contains('\r') && !it.contains('\n') }
                iptvHttpFactory?.setUserAgent(requestedUserAgent ?: "VLC/3.0.20 LibVLC/3.0.20")
                val mimeType = call.getString("mimeType")?.trim()?.takeIf { it.isNotEmpty() }
                val mediaItem = MediaItem.Builder().setUri(url).apply {
                    if (mimeType != null) setMimeType(mimeType)
                }.build()
                player?.setMediaItem(mediaItem)
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

    private fun installLockOverlay(target: PlayerView, act: android.app.Activity) {
        val overlay = FrameLayout(act).apply {
            setBackgroundColor(Color.TRANSPARENT)
            isClickable = true
            isFocusable = true
            visibility = View.GONE
        }
        val unlock = Button(act).apply {
            text = "🔓 بازکردن قفل"
            isAllCaps = false
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.argb(220, 25, 25, 25))
            setOnClickListener {
                isPlayerLocked = false
                overlay.visibility = View.GONE
                notifyListeners("lockChanged", JSObject().put("locked", false))
            }
        }
        val buttonParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.TOP or Gravity.CENTER_HORIZONTAL
        ).apply { topMargin = (18 * act.resources.displayMetrics.density).toInt() }
        overlay.addView(unlock, buttonParams)
        target.addView(overlay, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ))
        lockOverlay = overlay
    }

    @PluginMethod
    fun setLocked(call: PluginCall) {
        val locked = call.getBoolean("locked") ?: false
        activity?.runOnUiThread {
            try {
                val overlay = lockOverlay
                if (overlay == null) {
                    call.reject("player_view_unavailable")
                    return@runOnUiThread
                }
                isPlayerLocked = locked
                overlay.visibility = if (locked) View.VISIBLE else View.GONE
                notifyListeners("lockChanged", JSObject().put("locked", locked))
                call.resolve(JSObject().put("locked", locked))
            } catch (e: Exception) {
                call.reject("set_locked_failed: " + (e.message ?: e.javaClass.simpleName))
            }
        } ?: call.reject("Activity not available")
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

    /** تمام‌صفحهٔ IPTV: دکمهٔ خروج بومی بالای PlayerView قرار می‌گیرد تا زیر لایهٔ ویدئو نماند. */

    @PluginMethod
    fun setChannelMenu(call: PluginCall) {
        // JSON را بیرون از UI thread بخوان؛ ساخت ردیف‌ها به‌صورت تنبل توسط ListView انجام می‌شود.
        val parsed = try {
            JSONArray(call.getString("channelsJson") ?: "[]")
        } catch (e: Exception) {
            call.reject("invalid_channel_list")
            return
        }
        val selected = call.getString("selectedKey") ?: iptvSelectedChannelKey
        activity?.runOnUiThread {
            iptvChannelRows = parsed
            iptvSelectedChannelKey = selected
            filterIptvChannels(iptvChannelSearch?.text?.toString().orEmpty())
            refreshIptvChannelMenu()
            call.resolve()
        } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun setSelectedChannel(call: PluginCall) {
        iptvSelectedChannelKey = call.getString("key") ?: ""
        activity?.runOnUiThread {
            refreshIptvChannelMenu()
            call.resolve()
        } ?: call.reject("Activity not available")
    }

    private fun filterIptvChannels(query: String) {
        val needle = query.trim().lowercase(Locale.ROOT)
        iptvFilteredChannels.clear()
        for (i in 0 until iptvChannelRows.length()) {
            val item = iptvChannelRows.optJSONObject(i) ?: continue
            val name = item.optString("name", "")
            val group = item.optString("group", "")
            if (needle.isEmpty() ||
                name.lowercase(Locale.ROOT).contains(needle) ||
                group.lowercase(Locale.ROOT).contains(needle)
            ) iptvFilteredChannels.add(item)
        }
        iptvChannelAdapter?.notifyDataSetChanged()
    }

    private fun refreshIptvChannelMenu() {
        // ListView فقط ردیف‌های قابل مشاهده را می‌سازد و برای اسکرول، viewها را بازیافت می‌کند.
        iptvChannelAdapter?.notifyDataSetChanged()
    }

    private fun showIptvChannelMenu(act: android.app.Activity) {
        if (iptvChannelMenuButton == null) {
            val button = Button(act).apply {
                text = "☷"
                contentDescription = "فهرست شبکه‌ها"
                textSize = 23f
                isAllCaps = false
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.argb(220, 25, 25, 25))
                setOnClickListener {
                    val panel = iptvChannelMenuPanel ?: return@setOnClickListener
                    panel.visibility = if (panel.visibility == View.VISIBLE) View.GONE else View.VISIBLE
                    if (panel.visibility == View.VISIBLE) {
                        refreshIptvChannelMenu()
                        iptvChannelListView?.post { iptvChannelListView?.requestLayout() }
                    }
                }
            }
            val size = (54 * act.resources.displayMetrics.density).toInt()
            val margin = (12 * act.resources.displayMetrics.density).toInt()
            act.addContentView(button, FrameLayout.LayoutParams(size, size, Gravity.TOP or Gravity.END).apply {
                rightMargin = margin
                topMargin = margin
            })
            iptvChannelMenuButton = button
        } else iptvChannelMenuButton?.visibility = View.VISIBLE

        if (iptvChannelMenuPanel == null) {
            val panel = LinearLayout(act).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(10, 10, 10, 10)
                setBackgroundColor(Color.argb(238, 18, 22, 23))
                visibility = View.GONE
            }
            val title = TextView(act).apply {
                text = "انتخاب شبکه"
                textSize = 19f
                setTextColor(Color.WHITE)
                setPadding(12, 12, 12, 18)
            }
            panel.addView(title, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ))
            val search = EditText(act).apply {
                hint = "جست‌وجوی نام شبکه یا گروه..."
                textSize = 15f
                inputType = InputType.TYPE_CLASS_TEXT
                imeOptions = EditorInfo.IME_ACTION_SEARCH
                // Use the device standard IME (including its installed Persian/English layouts).
                setSingleLine(true)
                setTextColor(Color.WHITE)
                setHintTextColor(Color.LTGRAY)
                setPadding(16, 10, 16, 10)
                setBackgroundColor(Color.rgb(48, 53, 55))
            }
            panel.addView(search, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (8 * act.resources.displayMetrics.density).toInt()
            })
            val list = ListView(act).apply {
                divider = android.graphics.drawable.ColorDrawable(Color.argb(90, 255, 255, 255))
                dividerHeight = (1 * act.resources.displayMetrics.density).toInt().coerceAtLeast(1)
                setBackgroundColor(Color.TRANSPARENT)
                isVerticalScrollBarEnabled = true
                overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
                setPadding(0, 0, 0, 8)
                clipToPadding = false
            }
            iptvChannelAdapter = object : BaseAdapter() {
                override fun getCount(): Int = iptvFilteredChannels.size
                override fun getItem(position: Int): Any? = iptvFilteredChannels.getOrNull(position)
                override fun getItemId(position: Int): Long = position.toLong()
                override fun getView(position: Int, convertView: View?, parent: android.view.ViewGroup): View {
                    val row = (convertView as? TextView) ?: TextView(act).apply {
                        textSize = 17f
                        setTextColor(Color.WHITE)
                        setPadding(18, 16, 14, 16)
                        isClickable = true
                        isFocusable = true
                        minHeight = (58 * act.resources.displayMetrics.density).toInt()
                    }
                    val item = iptvFilteredChannels.getOrNull(position)
                    val key = item?.optString("key") ?: ""
                    val name = item?.optString("name", "شبکه") ?: "شبکه"
                    val group = item?.optString("group", "") ?: ""
                    row.text = (if (key == iptvSelectedChannelKey) "●  " else "○  ") +
                        name + if (group.isNotBlank()) "\\n" + group else ""
                    row.setBackgroundColor(
                        if (key == iptvSelectedChannelKey) Color.rgb(35, 91, 72) else Color.rgb(39, 43, 45)
                    )
                    row.setOnClickListener {
                        notifyListeners("channelSelected", JSObject().put("key", key))
                        iptvChannelMenuPanel?.visibility = View.GONE
                    }
                    return row
                }
            }
            list.adapter = iptvChannelAdapter
            search.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                    filterIptvChannels(s?.toString().orEmpty())
                    list.setSelection(0)
                }
                override fun afterTextChanged(s: Editable?) {}
            })
            iptvChannelSearch = search
            panel.addView(list, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
            ))
            val width = (act.resources.displayMetrics.widthPixels * 0.42f).toInt().coerceAtLeast(260)
            val top = (74 * act.resources.displayMetrics.density).toInt()
            act.addContentView(panel, FrameLayout.LayoutParams(width, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.END or Gravity.TOP).apply {
                topMargin = top
                bottomMargin = (12 * act.resources.displayMetrics.density).toInt()
                rightMargin = (8 * act.resources.displayMetrics.density).toInt()
            })
            iptvChannelListView = list
            iptvChannelMenuPanel = panel
        }
        refreshIptvChannelMenu()
    }

    @PluginMethod
    fun setFullscreen(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: false
        val act = activity ?: return call.reject("Activity not available")
        act.runOnUiThread {
            try {
                if (enabled) {
                    val decor = act.window.decorView
                    if (iptvOriginalSystemUi == null) iptvOriginalSystemUi = decor.systemUiVisibility
                    if (iptvOriginalOrientation == null) iptvOriginalOrientation = act.requestedOrientation
                    act.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
                    decor.systemUiVisibility = (
                        View.SYSTEM_UI_FLAG_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    )
                    if (iptvFullscreenButton == null) {
                        val button = Button(act).apply {
                            text = "×"
                            contentDescription = "خروج از تمام‌صفحه"
                            textSize = 25f
                            isAllCaps = false
                            setTextColor(Color.WHITE)
                            setBackgroundColor(Color.argb(190, 25, 25, 25))
                            setOnClickListener {
                                notifyListeners("fullscreenExit", JSObject())
                            }
                        }
                        val size = (48 * act.resources.displayMetrics.density).toInt()
                        val margin = (10 * act.resources.displayMetrics.density).toInt()
                        act.addContentView(button, FrameLayout.LayoutParams(size, size, Gravity.TOP or Gravity.START).apply {
                            leftMargin = margin
                            topMargin = margin
                        })
                        iptvFullscreenButton = button
                    } else {
                        iptvFullscreenButton?.visibility = View.VISIBLE
                    }
                    showIptvChannelMenu(act)
                } else {
                    exitIptvFullscreen(act)
                }
                call.resolve()
            } catch (e: Exception) {
                call.reject("setFullscreen failed: " + (e.message ?: e.javaClass.simpleName))
            }
        }
    }

    private fun exitIptvFullscreen(act: android.app.Activity) {
        try {
            iptvFullscreenButton?.let { button ->
                (button.parent as? ViewGroup)?.removeView(button)
            }
            iptvFullscreenButton = null
            iptvChannelMenuButton?.let { (it.parent as? ViewGroup)?.removeView(it) }
            iptvChannelMenuButton = null
            iptvChannelMenuPanel?.let { (it.parent as? ViewGroup)?.removeView(it) }
            iptvChannelMenuPanel = null
            iptvChannelSearch = null
            iptvChannelListView = null
            iptvFilteredChannels.clear()
            iptvOriginalBrightness?.let { original ->
                val attrs = act.window.attributes
                attrs.screenBrightness = original
                act.window.attributes = attrs
            }
            iptvOriginalBrightness = null
            iptvOriginalSystemUi?.let { act.window.decorView.systemUiVisibility = it }
            iptvOriginalSystemUi = null
            iptvOriginalOrientation?.let { act.requestedOrientation = it }
            iptvOriginalOrientation = null
        } catch (e: Exception) {
            Log.w("NaghmeVideoPlayer", "Could not restore IPTV fullscreen UI", e)
        }
    }

    @PluginMethod
    fun setVisible(call: PluginCall) {
        val visible = call.getBoolean("visible") ?: true
        activity?.runOnUiThread {
            playerView?.visibility = if (visible) android.view.View.VISIBLE else android.view.View.GONE
            call.resolve()
        } ?: call.reject("Activity not available")
    }

    private fun updateScreenKeepOn(keepOn: Boolean) {
        activity?.window?.let { window ->
            if (keepOn) window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    private fun setupListeners() {
        player?.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                val d = JSObject()
                when (state) {
                    Player.STATE_READY -> { d.put("state", "ready"); notifyListeners("ready", d) }
                    Player.STATE_BUFFERING -> { d.put("state", "buffering"); notifyListeners("buffering", d) }
                    Player.STATE_ENDED -> { activity?.runOnUiThread { updateScreenKeepOn(false) }; d.put("state", "ended"); notifyListeners("ended", d) }
                }
            }
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                activity?.runOnUiThread { updateScreenKeepOn(isPlaying) }
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
            updateScreenKeepOn(false)
            call.resolve()
        } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        activity?.runOnUiThread { player?.pause(); updateScreenKeepOn(false); call.resolve() } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        activity?.runOnUiThread { player?.play(); updateScreenKeepOn(true); call.resolve() } ?: call.reject("Activity not available")
    }

    /** کنترل‌های پایه برای هماهنگی IPTV با رابط مشترک پلیر. */
    @PluginMethod
    fun seekTo(call: PluginCall) {
        val positionMs = (call.getLong("positionMs") ?: 0L).coerceAtLeast(0L)
        activity?.runOnUiThread {
            try {
                player?.seekTo(positionMs)
                call.resolve()
            } catch (e: Exception) {
                call.reject("seek_failed: " + (e.message ?: e.javaClass.simpleName))
            }
        } ?: call.reject("Activity not available")
    }

    /** محدودکردن وضوح ویدئو برای اینترنت ضعیف؛ صفر یعنی انتخاب تطبیقی خودکار. */
    @PluginMethod
    fun setVideoQuality(call: PluginCall) {
        val maxHeight = (call.getInt("maxHeight") ?: 0).coerceIn(0, 2160)
        activity?.runOnUiThread {
            try {
                val p = player ?: throw IllegalStateException("player_not_ready")
                val builder = p.trackSelectionParameters.buildUpon()
                if (maxHeight <= 0) builder.setMaxVideoSize(Int.MAX_VALUE, Int.MAX_VALUE)
                else builder.setMaxVideoSize(Int.MAX_VALUE, maxHeight)
                p.trackSelectionParameters = builder.build()
                call.resolve(JSObject().put("maxHeight", maxHeight))
            } catch (e: Exception) {
                call.reject("video_quality_failed: " + (e.message ?: e.javaClass.simpleName))
            }
        } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun setVolume(call: PluginCall) {
        val volume = (call.getFloat("volume") ?: 1f).coerceIn(0f, 1f)
        activity?.runOnUiThread {
            try {
                player?.volume = volume
                call.resolve(JSObject().put("volume", volume))
            } catch (e: Exception) {
                call.reject("volume_failed: " + (e.message ?: e.javaClass.simpleName))
            }
        } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun setBrightness(call: PluginCall) {
        val brightness = (call.getFloat("brightness") ?: 0.7f).coerceIn(0.05f, 1f)
        val act = activity ?: return call.reject("Activity not available")
        act.runOnUiThread {
            try {
                val attrs = act.window.attributes
                if (iptvOriginalBrightness == null) iptvOriginalBrightness = attrs.screenBrightness
                attrs.screenBrightness = brightness
                act.window.attributes = attrs
                call.resolve(JSObject().put("brightness", brightness))
            } catch (e: Exception) {
                call.reject("brightness_failed: " + (e.message ?: e.javaClass.simpleName))
            }
        }
    }

    @PluginMethod
    fun setSpeed(call: PluginCall) {
        val speed = (call.getFloat("speed") ?: 1f).coerceIn(0.25f, 3f)
        activity?.runOnUiThread {
            try {
                player?.setPlaybackSpeed(speed)
                call.resolve()
            } catch (e: Exception) {
                call.reject("speed_failed: " + (e.message ?: e.javaClass.simpleName))
            }
        } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        activity?.runOnUiThread {
            try {
                val p = player
                val out = JSObject()
                out.put("positionMs", p?.currentPosition ?: 0L)
                out.put("durationMs", p?.duration?.takeIf { it > 0 } ?: 0L)
                out.put("isPlaying", p?.isPlaying ?: false)
                out.put("speed", p?.playbackParameters?.speed ?: 1f)
                call.resolve(out)
            } catch (e: Exception) {
                call.reject("status_failed: " + (e.message ?: e.javaClass.simpleName))
            }
        } ?: call.reject("Activity not available")
    }

    @PluginMethod
    fun release(call: PluginCall) {
        activity?.runOnUiThread {
            try {
                playerView?.let { pv -> (pv.parent as? ViewGroup)?.removeView(pv) }
                playerView = null
                lockOverlay = null
                isPlayerLocked = false
                player?.release()
                player = null
                updateScreenKeepOn(false)
                call.resolve()
            } catch (e: Exception) {
                call.reject("Release failed: " + e.message)
            }
        } ?: call.reject("Activity not available")
    }

    override fun handleOnDestroy() {
        try {
            activity?.let { exitIptvFullscreen(it); updateScreenKeepOn(false) }
            closeFamPageInternal()
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
