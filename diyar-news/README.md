# 📰 دیار قدمگاه - اخبار فوری ایران

Aggregator خودکار اخبار ایران و جهان از ۱۷ منبع معتبر خبری:

- **ایرنا** (IRNA)
- **ایسنا** (ISNA)
- **مهر** (Mehr)
- **تسنیم** (Tasnim)
- **فارس** (Fars)
- **ایلنا** (ILNA)
- **خبرآنلاین** (Khabar Online)
- **ایمنا** (IMNA)
- **بی‌بی‌سی فارسی** (BBC Persian)
- **دویچه‌وله فارسی** (DW Persian)
- **رادیو فردا** (Radio Farda)
- **خبر فوری** (KhabarFoori)
- **قدس آنلاین** (Qods Online)
- **عصر ایران** (Asr Iran)
- **تابناک** (Tabnak)
- **صدای آمریکا فارسی** (VOA Persian)
- **اطلاعات** (Ettela'at)

اخبار به‌صورت خودکار در ۷ دسته (سیاسی، اقتصادی، ورزشی، فرهنگی و هنری، اجتماعی، علمی و فناوری، بین‌الملل) دسته‌بندی می‌شوند.

## 📁 خروجی‌ها

| فایل | توضیح |
|------|--------|
| `index.html` | صفحه اصلی با نمایش کامل اخبار (به‌طور خودکار تولید می‌شود) |
| `news.html` | کپی از `index.html` برای سازگاری |
| `news.json` | داده‌های ساختاریافته برای مصرف API/ویجت‌ها |
| `news-ticker.html` | نوار اخبار متحرک برای iframe (مثلاً Blogfa) |
| `news.js` + `news.css` | قالب جایگزین (کارت‌محور با تصویر/جستجو) — در حال حاضر توسط هیچ صفحه‌ای استفاده نمی‌شود؛ برای توسعه‌ی آینده نگه‌داشته شده و باگ‌های آن رفع شده است. |

## ⏰ بروزرسانی

هر ۳۰ دقیقه یکبار با GitHub Actions (`.github/workflows/update-news.yml`) به‌طور خودکار اجرا و در صورت وجود تغییر، commit و push می‌شود. اگر همه‌ی منابع خبری در یک اجرا شکست بخورند، فایل‌های قبلی دست‌نخورده باقی می‌مانند (هیچ محتوای خالی commit نمی‌شود).

## 🚀 استفاده در Blogfa

### نوار اخبار متحرک:
```html
<iframe src="news-ticker.html" style="width:100%;height:50px;border:none;overflow:hidden;"></iframe>
```

## 🔌 استفاده در Diyar Widgets / سایر پروژه‌ها (news.json)

فایل `news.json` از طریق CORS-friendly `raw.githubusercontent.com` قابل fetch از هر دامنه‌ای است:

```
https://raw.githubusercontent.com/maghool51/diyar-widgets/main/diyar-news/news.json
```

ساختار خروجی:

```json
{
  "lastUpdate": "ISO-8601 timestamp",
  "lastUpdatePersian": "تاریخ و ساعت به فارسی",
  "totalNews": 100,
  "failedSources": ["نام منابعی که در آخرین اجرا شکست خوردند"],
  "categories": ["نام دسته‌ها"],
  "news": [
    {
      "title": "عنوان خام خبر (escape نشده)",
      "link": "https://... (فقط http/https معتبر، در غیر این صورت #)",
      "date": "تاریخ خام RSS",
      "source": "نام منبع",
      "category": "دسته تشخیص داده‌شده",
      "flag": "ایموجی پرچم"
    }
  ],
  "categorizedNews": { "نام دسته": [ /* همان ساختار news، گروه‌بندی‌شده */ ] }
}
```

> ⚠️ **نکته امنیتی مهم برای مصرف‌کنندگان:** مقادیر `title`/`summary` در `news.json` **escape نشده** ذخیره می‌شوند (چون این فایل یک لایه‌ی داده است، نه HTML). هر ویجت یا صفحه‌ای که این داده را در DOM با `innerHTML` رندر می‌کند، **باید خودش HTML را escape کند** تا در برابر XSS ناشی از محتوای احتمالاً آلوده‌ی RSS ایمن بماند (نمونه‌ی تابع `escapeHtml` در `fetch-news.js` و `news.js` موجود است).

## 🔒 امنیت

- تمام خروجی‌های HTML (`index.html`, `news.html`, `news-ticker.html`) قبل از انتشار، عنوان/منبع/لینک خبر را escape می‌کنند.
- لینک‌ها با `new URL()` اعتبارسنجی می‌شوند و فقط پروتکل‌های `http`/`https` پذیرفته می‌شوند.
- هیچ کلید API یا Secret در کد یا خروجی‌ها ذخیره نمی‌شود؛ تنها Secret مصرفی، `GITHUB_TOKEN` پیش‌فرض GitHub Actions است که در Runner تزریق می‌شود و در کد ظاهر نمی‌شود.

## 📂 موقعیت این پروژه در مخزن

این پوشه (`diyar-news`) یک **زیرپوشه** داخل مخزن بزرگ‌تر `diyar-widgets` است، نه یک مخزن مستقل:

```
diyar-widgets/                      ← ریشه‌ی مخزن
├── .github/workflows/update-news.yml   ← باید اینجا باشد (نه داخل diyar-news)
└── diyar-news/                     ← همین پوشه
    ├── fetch-news.js
    ├── news.json
    ├── index.html
    └── ...
```

⚠️ چون GitHub Actions فقط workflow های داخل `.github/workflows/` در **ریشه‌ی مخزن** را اجرا می‌کند، فایل workflow این پروژه باید در `diyar-widgets/.github/workflows/update-news.yml` قرار بگیرد. برای همین در آن فایل از `working-directory: diyar-news` استفاده شده تا دستورات (`npm ci`, `node fetch-news.js`) داخل پوشه‌ی درست اجرا شوند.

## 🛠 توسعه محلی

```bash
npm ci
node fetch-news.js
```

## 📄 License

این پروژه تحت مجوز [MIT](./LICENSE) منتشر شده است.

## 📝 Changelog

تغییرات هر نسخه در [CHANGELOG.md](./CHANGELOG.md) ثبت می‌شود.
