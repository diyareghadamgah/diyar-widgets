package ir.diyareghadamgah.naghme;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.UriPermission;
import android.database.Cursor;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * پلاگین بومی نغمه: دسترسی دائمی به پوشه/فایل‌های موسیقی با Storage Access Framework.
 * مجوز با takePersistableUriPermission() ذخیره می‌شود و بعد از بستن برنامه (و حتی ریستارت گوشی) باقی می‌ماند.
 * هیچ فایلی نوشته، جابه‌جا یا حذف نمی‌شود؛ فقط مجوز «خواندن» گرفته می‌شود.
 */
@CapacitorPlugin(name = "NaghmeStorage")
public class NaghmeStoragePlugin extends Plugin {

    private static final int FLAGS = Intent.FLAG_GRANT_READ_URI_PERMISSION
            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
            | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION;
    private static final int MAX_CHUNK = 4 * 1024 * 1024;
    private static final String[] AUDIO_EXT = {".mp3", ".m4a", ".aac", ".flac", ".ogg", ".opus", ".wav", ".wma"};

    /* ---------- بررسی سلامت پل (برای تشخیص در برنامه) ---------- */
    @PluginMethod
    public void ping(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ok", true);
        r.put("plugin", "NaghmeStorage");
        r.put("sdk", android.os.Build.VERSION.SDK_INT);
        call.resolve(r);
    }

    /* ---------- انتخاب پوشه ---------- */
    @PluginMethod
    public void pickDirectory(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(FLAGS);
        startActivityForResult(call, i, "onDirPicked");
    }

