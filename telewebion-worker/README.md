# Naghme Telewebion Worker

این Worker واسط مستقل برای پخش وب شبکه‌های Telewebion است. Worker آمار بازدید دیار قدمگاه را تغییر نمی‌دهد.

## استقرار در Cloudflare

در تنظیمات پروژه Cloudflare:
- Root directory: `/telewebion-worker`
- Build command: خالی
- Deploy command: `npx wrangler deploy`
- Preview command: خالی (در صورت اختیاری بودن)

پس از Deploy، نشانی Worker از نوع `https://naghme-telewebion.<account>.workers.dev` خواهد بود.


## انتشار خودکار از GitHub

برای اینکه انتشار Worker فقط از مخزن انجام شود، در GitHub به مسیر
**Settings → Secrets and variables → Actions → New repository secret**
بروید و این دو Secret را بسازید:

- `CLOUDFLARE_API_TOKEN`: توکن API از Cloudflare با دسترسی ویرایش/مدیریت Workerها برای همین حساب.
- `CLOUDFLARE_ACCOUNT_ID`: شناسه حساب Cloudflare (Account ID).

توکن را در چت یا داخل فایل‌های مخزن قرار ندهید. پس از ثبت هر دو Secret، از تب **Actions** گردش‌کار
**deploy-telewebion-worker** را باز کنید و گزینه **Run workflow** را بزنید.

از آن پس هر تغییری در `telewebion-worker/` روی شاخه `main` به‌صورت خودکار منتشر می‌شود.
نام Worker از `wrangler.toml` خوانده می‌شود؛ در تنظیم فعلی `diyar-widgets` است و باید همان Worker
موجود را به‌روزرسانی کند، نه اینکه Worker تازه‌ای با نام متفاوت بسازد.

## مسیر
`/<channel-slug>/<quality>` مانند `/tv1/1080p`.

## توجه
کد فقط میزبان‌های Telewebion را برای پراکسی قطعه‌های ویدئو می‌پذیرد. مسیر پخش APK نباید از این Worker عبور داده شود. درخواست‌های مرورگر، manifest و قطعه‌های TS را از Worker می‌گیرند و می‌توانند مصرف درخواست/پهنای باند Worker ایجاد کنند.

## آزمایش
پس از استقرار، مسیر یک شبکهٔ شناخته‌شده را در مرورگر باز کنید؛ پاسخ باید playlist با نوع `application/vnd.apple.mpegurl` باشد، نه صفحهٔ HTML.
