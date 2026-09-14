const fs = require("fs");
const Parser = require("rss-parser");

/* =========================================================
   تنظیمات اصلی
========================================================= */

const OUTPUT_FILE = "news.json";
const MAX_NEWS = 100;
const ITEMS_PER_SOURCE = 15;

const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
  },
  timeout: 15000,
  maxRedirects: 5
});


/* =========================================================
   منابع خبری
========================================================= */

const sources = [
  {
    name: "ایرنا",
    url: "https://www.irna.ir/rss",
    flag: "🇮🇷"
  },
  {
    name: "ایسنا",
    url: "https://www.isna.ir/rss",
    flag: "🇮🇷"
  },
  {
    name: "مهر",
    url: "https://www.mehrnews.com/rss",
    flag: "🇮🇷"
  },
  {
    name: "تسنیم",
    url: "https://www.tasnimnews.ir/fa/rss/feed/0/0/8/1/TopStories",
    flag: "🇮🇷"
  },
  {
    name: "فارس",
    url: "https://www.farsnews.ir/rss",
    flag: "🇮🇷"
  },
  {
    name: "ایلنا",
    url: "https://www.ilna.ir/feeds",
    flag: "🇮🇷"
  },
  {
    name: "خبرآنلاین",
    url: "https://www.khabaronline.ir/rss",
    flag: "🇮🇷"
  },
  {
    name: "ایمنا",
    url: "https://www.imna.ir/rss",
    flag: "🇮🇷"
  },
  {
    name: "خبر فوری",
    url: "https://www.khabarfoori.com/fa/feeds/?p=ZGF0ZVJhbmdlJTVCc3RhcnQlNUQ9LTQzMjAw",
    flag: "🇮🇷"
  },
  {
    name: "قدس آنلاین",
    url: "https://qudsonline.ir/rss",
    flag: "🇮🇷"
  },
  {
    name: "عصر ایران",
    url: "https://www.asriran.com/fa/rss/allnews",
    flag: "🇮🇷"
  },
  {
    name: "تابناک",
    url: "https://www.tabnak.ir/fa/rss/allnews",
    flag: "🇮🇷"
  },
  {
    name: "اطلاعات",
    url: "https://www.ettelaat.com/rss/tp/62",
    flag: "🇮🇷"
  }

  // ---- ۴ منبع خارجی — طبق درخواست، عمداً غیرفعال/کامنت نگه داشته شده‌اند ----
  // URLها از نسخه‌ی قبلی پروژه بازگردانده شده‌اند، حدس زده نشده‌اند.
  // برای فعال‌سازی، کافیست /* و */ اطراف هرکدام را بردارید.
  /* ,
  {
    name: "صدای آمریکا فارسی",
    url: "https://ir.voanews.com/api/zuiypl-vomx-tpeggtm",
    flag: "🌍"
  },
  {
    name: "بی‌بی‌سی فارسی",
    url: "https://feeds.bbci.co.uk/persian/rss.xml",
    flag: "🌍"
  },
  {
    name: "دویچه‌وله فارسی",
    url: "https://rss.dw.com/rdf/rss-fa-all",
    flag: "🌍"
  },
  {
    name: "رادیو فردا",
    url: "https://www.radiofarda.com/api/zpoqil-vomx-tpe_kip",
    flag: "🌍"
  }
  */
];


/* =========================================================
   منابع پشتیبان
   فعلاً خالی است و فعال نمی‌شود
========================================================= */

const backupSources = [];


/* =========================================================
   دسته‌ها
========================================================= */

const CATEGORY_ORDER = [
  "سیاسی",
  "اقتصادی",
  "ورزشی",
  "فرهنگی و هنری",
  "اجتماعی",
  "علمی و فناوری",
  "بین‌الملل",
  "متفرقه"
];

const categoryEmojis = {
  "سیاسی": "🏛️",
  "اقتصادی": "💰",
  "ورزشی": "⚽",
  "فرهنگی و هنری": "🎭",
  "اجتماعی": "👥",
  "علمی و فناوری": "🔬",
  "بین‌الملل": "🌍",
  "متفرقه": "📌"
};


/* =========================================================
   کلیدواژه‌های دسته‌بندی
========================================================= */

/* ---------- ورزش ---------- */

const sportsStrong = [
  "فوتبال",
  "فوتسال",
  "والیبال",
  "بسکتبال",
  "هندبال",
  "تنیس",
  "کشتی",
  "بوکس",
  "جودو",
  "تکواندو",
  "دوومیدانی",
  "شنا",
  "وزنه برداری",
  "وزنه‌برداری",
  "دوچرخه سواری",
  "دوچرخه‌سواری",
  "المپیک",
  "پارالمپیک",
  "لیگ برتر",
  "لیگ قهرمانان",
  "جام جهانی",
  "جام ملت",
  "باشگاه",
  "ورزشگاه",
  "بازیکن",
  "سرمربی",
  "مربی",
  "داور",
  "دروازه بان",
  "دروازه‌بان",
  "مهاجم",
  "مدافع",
  "هافبک",
  "گلزن",
  "گل",
  "گلزنی",
  "پنالتی",
  "دربی",
  "قهرمانی",
  "قهرمان",
  "مدال",
  "ورزشکار",
  "تیم ملی",
  "رئال مادرید",
  "بارسلونا",
  "منچسترسیتی",
  "منچستر یونایتد",
  "لیورپول",
  "بایرن مونیخ",
  "پاری سن ژرمن",
  "الهلال",
  "پرسپولیس",
  "استقلال",
  "سپاهان",
  "تراکتور",
  "النصر",
  "الاتحاد",
  "طارمی",
  "رونالدو",
  "مسی",
  "امباپه",
  "نیمار",
  "آنچلوتی",
  "مورینیو"
];