    @ActivityCallback
    private void onDirPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent d = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || d == null || d.getData() == null) {
            JSObject o = new JSObject();
            o.put("cancelled", true);
            call.resolve(o);
            return;
        }
        Uri tree = d.getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception e) {
            call.reject("persist_failed: " + e.getMessage());
            return;
        }
        JSObject o = new JSObject();
        o.put("uri", tree.toString());
        o.put("name", treeName(tree));
        call.resolve(o);
    }

    /* ---------- انتخاب چند فایل ---------- */
    @PluginMethod
    public void pickFiles(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("*/*");
        i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"audio/*", "application/ogg"});
        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        i.addFlags(FLAGS);
        startActivityForResult(call, i, "onFilesPicked");
    }

    @ActivityCallback
    private void onFilesPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent d = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || d == null) {
            JSObject o = new JSObject();
            o.put("cancelled", true);
            call.resolve(o);
            return;
        }
        List<Uri> uris = new ArrayList<>();
        if (d.getClipData() != null) {
            for (int k = 0; k < d.getClipData().getItemCount(); k++) uris.add(d.getClipData().getItemAt(k).getUri());
        } else if (d.getData() != null) {
            uris.add(d.getData());
        }
        ContentResolver cr = getContext().getContentResolver();
        JSArray out = new JSArray();
        for (Uri u : uris) {
            try {
                cr.takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {
                // برخی ارائه‌دهنده‌ها مجوز دائمی نمی‌دهند؛ فایل در همین نشست خوانده می‌شود
            }
            String name = null;
            long size = 0;
            Cursor c = null;
            try {
                c = cr.query(u, new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}, null, null, null);
                if (c != null && c.moveToFirst()) {
                    name = c.getString(0);
                    size = c.isNull(1) ? 0 : c.getLong(1);
                }
            } catch (Exception ignored) {
            } finally {
                if (c != null) c.close();
            }
            if (name == null) name = u.getLastPathSegment();
            if (!isAudio(name, null) && !isAudio(name, cr.getType(u))) continue;
            JSObject o = new JSObject();
            o.put("uri", u.toString());
            o.put("name", name);
            o.put("size", size);
            o.put("lastModified", 0);
            o.put("rel", name);
            out.put(o);
        }
        JSObject res = new JSObject();
        res.put("files", out);
        call.resolve(res);
    }

    /* ---------- فهرست بازگشتی فایل‌های صوتی یک پوشه‌ی ذخیره‌شده ---------- */
    @PluginMethod
    public void listAudio(PluginCall call) {
        String treeStr = call.getString("uri");
        if (treeStr == null) {
            call.reject("uri required");
            return;
        }
        try {
            Uri tree = Uri.parse(treeStr);
            ContentResolver cr = getContext().getContentResolver();
            JSArray out = new JSArray();
            ArrayDeque<String[]> stack = new ArrayDeque<>();
            stack.push(new String[]{DocumentsContract.getTreeDocumentId(tree), ""});
            while (!stack.isEmpty()) {
                String[] cur = stack.pop();
                Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, cur[0]);
                Cursor c = null;
                try {
                    c = cr.query(children, new String[]{
                            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                            DocumentsContract.Document.COLUMN_MIME_TYPE,
                            DocumentsContract.Document.COLUMN_SIZE,
                            DocumentsContract.Document.COLUMN_LAST_MODIFIED}, null, null, null);
                    if (c == null) continue;
                    while (c.moveToNext()) {
                        String id = c.getString(0);
                        String name = c.getString(1);
                        String mime = c.getString(2);
                        if (name == null) continue;
                        String rel = cur[1].isEmpty() ? name : cur[1] + "/" + name;
                        if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                            stack.push(new String[]{id, rel});
                        } else if (isAudio(name, mime)) {
                            JSObject o = new JSObject();
                            o.put("uri", DocumentsContract.buildDocumentUriUsingTree(tree, id).toString());
                            o.put("name", name);
                            o.put("size", c.isNull(3) ? 0L : c.getLong(3));
                            o.put("lastModified", c.isNull(4) ? 0L : c.getLong(4));
                            o.put("rel", rel);
                            out.put(o);
                        }
                    }
                } finally {
                    if (c != null) c.close();
                }
            }
            JSObject res = new JSObject();
            res.put("files", out);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("list_failed: " + e.getMessage());
        }
    }

    /* ---------- خواندن تکه‌ای از فایل (Base64) ---------- */
    @PluginMethod
    public void readChunk(PluginCall call) {
        JSObject d = call.getData();
        String u = d.optString("uri", null);
        long off = d.optLong("offset", 0L);
        int len = d.optInt("length", 1024 * 1024);
        if (u == null || off < 0 || len <= 0) {
            call.reject("bad_args");
            return;
        }
        if (len > MAX_CHUNK) len = MAX_CHUNK;
        try {
            byte[] buf = new byte[len];
            int n = readAt(Uri.parse(u), off, buf);
            JSObject r = new JSObject();
            r.put("data", Base64.encodeToString(buf, 0, n, Base64.NO_WRAP));
            r.put("length", n);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("read_failed: " + e.getMessage());
        }
    }

    private int readAt(Uri uri, long off, byte[] buf) throws IOException {
        ContentResolver cr = getContext().getContentResolver();
        try (ParcelFileDescriptor pfd = cr.openFileDescriptor(uri, "r");
             FileInputStream in = new ParcelFileDescriptor.AutoCloseInputStream(pfd)) {
            in.getChannel().position(off);
            return fill(in, buf);
        } catch (IOException | NullPointerException seekFailed) {
            // ارائه‌دهنده‌ی غیرقابل‌جست‌وجو: خواندن ترتیبی با skip
            try (InputStream in = cr.openInputStream(uri)) {
                if (in == null) throw new IOException("cannot open " + uri);
                long left = off;
                while (left > 0) {
                    long s = in.skip(left);
                    if (s <= 0) break;
                    left -= s;
                }
                if (left > 0) return 0;
                return fill(in, buf);
            }
        }
    }

    private static int fill(InputStream in, byte[] buf) throws IOException {
        int n = 0;
        while (n < buf.length) {
            int r = in.read(buf, n, buf.length - n);
            if (r < 0) break;
            n += r;
        }
        return n;
    }

    /* ---------- مدت آهنگ (ثانیه) ---------- */
    @PluginMethod
    public void duration(PluginCall call) {
        String u = call.getString("uri");
        if (u == null) {
            call.reject("uri required");
            return;
        }
        MediaMetadataRetriever m = new MediaMetadataRetriever();
        try {
            m.setDataSource(getContext(), Uri.parse(u));
            String ms = m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            if (ms == null) {
                call.reject("no_duration");
                return;
            }
            JSObject r = new JSObject();
            r.put("duration", Long.parseLong(ms) / 1000.0);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("duration_failed: " + e.getMessage());
        } finally {
            try {
                m.release();
            } catch (Exception ignored) {
            }
        }
    }

    /* ---------- پوشه‌های دارای مجوز دائمی ---------- */
    @PluginMethod
    public void getPersisted(PluginCall call) {
        JSArray out = new JSArray();
        List<UriPermission> ps = getContext().getContentResolver().getPersistedUriPermissions();
        for (UriPermission p : ps) {
            Uri u = p.getUri();
            if (p.isReadPermission() && u.toString().contains("/tree/")) {
                JSObject o = new JSObject();
                o.put("uri", u.toString());
                o.put("name", treeName(u));
                out.put(o);
            }
        }
        JSObject res = new JSObject();
        res.put("trees", out);
        call.resolve(res);
    }

    @PluginMethod
    public void releaseTree(PluginCall call) {
        String u = call.getString("uri");
        if (u == null) {
            call.reject("uri required");
            return;
        }
        try {
            getContext().getContentResolver().releasePersistableUriPermission(Uri.parse(u), Intent.FLAG_GRANT_READ_URI_PERMISSION);
            call.resolve();
        } catch (Exception e) {
            call.reject("release_failed: " + e.getMessage());
        }
    }

    /* ---------- کمکی‌ها ---------- */
    private static String treeName(Uri tree) {
        String id;
        try {
            id = DocumentsContract.getTreeDocumentId(tree);
        } catch (Exception e) {
            return "پوشه";
        }
        int slash = id.lastIndexOf('/');
        String n = slash >= 0 ? id.substring(slash + 1) : id.substring(id.indexOf(':') + 1);
        return n.isEmpty() ? "حافظه" : n;
    }

    private static boolean isAudio(String name, String mime) {
        if (mime != null && mime.startsWith("audio/")) return true;
        if (name == null) return false;
        String l = name.toLowerCase(Locale.ROOT);
        for (String e : AUDIO_EXT) if (l.endsWith(e)) return true;
        return false;
    }
}
