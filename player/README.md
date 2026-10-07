# دیار پلیر — Diyar Player v1.0

نسخه حرفه‌ای اولیه بر پایه Player موجود دیار قدمگاه، با حفظ مسیر `/player/` و بدون وابستگی خارجی.

## امکانات
- کتابخانه آنلاین از `playlist.json`
- افزودن فایل صوتی/ویدئویی از دستگاه در همان نشست
- علاقه‌مندی‌ها، تاریخچه، صف پخش
- Shuffle / Repeat / Seek / Volume / Speed
- Sleep Timer
- Media Session برای کنترل سیستم/هدست در مرورگرهای پشتیبان
- پوسته روشن و تاریک
- PWA و Service Worker سازگار با مسیر GitHub Pages
- Service Worker فایل‌های موسیقی را Cache نمی‌کند تا Range Request خراب نشود.

## انتشار
محتویات این پوشه را در `diyar-widgets/player/` قرار دهید و Commit کنید. آدرس GitHub Pages پروژه با همان مسیر `/diyar-news/player/` قابل استفاده است.

## افزودن موسیقی واقعی
فایل‌های صوتی را در `music/` قرار دهید و اطلاعات آنها را در `playlist.json` ثبت کنید. مسیرها باید نسبی و با `/player/` سازگار باشند.