const sportsContext = [
  "دیدار",
  "بازی",
  "مسابقه",
  "نتیجه",
  "ترکیب",
  "نقل و انتقالات",
  "تمرین",
  "اردوی تیم",
  "فصل جدید",
  "جدول",
  "امتیاز",
  "برد",
  "باخت",
  "تساوی",
  "شکست",
  "پیروزی",
  "حذف",
  "صعود",
  "فینال",
  "نیمه نهایی",
  "نیمه‌نهایی",
  "یک چهارم نهایی",
  "یک‌چهارم نهایی"
];


/* ---------- بین‌الملل ---------- */

const internationalStrong = [
  "اسرائیل",
  "رژیم اسرائیل",
  "رژیم صهیونیستی",
  "صهیونیست",
  "تل آویو",
  "تل‌آویو",
  "لبنان",
  "بیروت",
  "حزب الله",
  "حزب‌الله",
  "غزه",
  "فلسطین",
  "حماس",
  "کرانه باختری",
  "اوکراین",
  "کی یف",
  "کی‌یف",
  "روسیه",
  "پوتین",
  "ناتو",
  "آمریکا",
  "ایالات متحده",
  "ترامپ",
  "بایدن",
  "واشنگتن",
  "کاخ سفید",
  "پنتاگون",
  "فرانسه",
  "پاریس",
  "انگلیس",
  "بریتانیا",
  "لندن",
  "آلمان",
  "برلین",
  "چین",
  "پکن",
  "ژاپن",
  "هند",
  "پاکستان",
  "افغانستان",
  "عراق",
  "سوریه",
  "یمن",
  "عربستان",
  "امارات",
  "قطر",
  "ترکیه",
  "اردن",
  "مصر",
  "لیبی",
  "سودان",
  "نپال",
  "لبنان",
  "کرملین",
  "مسکو",
  "اتحادیه اروپا",
  "اروپا",
  "سازمان ملل",
  "شورای امنیت",
  "تنگه هرمز",
  "باب المندب",
  "باب‌المندب",
  "آتلانتیک",
  "اقیانوس آرام",
  "کنگره آمریکا",
  "دموکرات ها",
  "دموکرات‌ها",
  "جمهوری خواهان",
  "جمهوری‌خواهان",
  "نخست وزیر اسرائیل",
  "نخست‌وزیر اسرائیل",
  "نخست وزیر",
  "نخست‌وزیر"
];

const internationalContext = [
  "حمله",
  "حملات",
  "جنگ",
  "آتش بس",
  "آتش‌بس",
  "درگیری",
  "تنش",
  "بحران",
  "عملیات نظامی",
  "نظامی",
  "حمله هوایی",
  "موشک",
  "موشکی",
  "پهپاد",
  "انفجار",
  "تحریم",
  "مذاکره",
  "مذاکرات",
  "مداخله",
  "اشغال",
  "بمباران",
  "ارتش",
  "نیروهای مسلح",
  "عملیات",
  "حمله پهپادی"
];


/* ---------- سیاسی داخلی ---------- */

const politicalStrong = [
  "رئیس جمهور ایران",
  "رئیس‌جمهور ایران",
  "رئیس جمهور",
  "رئیس‌جمهور",
  "دولت",
  "هیئت دولت",
  "هیات دولت",
  "مجلس",
  "مجلس شورای اسلامی",
  "نماینده مجلس",
  "نمایندگان مجلس",
  "وزیر",
  "وزارت",
  "معاون رئیس جمهور",
  "معاون رئیس‌جمهور",
  "استاندار",
  "فرماندار",
  "انتخابات",
  "انتخاباتی",
  "رای گیری",
  "رأی گیری",
  "رأی‌گیری",
  "شورای نگهبان",
  "قوه قضائیه",
  "قوه قضاییه",
  "رهبری",
  "رهبر انقلاب",
  "سپاه پاسداران",
  "سپاه",
  "ارتش جمهوری اسلامی",
  "فراجا",
  "نیروی انتظامی",
  "سخنگوی دولت",
  "سخنگوی مجلس",
  "استیضاح",
  "قانون",
  "لایحه",
  "طرح مجلس",
  "بودجه کشور",
  "کابینه",
  "انتصاب",
  "عزل",
  "سیاست داخلی",
  "دستگاه دیپلماسی",
  "وزارت کشور",
  "وزارت خارجه",
  "وزارت امور خارجه",
  "وزارت دفاع",
  "شورای عالی امنیت ملی",
  "مجمع تشخیص مصلحت نظام",
  "خبرگان رهبری",
  "رئیس مجلس",
  "رئیس قوه قضائیه",
  "معاون اول رئیس جمهور",
  "معاون اول رئیس‌جمهور"
];

const politicalContext = [
  "موضع گیری",
  "موضع‌گیری",
  "اظهارات",
  "سخنان",
  "نشست سیاسی",
  "دیدار سیاسی",
  "مذاکره",
  "دیپلماسی",
  "دولت چهاردهم",
  "مجلس دوازدهم",
  "مسئولان",
  "مسئولان کشور",
  "مقامات",
  "مقامات کشور",
  "تصمیم دولت",
  "مصوبه",
  "تصویب",
  "تذکر",
  "استیضاح",
  "پرسش از وزیر"
];


/* ---------- اقتصادی ---------- */

const economicStrong = [
  "دلار",
  "یورو",
  "پوند",
  "ارز",
  "ارز دولتی",
  "نرخ ارز",
  "طلا",
  "سکه",
  "بورس",
  "شاخص بورس",
  "بازار سرمایه",
  "تورم",
  "گرانی",
  "گران شدن",
  "ارزان شدن",
  "قیمت",
  "قیمت ها",
  "قیمت‌ها",
  "اقتصاد",
  "اقتصادی",
  "بانک",
  "بانک مرکزی",
  "نرخ سود",
  "نرخ بهره",
  "وام",
  "تسهیلات",
  "مالیات",
  "یارانه",
  "بودجه",
  "صادرات",
  "واردات",
  "تولید",
  "تولید ملی",
  "صنعت",
  "نفت",
  "گاز",
  "پتروشیمی",
  "خودرو",
  "خودروساز",
  "خودروسازان",
  "مسکن",
  "اجاره",
  "ساخت و ساز",
  "ساخت‌وساز",
  "اشتغال",
  "بیکاری",
  "حقوق",
  "دستمزد",
  "معیشت",
  "کالا",
  "کالاهای اساسی",
  "مواد غذایی",
  "لوازم خانگی",
  "سرمایه گذاری",
  "سرمایه‌گذاری",
  "بازار",
  "سوخت",
  "بنزین",
  "گازوئیل",
  "نرخ تورم",
  "درآمد",
  "هزینه",
  "فروش",
  "خرید",
  "تجارت",
  "کسب و کار",
  "کسب‌وکار",
  "رشد اقتصادی",
  "جهش تولید"
];

