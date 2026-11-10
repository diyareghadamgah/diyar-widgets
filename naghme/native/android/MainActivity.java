package ir.diyareghadamgah.naghme;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // مهم: ثبت پلاگین سفارشی باید «قبل از» super.onCreate باشد. Bridge داخل super.onCreate ساخته می‌شود
        // و پلاگینی که بعد از آن ثبت شود هرگز به Bridge نمی‌رسد (نتیجه: «plugin is not implemented» یا null در جاوااسکریپت).
        registerPlugin(NaghmeStoragePlugin.class);
        registerPlugin(NaghmeVideoPlayerPlugin.class);
        registerPlugin(NaghmeLibraryVideoPlayerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
