# تولید کارت تقویم روزانه

ابزار ساخت کارت تقویم روزانه با تاریخ شمسی، قمری و میلادی، ذکر روز، عکس، لوگو و QR کد.
بدون سرور و بدون نصب؛ فقط چند فایل ثابت.

## ساختار پوشه‌ها
```
calendar/
├─ index.html              صفحهٔ اصلی
├─ manifest.json           اطلاعات نصب روی گوشی (PWA)
├─ sw.js                   ذخیره برای استفادهٔ آفلاین
├─ css/style.css           ظاهر صفحه
├─ js/
│  ├─ registry.js          ثبت قالب‌ها و قالب پیش‌فرض
│  ├─ shared.js            آیکن‌ها و ابزارهای مشترک نقاشی
│  ├─ themed.js            چیدمان مشترک قالب‌های رنگی و مناسبتی
│  ├─ app.js               منطق برنامه (تاریخ، عکس، خروجی‌ها)
│  ├─ accordion.js         منوهای کشویی تنظیمات
│  └─ templates/
│     ├─ royal.js، nightsky.js، turquoise.js، rosegold.js   قالب‌های عمومی
│     ├─ classic.js، light.js، blackgold.js، ribbon.js      قالب‌های عمومی
│     └─ occasions/        ← قالب‌های مناسبتی (هر کدام یک فایل کوچک)
│        ramadan، muharram، eid، ghadir، shaban15، milad، shahadat،
│        fatemiyeh، qadr، jome، nowruz، yalda، melli، mothersday، fathersday
└─ assets/icons/           آیکن‌های برنامه
```

## قالب‌های مناسبتی
رمضان، محرم، عید فطر، غدیر، نیمه شعبان، ولادت، شهادت، فاطمیه، شب قدر، جمعه، نوروز، یلدا، ملی و انقلاب، روز مادر، روز پدر.
در لیست قالب‌ها زیر عنوان «مناسبتی» جدا از قالب‌های عمومی نمایش داده می‌شوند.

## افزودن قالب مناسبتی جدید
1. یکی از فایل‌های `js/templates/occasions/` (مثلاً `nowruz.js`) را کپی کنید و اسمش را عوض کنید.
2. `id` و `label` و رنگ‌ها را عوض کنید. `shape` شکل عکس است: `circle`، `arch` یا `round`.
   در `scene` زمینه را بسازید: `bg` (رنگ‌های زمینه)، `glow` (درخشش)، `star8`، `dots`، `petals`، `confetti`، `moon`، `blossoms`.
   برای زمینهٔ تیره از `darkTheme` و برای روشن از `lightTheme` استفاده کنید.
3. در `index.html` یک خط `<script src="js/templates/occasions/نام.js"></script>` قبل از `app.js` اضافه کنید.
4. در `sw.js` مسیر فایل را به `CORE` اضافه کنید و عدد نسخه را بالا ببرید.

برای قالب با چیدمان کاملاً متفاوت، یکی از فایل‌های `js/templates/` را الگو بگیرید.
قالب پیش‌فرض را در `js/registry.js` (`DEFAULT_TEMPLATE`) عوض کنید.

## انتشار با GitHub Pages
1. همهٔ فایل‌ها و پوشه‌ها را داخل پوشهٔ `calendar` مخزن بگذارید و commit کنید.
2. در مخزن: **Settings ← Pages**، منبع را شاخهٔ `main` و پوشهٔ `/ (root)` بگذارید.
3. آدرس برنامه: `https://diyareghadamgah.github.io/diyar-widgets/calendar/`

## تغییر مقادیر پیش‌فرض
در `index.html` مقدار `value` این فیلدها را عوض کنید: `id="channel"` (نام کانال)، `id="channelUrl"` (لینک کانال) و `id="phone"` (شماره تماس).

## بعد از هر تغییر
عدد `diyar-calendar-v6` را در `sw.js` بالا ببرید (مثلاً `v7`) تا کاربران نسخهٔ جدید را بگیرند.

## نیازمندی‌ها
اولین بار به اینترنت نیاز است (فونت Vazirmatn، کتابخانهٔ JSZip و QR از CDN بارگذاری می‌شوند)؛ بعد از آن در کش مرورگر می‌ماند.