const economicContext = [
  "افزایش قیمت",
  "کاهش قیمت",
  "رشد قیمت",
  "افت قیمت",
  "افزایش نرخ",
  "کاهش نرخ",
  "بازار جهانی",
  "عرضه",
  "تقاضا",
  "تولید کننده",
  "تولیدکننده",
  "مصرف کننده",
  "مصرف‌کننده",
  "سرمایه",
  "سرمایه‌گذار",
  "سرمایه‌گذاری",
  "درآمدزایی"
];


/* ---------- اجتماعی ---------- */

const socialStrong = [
  "تصادف",
  "حادثه",
  "واژگونی",
  "آتش سوزی",
  "آتش‌سوزی",
  "حریق",
  "فوت",
  "جان باخت",
  "جان‌باخت",
  "جان باختن",
  "جان‌باختن",
  "کشته",
  "زخمی",
  "مصدوم",
  "مجروح",
  "اورژانس",
  "بیمارستان",
  "درمان",
  "درمانی",
  "سلامت",
  "پزشکی",
  "پزشک",
  "بیمار",
  "فرآورده های خون",
  "فرآورده‌های خون",
  "خون",
  "مدرسه",
  "دانش آموز",
  "دانش‌آموز",
  "دانشگاه",
  "دانشجو",
  "معلم",
  "آموزش و پرورش",
  "جمعیت",
  "خانواده",
  "کودک",
  "کودکان",
  "زنان",
  "سالمندان",
  "قتل",
  "قاتل",
  "بازداشت",
  "دستگیری",
  "مفقود",
  "جاده",
  "ترافیک",
  "آلودگی هوا",
  "زلزله",
  "سیل",
  "بارندگی",
  "طوفان",
  "خشکسالی",
  "هواشناسی",
  "محیط زیست",
  "تعطیلی مدارس",
  "تعطیلی ادارات",
  "ادارات",
  "مراکز درمانی",
  "سلامت روان",
  "سنجش سلامت",
  "فرو رفتن زمین",
  "نشست زمین",
  "گودال",
  "چاله عمیق",
  "سرقت",
  "سارق",
  "دزدی",
  "مقتول",
  "غرق شد",
  "غرق‌شدگی",
  "غرق‌شدن",
  "نجات غریق"
];

const socialContext = [
  "استان",
  "شهر",
  "روستا",
  "شهرداری",
  "هلال احمر",
  "آتش نشانی",
  "آتش‌نشانی",
  "نیروی امدادی",
  "امدادگران",
  "مصدومان",
  "حادثه رانندگی",
  "حوادث جاده ای",
  "حوادث جاده‌ای",
  "خانوار",
  "شهروندان",
  "مردم",
  "خدمات عمومی",
  "خدمات درمانی"
];


/* ---------- فرهنگی و هنری ---------- */

const culturalStrong = [
  "سینما",
  "فیلم",
  "سریال",
  "بازیگر",
  "کارگردان",
  "تهیه کننده",
  "تهیه‌کننده",
  "موسیقی",
  "خواننده",
  "کنسرت",
  "تئاتر",
  "نمایش",
  "هنر",
  "هنرمند",
  "کتاب",
  "نویسنده",
  "شاعر",
  "شعر",
  "ادبیات",
  "میراث فرهنگی",
  "صنایع دستی",
  "صنایع‌دستی",
  "موزه",
  "باستان شناسی",
  "باستان‌شناسی",
  "آثار تاریخی",
  "جشنواره",
  "فرهنگ",
  "تلویزیون",
  "برنامه کودک",
  "انیمیشن",
  "نقاشی",
  "نگارخانه",
  "نمایشگاه هنری",
  "نمایشگاه صنایع دستی",
  "نمایشگاه صنایع‌دستی",
  "رادیو",
  "سینمای ایران",
  "سریال تلویزیونی",
  "فیلم سینمایی"
];

const culturalContext = [
  "فرهنگی",
  "هنری",
  "اثر هنری",
  "اثر تاریخی",
  "اهالی فرهنگ",
  "اهالی هنر",
  "جشنواره فرهنگی",
  "رویداد فرهنگی",
  "رویداد هنری",
  "آلبوم",
  "ترانه",
  "موسیقیایی",
  "کتابخوانی",
  "انتشارات"
];


/* ---------- علمی و فناوری ---------- */

const scienceStrong = [
  "هوش مصنوعی",
  "فناوری",
  "تکنولوژی",
  "اینترنت",
  "نرم افزار",
  "نرم‌افزار",
  "سخت افزار",
  "سخت‌افزار",
  "کامپیوتر",
  "رایانه",
  "موبایل",
  "گوشی هوشمند",
  "اپلیکیشن",
  "ربات",
  "رباتیک",
  "تراشه",
  "پردازنده",
  "ماه واره",
  "ماهواره",
  "فضا",
  "فضانورد",
  "نجوم",
  "سیاره",
  "کهکشان",
  "تلسکوپ",
  "ناسا",
  "ژنتیک",
  "زیست فناوری",
  "زیست‌فناوری",
  "پژوهش",
  "پژوهشگران",
  "محققان",
  "دانشمندان",
  "آزمایشگاه",
  "کشف علمی",
  "امنیت سایبری",
  "امنیت دیجیتال",
  "هک",
  "داده",
  "الگوریتم",
  "یادگیری ماشین",
  "ماشین لرنینگ",
  "machine learning",
  "5g",
  "6g",
  "اینترنت اشیا",
  "هوش مصنوعی مولد",
  "مدل زبانی",
  "فناوری فضایی",
  "اکتشاف فضایی",
  "پزشکی نوین",
  "نانو فناوری",
  "نانوفناوری",
  "واکسن",
  "داروی جدید",
  "آزمایش علمی"
];

