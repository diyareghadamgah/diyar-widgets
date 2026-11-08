package ir.diyareghadamgah.naghme;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NaghmeStoragePlugin.class);   // پلاگین بومی باید قبل از super.onCreate ثبت شود
        super.onCreate(savedInstanceState);
    }

    /**
     * آزمایشی: WebView به‌طور پیش‌فرض با رفتن برنامه به پس‌زمینه متوقف می‌شود و صدا قطع می‌شود.
     * این کد WebView را فعال نگه می‌دارد تا پخش موسیقی ادامه یابد. روی گوشی واقعی آزمایش شود.
     */
    @Override
    public void onPause() {
        super.onPause();
        if (getBridge() != null) {
            WebView w = getBridge().getWebView();
            if (w != null) {
                w.onResume();
                w.resumeTimers();
            }
        }
    }
}
