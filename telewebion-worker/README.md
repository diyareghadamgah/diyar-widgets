# Naghme Telewebion Worker

این Worker واسط مستقل برای پخش وب شبکه‌های Telewebion است. Worker آمار بازدید دیار قدمگاه را تغییر نمی‌دهد.

## استقرار در Cloudflare

در تنظیمات پروژه Cloudflare:
- Root directory: `/telewebion-worker`
- Build command: خالی
- Deploy command: `npx wrangler deploy`
- Preview command: خالی (در صورت اختیاری بودن)

پس از Deploy، نشانی Worker از نوع `https://naghme-telewebion.<account>.workers.dev` خواهد بود.

## مسیر
`/<channel-slug>/<quality>` مانند `/tv1/1080p`.

## توجه
کد فقط میزبان‌های Telewebion را برای پراکسی قطعه‌های ویدئو می‌پذیرد. مسیر پخش APK نباید از این Worker عبور داده شود. درخواست‌های مرورگر، manifest و قطعه‌های TS را از Worker می‌گیرند و می‌توانند مصرف درخواست/پهنای باند Worker ایجاد کنند.

## آزمایش
پس از استقرار، مسیر یک شبکهٔ شناخته‌شده را در مرورگر باز کنید؛ پاسخ باید playlist با نوع `application/vnd.apple.mpegurl` باشد، نه صفحهٔ HTML.