const scienceContext = [
  "علمی",
  "فناوری اطلاعات",
  "دیجیتال",
  "دیجیتالی",
  "نوآوری",
  "استارتاپ",
  "دانش بنیان",
  "دانش‌بنیان",
  "پژوهش علمی",
  "تحقیقات",
  "مطالعات",
  "دانشگاه",
  "مهندسان",
  "مهندسی",
  "آزمایش",
  "کشف",
  "نسل جدید"
];


/* =========================================================
   ابزارهای متن
========================================================= */

function normalizeText(text = "") {
  return String(text)
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/ۀ/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/إ/g, "ا")
    .replace(/أ/g, "ا")
    .replace(/‌/g, " ")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}


/*
  مشکل substring:
  یک کلیدواژه‌ی کوتاه و تک‌کلمه‌ای (مثل «شنا» یا «هند») با ()String.includes
  می‌تواند وسط یک کلمه‌ی کاملاً نامرتبط پیدا شود:
    «ایران‌اینترنشنال» → شامل «شنا» است (…ن‌ش‌نا‌ل…)
    «تکان‌دهنده»       → شامل «هند» است (…ده‌هند‌ه…)
  راه‌حل: فقط برای کلیدواژه‌های کوتاه و بدون فاصله (یک کلمه)، الزام می‌کنیم
  قبل و بعد از آن یک حرف فارسی/عربی نباشد (یعنی شروع/پایان متن یا یک مرز
  غیرحرفی مثل فاصله، عدد، حرف لاتین یا علامت نگارشی). عبارت‌های چندکلمه‌ای
  (شامل فاصله) و کلیدواژه‌های بلندتر همچنان با includes ساده بررسی می‌شوند
  تا صورت‌های صرف‌شده‌ی فارسی (مثل «دانشگاهی»، «بانکداری») از دست نروند.
*/
const SHORT_PHRASE_MAX_LENGTH = 4;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedPhrase) {
    return false;
  }

  const isShortSingleWord =
    normalizedPhrase.length <= SHORT_PHRASE_MAX_LENGTH &&
    !normalizedPhrase.includes(" ");

  if (isShortSingleWord) {
    const boundaryPattern = new RegExp(
      "(^|[^\\u0600-\\u06FF0-9a-zA-Z])" +
        escapeRegExp(normalizedPhrase) +
        "([^\\u0600-\\u06FF0-9a-zA-Z]|$)"
    );

    return boundaryPattern.test(text);
  }

  return text.includes(normalizedPhrase);
}


function hasAny(text, list) {
  return list.some(item => hasPhrase(text, item));
}


function countMatches(text, list) {
  let count = 0;

  for (const item of list) {
    if (hasPhrase(text, item)) {
      count++;
    }
  }

  return count;
}


/* =========================================================
   Escape / امنیت
========================================================= */

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function safeLink(value = "") {
  try {
    const url = new URL(value);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }

    return "";
  } catch {
    return "";
  }
}


/* =========================================================
   تشخیص زبان فارسی
========================================================= */

function isPersianText(text = "") {
  const value = String(text).trim();

  if (!value) {
    return false;
  }

  const persianChars = (value.match(/[\u0600-\u06FF]/g) || []).length;

  return persianChars >= 3;
}


/* =========================================================
   امتیازدهی دسته‌ها
========================================================= */

function scoreCategory(
  text,
  strongList,
  contextList,
  strongWeight = 10,
  contextWeight = 2
) {
  const strongCount = countMatches(text, strongList);
  const contextCount = countMatches(text, contextList);

  let score =
    strongCount * strongWeight +
    contextCount * contextWeight;

  /*
    وقتی هم کلیدواژه تخصصی و هم context وجود داشته باشد،
    اطمینان دسته‌بندی بیشتر می‌شود.
  */
  if (strongCount > 0 && contextCount > 0) {
    score += 4;
  }

  /*
    چند کلیدواژه قوی مستقل از هم نشانه خوبی برای موضوع غالب هستند.
  */
  if (strongCount >= 2) {
    score += 5;
  }

  if (strongCount >= 3) {
    score += 5;
  }

  return {
    score,
    strongCount,
    contextCount
  };
}


/* =========================================================
   دسته‌بندی هوشمند
========================================================= */

