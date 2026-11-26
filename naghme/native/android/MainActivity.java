package ir.diyareghadamgah.naghme;

import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN &&
                (event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_UP ||
                 event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_DOWN) &&
                NaghmeVideoPlayerPlugin.handleHardwareVolumeKey(event.getKeyCode())) {
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // مهم: ثبت پلاگین سفارشی باید «قبل از» super.onCreate باشد. Bridge داخل super.onCreate ساخته می‌شود
        // و پلاگینی که بعد از آن ثبت شود هرگز به Bridge نمی‌رسد (نتیجه: «plugin is not implemented» یا null در جاوااسکریپت).
        registerPlugin(NaghmeStoragePlugin.class);
        registerPlugin(NaghmeVideoPlayerPlugin.class);
        registerPlugin(NaghmeLibraryVideoPlayerPlugin.class);
        super.onCreate(savedInstanceState);
        // Allow HTTP (mixed content) in WebView — needed for IRIB radio (http://s1.cdn1.iranseda.ir:1935)
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                settings.setAllowContentAccess(true);
                settings.setAllowFileAccess(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Exception e) {
            android.util.Log.e("NaghmeMain", "Failed to enable mixed content", e);
        }

    }
}