function scoreAllCategories(text) {

  /* -------------------------------------------------------
     امتیاز پایه
  ------------------------------------------------------- */

  const scores = {
    "سیاسی": 0,
    "اقتصادی": 0,
    "ورزشی": 0,
    "فرهنگی و هنری": 0,
    "اجتماعی": 0,
    "علمی و فناوری": 0,
    "بین‌الملل": 0,
    "متفرقه": 0
  };


  /* -------------------------------------------------------
     محاسبه امتیاز هر دسته
  ------------------------------------------------------- */

  const sports = scoreCategory(
    text,
    sportsStrong,
    sportsContext,
    11,
    2
  );

  const international = scoreCategory(
    text,
    internationalStrong,
    internationalContext,
    12,
    3
  );

  const political = scoreCategory(
    text,
    politicalStrong,
    politicalContext,
    11,
    2
  );

  const economic = scoreCategory(
    text,
    economicStrong,
    economicContext,
    10,
    2
  );

  const social = scoreCategory(
    text,
    socialStrong,
    socialContext,
    9,
    2
  );

  const cultural = scoreCategory(
    text,
    culturalStrong,
    culturalContext,
    10,
    2
  );

  const science = scoreCategory(
    text,
    scienceStrong,
    scienceContext,
    10,
    2
  );


  scores["ورزشی"] = sports.score;
  scores["بین‌الملل"] = international.score;
  scores["سیاسی"] = political.score;
  scores["اقتصادی"] = economic.score;
  scores["اجتماعی"] = social.score;
  scores["فرهنگی و هنری"] = cultural.score;
  scores["علمی و فناوری"] = science.score;


  /* =======================================================
     قوانین ویژه
  ======================================================= */


  /* -------------------------------------------------------
     1. موضوع خارجی + زمینه جنگ/درگیری
     
     اگر نام یک کشور/رهبر/نهاد خارجی همراه با حمله،
     جنگ، موشک، پهپاد و... باشد، بین‌الملل اولویت بالایی دارد.
  ------------------------------------------------------- */

  if (
    international.strongCount > 0 &&
    international.contextCount > 0
  ) {
    scores["بین‌الملل"] += 15;
  }


  /* -------------------------------------------------------
     2. موضوع خارجی حتی بدون context نظامی
     
     مثلاً:
     «پوتین درباره آینده روسیه سخن گفت»
     باید بین‌الملل باشد.
  ------------------------------------------------------- */

  if (international.strongCount >= 2) {
    scores["بین‌الملل"] += 10;
  }


  /* -------------------------------------------------------
     3. یک نام خارجی مشخص + موضوع خارجی
  ------------------------------------------------------- */

  if (
    international.strongCount >= 1 &&
    political.strongCount === 0
  ) {
    scores["بین‌الملل"] += 5;
  }


  /* -------------------------------------------------------
     4. ورزش
     
     «استقلال» به تنهایی کافی نیست.
     اما اگر استقلال همراه با فوتبال/بازی/لیگ/بازیکن...
     باشد، ورزش امتیاز ویژه می‌گیرد.
  ------------------------------------------------------- */

  const hasSportContext = hasAny(text, sportsContext);

  const hasExplicitSport =
    hasAny(text, [
      "فوتبال",
      "فوتسال",
      "والیبال",
      "بسکتبال",
      "کشتی",
      "لیگ",
      "جام جهانی",
      "ورزشگاه",
      "بازیکن",
      "سرمربی",
      "داور",
      "گل",
      "پنالتی",
      "دربی",
      "قهرمانی",
      "تیم ملی",
      "رئال مادرید",
      "بارسلونا",
      "الهلال",
      "پرسپولیس",
      "استقلال",
      "سپاهان",
      "تراکتور",
      "طارمی",
      "رونالدو",
      "مسی",
      "امباپه"
    ]);

  if (hasExplicitSport && hasSportContext) {
    scores["ورزشی"] += 15;
  }

  if (
    sports.strongCount >= 2 &&
    (hasSportContext || sports.strongCount >= 3)
  ) {
    scores["ورزشی"] += 12;
  }


  /* -------------------------------------------------------
     5. «استقلال» به تنهایی هرگز نباید ورزش شود
  ------------------------------------------------------- */

  if (
    hasPhrase(text, "استقلال") &&
    sports.strongCount === 1 &&
    !hasSportContext
  ) {
    scores["ورزشی"] -= 15;
  }


  /* -------------------------------------------------------
     6. اقتصاد
     
     اگر خبر واژه‌های اقتصادی بسیار مشخص داشته باشد،
     حتی اگر نام یک کشور خارجی هم در آن باشد،
     موضوع غالب می‌تواند اقتصادی باشد.
     
     مثال:
     «واشنگتن پست: جنگ ... قیمت گازوئیل افزایش یافت»
  ------------------------------------------------------- */

  if (
    economic.strongCount >= 2 &&
    hasAny(text, [
      "قیمت",
      "دلار",
      "طلا",
      "سکه",
      "بورس",
      "تورم",
      "اقتصاد",
      "بانک",
      "نرخ",
      "بازار",
      "سوخت",
      "گازوئیل",
      "بنزین"
    ])
  ) {
    scores["اقتصادی"] += 12;
  }


  /* -------------------------------------------------------
     7. حادثه و خدمات اجتماعی
     
     اگر خبر یک حادثه داخلی باشد، اجتماعی اولویت دارد.
  ------------------------------------------------------- */

  if (
    social.strongCount > 0 &&
    hasAny(text, [
      "تصادف",
      "واژگونی",
      "آتش سوزی",
      "آتش‌سوزی",
      "حریق",
      "اورژانس",
      "بیمارستان",
      "مصدوم",
      "زخمی",
      "جان باخت",
      "جان‌باخت"
    ])
  ) {
    scores["اجتماعی"] += 15;
  }


  /* -------------------------------------------------------
     8. حوادث خارجی
     
     مثلاً:
     «فوران آتشفشان اندونزی»
     
     این نباید صرفاً اجتماعی شود.
  ------------------------------------------------------- */

  if (
    international.strongCount > 0 &&
    hasAny(text, [
      "زلزله",
      "آتشفشان",
      "فوران",
      "سیل",
      "طوفان",
      "انفجار",
      "حمله",
      "بمباران",
      "رانش زمین",
      "رانش"
    ])
  ) {
    scores["بین‌الملل"] += 14;
  }


  /* -------------------------------------------------------
     9. فرهنگ و هنر
  ------------------------------------------------------- */

  if (
    cultural.strongCount >= 1 &&
    hasAny(text, [
      "سینما",
      "فیلم",
      "سریال",
      "بازیگر",
      "کارگردان",
      "موسیقی",
      "خواننده",
      "کنسرت",
      "تئاتر",
      "کتاب",
      "نویسنده",
      "شاعر",
      "صنایع دستی",
      "صنایع‌دستی",
      "موزه",
      "جشنواره",
      "هنرمند"
    ])
  ) {
    scores["فرهنگی و هنری"] += 10;
  }


  /* -------------------------------------------------------
     10. فناوری
  ------------------------------------------------------- */

  if (
    science.strongCount >= 1 &&
    hasAny(text, [
      "هوش مصنوعی",
      "فناوری",
      "تکنولوژی",
      "اینترنت",
      "نرم افزار",
      "نرم‌افزار",
      "رایانه",
      "کامپیوتر",
      "ربات",
      "تراشه",
      "ماهواره",
      "فضا",
      "ناسا",
      "امنیت سایبری",
      "یادگیری ماشین",
      "ماشین لرنینگ"
    ])
  ) {
    scores["علمی و فناوری"] += 10;
  }


  /* -------------------------------------------------------
     11. دانشگاه به تنهایی علمی نیست
     
     چون بسیاری از اخبار دانشگاهی اجتماعی هستند.
  ------------------------------------------------------- */

  if (
    hasPhrase(text, "دانشگاه") &&
    science.strongCount === 0
  ) {
    scores["علمی و فناوری"] -= 5;
  }


  /* -------------------------------------------------------
     12. سیاست داخلی
     
     اگر نشانه سیاسی داخلی قوی باشد و موضوع خارجی مشخص
     وجود نداشته باشد، سیاسی را تقویت می‌کنیم.
  ------------------------------------------------------- */

  if (
    political.strongCount >= 1 &&
    international.strongCount === 0
  ) {
    scores["سیاسی"] += 10;
  }


  /* -------------------------------------------------------
     13. اگر موضوع خارجی و سیاسی داخلی هر دو وجود داشتند،
     
     مقایسه انجام می‌شود.
  ------------------------------------------------------- */

  if (
    international.strongCount > 0 &&
    political.strongCount > 0
  ) {
    /*
      اگر خبر مشخصاً درباره یک کشور/رهبر خارجی باشد،
      بین‌الملل اولویت بیشتری دارد.
    */
    if (
      international.strongCount >= political.strongCount
    ) {
      scores["بین‌الملل"] += 8;
    } else {
      scores["سیاسی"] += 4;
    }
  }


  /* -------------------------------------------------------
     14. موضوعات دینی/مذهبی عمومی
     
     اگر خبر صرفاً محتوای مذهبی داشته باشد و در دسته دیگری
     امتیاز مشخصی نداشته باشد، فرهنگی مناسب‌تر است.
  ------------------------------------------------------- */

  if (
    hasAny(text, [
      "نماز",
      "مسجد",
      "مذهبی",
      "مذهبی",
      "روحانی",
      "حجت الاسلام",
      "حجت‌الاسلام",
      "مراسم مذهبی",
      "مراسم دینی",
      "دینی",
      "قرآن",
      "اذان",
      "زیارت",
      "امامزاده",
      "عزاداری",
      "مناسبت مذهبی"
    ])
  ) {
    scores["فرهنگی و هنری"] += 8;
  }


  /* -------------------------------------------------------
     15. موضوعات روزمره بسیار عمومی
     
     متفرقه فقط امتیاز پایه دارد.
  ------------------------------------------------------- */

  scores["متفرقه"] = 1;


  /* =======================================================
     انتخاب برنده
  ======================================================= */

  let bestCategory = "متفرقه";
  let bestScore = scores["متفرقه"];

  for (const category of CATEGORY_ORDER) {
    if (category === "متفرقه") {
      continue;
    }

    if (scores[category] > bestScore) {
      bestScore = scores[category];
      bestCategory = category;
    }
  }


  /* -------------------------------------------------------
     جلوگیری از دسته‌بندی ضعیف
     
     اگر هیچ موضوع مشخصی پیدا نشد، متفرقه.
  ------------------------------------------------------- */

  if (bestScore < 7) {
    return {
      category: "متفرقه",
      score: bestScore
    };
  }


  return {
    category: bestCategory,
    score: bestScore
  };
}


/* =========================================================
   دسته‌بندی نهایی (عنوان + rssDescription اختیاری)
   ---------------------------------------------------------
   اولویت همیشه با عنوان است:
   ۱. ابتدا فقط عنوان امتیازدهی می‌شود (scoreAllCategories
      دقیقاً همان منطق قبلی را، بدون کوچک‌ترین تغییر در
      آستانه/وزن‌ها/کلیدواژه‌ها، اجرا می‌کند).
   ۲. اگر عنوان به‌تنهایی دسته‌ی مشخصی پیدا کرد (غیر از
      «متفرقه»، یعنی امتیاز ≥ ۷)، همان نتیجه بازگردانده
      می‌شود و rssDescription اصلاً بررسی نمی‌شود — یعنی یک
      کلیدواژه‌ی قوی در عنوان هرگز توسط RSS override نمی‌شود.
   ۳. فقط وقتی عنوان به «متفرقه» رسید، rssDescription (در
      صورت وجود و معتبر بودن) به‌عنوان متن کمکی به همان عنوان
      اضافه می‌شود و دوباره با همان تابع/آستانه/وزن‌ها
      امتیازدهی می‌شود.
========================================================= */

function detectCategory(title = "", rssDescription = "") {
  const titleText = normalizeText(title);

  if (!titleText) {
    return "متفرقه";
  }

  const titleResult = scoreAllCategories(titleText);

  if (titleResult.category !== "متفرقه") {
    return titleResult.category;
  }

  const rssText = normalizeText(rssDescription || "");

  if (!rssText) {
    return titleResult.category;
  }

  const combinedText = titleText + " " + rssText;

  const combinedResult = scoreAllCategories(combinedText);

  return combinedResult.category;
}


/* =========================================================
   تاریخ فارسی
========================================================= */

function toPersianDigits(value) {
  return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}


function formatPersianDate(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return toPersianDigits(date.toLocaleString("fa-IR"));
  }
}


/* =========================================================
   Fetch RSS با تلاش مجدد
========================================================= */

async function fetchWithRetry(url, retries = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`🌐 دریافت RSS: ${url} | تلاش ${attempt}`);

      const feed = await parser.parseURL(url);

      if (!feed || !Array.isArray(feed.items)) {
        throw new Error("RSS معتبر نیست یا item ندارد.");
      }

      return feed;

    } catch (error) {
      lastError = error;

      console.log(
        `⚠️ خطا در دریافت ${url}: ${
          error?.message || error
        }`
      );

      if (attempt <= retries) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  throw lastError;
}


/* =========================================================
   کلید یکتای خبر
========================================================= */

function normalizeTitle(title = "") {
  return normalizeText(title)
    .replace(/[«»"“”'،؛:!?؟!.,()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================================================
   تاریخ خبر
========================================================= */

function getItemDate(item) {
  return (
    item.pubDate ||
    item.isoDate ||
    item.date ||
    item.publishedAt ||
    ""
  );
}


/* =========================================================
   دریافت و پردازش خبرها
========================================================= */

async function fetchAllNews() {
  let allNews = [];
  const failedSources = [];
  /*
    successfulSources باید «فچ موفق» را نشان دهد، نه «حداقل یک خبر
    از این منبع به ۱۰۰ خبر نهایی رسید». این دو مفهوم متفاوت‌اند: یک
    منبع می‌تواند RSS آن کاملاً سالم و قابل‌parse باشد، ولی همه‌ی
    خبرهایش بعداً در حذف تکراری/فیلتر زبان/برش به ۱۰۰ خبر برتر حذف
    شوند. قبلاً successfulSources از finalNews ساخته می‌شد که همین
    باعث می‌شد چنین منبعی نه در successful و نه در failed ثبت شود.
  */
  const successfulSources = [];

  console.log("");
  console.log("==============================================");
  console.log("📰 شروع دریافت اخبار دیار قدمگاه");
  console.log("==============================================");
  console.log("");


  /* -------------------------------------------------------
     منابع اصلی
  ------------------------------------------------------- */

  for (const source of sources) {
    try {
      const feed = await fetchWithRetry(source.url, 2);

      const items = Array.isArray(feed.items)
        ? feed.items.slice(0, ITEMS_PER_SOURCE)
        : [];

      console.log(
        `✅ ${source.name}: ${items.length} خبر دریافت شد`
      );

      // فچ این منبع موفق بود (feed معتبر و قابل‌parse دریافت شد)،
      // صرف‌نظر از این‌که بعداً چند خبرش به فهرست نهایی برسد.
      successfulSources.push(source.name);


      for (const item of items) {
        const title = String(item.title || "").trim();
        const link = safeLink(
          item.link ||
          item.guid ||
          ""
        );

        if (!title || !link) {
          continue;
        }


        /* فقط خبرهای فارسی */
        if (!isPersianText(title)) {
          continue;
        }


        const rawDate = getItemDate(item);

        const dateObject = rawDate
          ? new Date(rawDate)
          : new Date();


        const validDate = Number.isNaN(
          dateObject.getTime()
        )
          ? new Date()
          : dateObject;


        /*
          rssDescription: توضیح/خلاصه‌ای که خودِ فید RSS برای این خبر
          می‌فرستد (contentSnippet یا content در rss-parser). این فقط
          یک «کاندید خام» است برای زمانی که generate-summaries.js نتواند
          از خودِ صفحه‌ی خبر خلاصه استخراج کند (مثلاً به‌خاطر صفحه‌ی
          محافظتی/Cloudflare). پاک‌سازی و اعتبارسنجی نهایی (طول، جمله‌ی
          کامل و ...) در generate-summaries.js انجام می‌شود؛ این‌جا فقط
          یک فیلتر سبک برای رد کردن مقدارهای خالی/بی‌فایده اعمال می‌شود
          تا رکورد سایر منابع بی‌دلیل تغییر نکند.

          این مقدار همچنین به detectCategory() به‌عنوان سیگنال کمکی
          داده می‌شود (فقط وقتی عنوان به‌تنهایی کافی نبود) — جلوتر از
          محاسبه‌ی category قرار گرفته چون category به آن نیاز دارد.
        */

        const rawRssDescription = String(
          item.contentSnippet ||
          item.content ||
          ""
        )
          .replace(/\s+/g, " ")
          .trim();

        const hasValidRssDescription =
          rawRssDescription.length >= 20;


        const category = detectCategory(
          title,
          hasValidRssDescription
            ? rawRssDescription
            : ""
        );


        /*
          توجه امنیتی: عنوان/منبع این‌جا escapeHtml نمی‌شوند.
          news.json یک فایل داده است، نه HTML؛ اگر همین‌جا escape شود،
          هر مصرف‌کننده‌ای که خودش هم (به‌درستی) دوباره escape می‌کند
          (news.html, rubika-news.html, news-ticker.html) دچار
          «دو بار escape شدن» می‌شود و مثلاً «&» به‌صورت واقعی
          «&amp;amp;» روی صفحه نمایش داده می‌شود. امنیت XSS همچنان تضمین
          است چون تمام صفحات نمایشی خودشان escapeHtml/escapeHTML را روی
          همین مقدار خام اجرا می‌کنند. همین منطق برای rssDescription هم
          صادق است.
        */
        allNews.push({
          title,
          link,
          date: validDate.toISOString(),
          datePersian: formatPersianDate(validDate),
          source: source.name,
          flag: source.flag,
          category,
          ...(hasValidRssDescription
            ? { rssDescription: rawRssDescription }
            : {})
        });
      }

    } catch (error) {
      console.log(
        `❌ منبع ناموفق: ${source.name}`
      );

      failedSources.push(source.name);
    }
  }


  /* -------------------------------------------------------
     اگر منابع اصلی کافی نبودند،
     منابع پشتیبان را امتحان کن.
     
     در حال حاضر backupSources خالی است.
  ------------------------------------------------------- */

  if (
    allNews.length < MAX_NEWS &&
    backupSources.length > 0
  ) {
    console.log("");
    console.log("🔄 استفاده از منابع پشتیبان...");

    for (const source of backupSources) {
      try {
        const feed = await fetchWithRetry(source.url, 2);

        const items = Array.isArray(feed.items)
          ? feed.items.slice(0, ITEMS_PER_SOURCE)
          : [];

        for (const item of items) {
          const title = String(item.title || "").trim();
          const link = safeLink(
            item.link ||
            item.guid ||
            ""
          );

          if (!title || !link) {
            continue;
          }

          if (!isPersianText(title)) {
            continue;
          }

          const rawDate = getItemDate(item);

          const dateObject = rawDate
            ? new Date(rawDate)
            : new Date();

          const validDate = Number.isNaN(
            dateObject.getTime()
          )
            ? new Date()
            : dateObject;

          const category = detectCategory(title);

          // عمداً escapeHtml نمی‌شود؛ توضیح در حلقه‌ی منابع اصلی بالاتر.
          allNews.push({
            title,
            link,
            date: validDate.toISOString(),
            datePersian: formatPersianDate(validDate),
            source: source.name,
            flag: source.flag,
            category
          });
        }

        // فچ پشتیبان موفق بود؛ اگر این منبع قبلاً در حلقه‌ی اصلی
        // failed ثبت شده بود، آن ثبت را برمی‌داریم تا در هر دو
        // آرایه هم‌زمان ظاهر نشود.
        successfulSources.push(source.name);
        const failedIndex = failedSources.indexOf(source.name);
        if (failedIndex !== -1) {
          failedSources.splice(failedIndex, 1);
        }

      } catch (error) {
        failedSources.push(source.name);
      }
    }
  }


  /* =======================================================
     حذف اخبار تکراری
  ======================================================= */

  const uniqueNews = [];
  const seenTitles = new Set();
  const seenLinks = new Set();

  for (const item of allNews) {
    const titleKey = normalizeTitle(
      item.title
    );

    const linkKey = item.link
      ? item.link.toLowerCase().replace(/\/+$/, "")
      : "";

    if (
      titleKey &&
      seenTitles.has(titleKey)
    ) {
      continue;
    }

    if (
      linkKey &&
      seenLinks.has(linkKey)
    ) {
      continue;
    }

    if (titleKey) {
      seenTitles.add(titleKey);
    }

    if (linkKey) {
      seenLinks.add(linkKey);
    }

    uniqueNews.push(item);
  }


  /* =======================================================
     مرتب‌سازی بر اساس جدیدترین خبر
  ======================================================= */

  uniqueNews.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();

    return dateB - dateA;
  });


  /* =======================================================
     فقط ۱۰۰ خبر
  ======================================================= */

  const finalNews = uniqueNews.slice(0, MAX_NEWS);


  /* =======================================================
     دسته‌بندی نهایی
  ======================================================= */

  const categorizedNews = {};

  for (const category of CATEGORY_ORDER) {
    categorizedNews[category] = [];
  }

  for (const item of finalNews) {
    const category = CATEGORY_ORDER.includes(
      item.category
    )
      ? item.category
      : "متفرقه";

    item.category = category;

    categorizedNews[category].push(item);
  }


  /* =======================================================
     آمار دسته‌بندی
  ======================================================= */

  console.log("");
  console.log("==============================================");
  console.log("📊 آمار دسته‌بندی اخبار");
  console.log("==============================================");

  for (const category of CATEGORY_ORDER) {
    console.log(
      `${categoryEmojis[category]} ${category}: ${
        categorizedNews[category].length
      }`
    );
  }

  console.log("");
  console.log(
    `📰 مجموع اخبار نهایی: ${finalNews.length}`
  );

  console.log(
    `⚠️ منابع ناموفق: ${
      failedSources.length
        ? failedSources.join("، ")
        : "هیچ‌کدام"
    }`
  );

  console.log("");


  /* =======================================================
     منابع موفق / ناموفق — نسخه‌ی نهایی و یکتا

     successfulSources همان‌جا در حلقه‌ی fetch ثبت شده (بر اساس
     موفقیت واقعیِ دریافت/parse فید)، نه بر اساس این‌که چند خبرش به
     ۱۰۰ خبر نهایی رسیده. اینجا فقط یکتا (dedupe) می‌شود.
  ======================================================= */

  const finalFailedSources = [...new Set(failedSources)];
  const finalSuccessfulSources = [...new Set(successfulSources)];

  // بررسی سلامت: هر منبع فعال باید دقیقاً در یکی از این دو آرایه باشد.
  const accountedFor =
    finalSuccessfulSources.length + finalFailedSources.length;

  if (accountedFor !== sources.length) {
    console.log(
      `⚠️ هشدار: ${sources.length} منبع فعال وجود دارد اما ` +
        `${accountedFor} منبع در successful/failed ثبت شده‌اند. ` +
        `این‌ها را بررسی کنید.`
    );
  } else {
    console.log(
      `✅ همه‌ی ${sources.length} منبع فعال در successful یا failed ثبت شدند.`
    );
  }


  /* =======================================================
     خروجی نهایی
  ======================================================= */

  const now = new Date();

  const output = {
    lastUpdate: now.toISOString(),
    lastUpdatePersian: formatPersianDate(now),
    totalNews: finalNews.length,
    failedSources: finalFailedSources,
    successfulSources: finalSuccessfulSources,
    categories: CATEGORY_ORDER,
    news: finalNews,
    categorizedNews
  };


  /* =======================================================
     ذخیره news.json
     
     توجه:
     هیچ فایل HTML ساخته یا تغییر داده نمی‌شود.
  ======================================================= */

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(output, null, 2),
    "utf8"
  );


  /* =======================================================
     پایان
  ======================================================= */

  console.log("==============================================");
  console.log("✅ news.json با موفقیت ساخته شد");
  console.log(`📁 فایل: ${OUTPUT_FILE}`);
  console.log("🚫 news.html دست‌نخورده باقی ماند");
  console.log("🚫 index.html ساخته نشد");
  console.log("==============================================");
}


/* =========================================================
   اجرای اصلی
========================================================= */

(async () => {
  try {
    await fetchAllNews();
  } catch (error) {
    console.error("");
    console.error("❌ خطای نهایی:");
    console.error(error);
    process.exit(1);
  }
})();
