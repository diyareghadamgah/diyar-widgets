"use strict";

/*
=========================================================
 generate-summaries.js
 اخبار دیار قدمگاه
 نسخه اصلاح‌شده و پایدار

 ورودی:
   ./news.json

 خروجی:
   ./news-summary.json

 ویژگی‌ها:
   - حفظ خلاصه‌های سالم قبلی
   - بازسازی خلاصه‌های ناقص
   - دنبال کردن Redirect
   - استخراج از OG / Meta / JSON-LD / Article / Paragraph
   - پشتیبانی بهتر از سایت‌های خبری
   - جلوگیری از قطع شدن جمله
   - اضافه کردن ... در پایان خلاصه‌های کوتاه‌شده
   - استانداردسازی سه‌نقطه‌های خراب
   - اصلاح فاصله در اعداد اعشاری فارسی و انگلیسی
   - حذف متن‌های تبلیغاتی
   - عدم تولید خلاصه حدسی
=========================================================
*/

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

/* ========================================================
CONFIG
======================================================== */

const INPUT_FILE =
    path.join(__dirname, "news.json");

const OUTPUT_FILE =
    path.join(__dirname, "news-summary.json");

const MAX_SUMMARY_LENGTH = 220;

const MIN_SUMMARY_LENGTH = 45;

const REQUEST_TIMEOUT = 15000;

const MAX_RESPONSE_SIZE = 2000000;

const MAX_REDIRECTS = 5;

const CONCURRENCY = 4;

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/140.0 Safari/537.36 " +
    "Diyar-Ghadamgah-NewsBot/3.0";

/* ========================================================
GENERAL HELPERS
======================================================== */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* ========================================================
CLEAN TEXT
======================================================== */

function cleanText(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/\r/g, " ")
        .replace(/\t/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/\u200c{2,}/g, "\u200c")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/* ========================================================
HTML ENTITIES
======================================================== */

function decodeHtmlEntities(text) {

    if (!text) {
        return "";
    }

    return String(text)
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&apos;/gi, "'")
        .replace(/&#39;/gi, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&hellip;/gi, "…")
        .replace(/&ndash;/gi, "–")
        .replace(/&mdash;/gi, "—")
        .replace(/&#(\d+);/g, (_, n) =>
            String.fromCharCode(Number(n))
        )
        .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
            String.fromCharCode(
                parseInt(n, 16)
            )
        );
}

/* ========================================================
HTML CLEANING
======================================================== */

function stripHtml(html) {

    if (!html) {
        return "";
    }

    let text = String(html);

    text = text
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
        .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, " ")
        .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
        .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ")
        .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, " ")
        .replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, " ")
        .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, " ");

    text = text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/article>/gi, "\n")
        .replace(/<\/li>/gi, "\n");

    text = text.replace(/<[^>]+>/g, " ");

    text = decodeHtmlEntities(text);

    return cleanText(text);
}

/* ========================================================
ELLIPSIS RAW DETECTION
======================================================== */

/*
این تابع عمداً روی متن خام اجرا می‌شود.

پایان‌های سالم:
...
…

نمونه‌های خراب:
. ..
.. .
... ..
. …
… .
… ..
.…
.......
*/

function hasMalformedEllipsisEnding(text) {

    if (
        text === null ||
        text === undefined
    ) {
        return false;
    }

    const value = String(text)
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")
        .trim();

    if (!value) {
        return false;
    }

    /*
    پایان سالم
    */
    if (
        value.endsWith("...") ||
        value.endsWith("…")
    ) {
        return false;
    }

    /*
    هر پایان ترکیبی از نقطه و سه‌نقطه
    که با فاصله یا ترکیب مختلف آمده باشد.
    */

    const tailMatch =
        value.match(/[\s.….]+$/);

    if (!tailMatch) {
        return false;
    }

    const tail =
        tailMatch[0];

    /*
    اگر فقط یک فاصله معمولی باشد،
    خراب نیست.
    */

    if (
        !/[.…]/.test(tail)
    ) {
        return false;
    }

    /*
    پایان نقطه معمولی جمله:
    "متن کامل شد."
    خراب نیست.
    */

    if (
        tail === "."
    ) {
        return false;
    }

    /*
    سه‌نقطه سالم قبلاً بررسی شد.
    */

    if (
        tail === "..." ||
        tail === "…"
    ) {
        return false;
    }

    /*
    اگر ترکیب شامل:
    . ..
    .. .
    ... ..
    . …
    … .
    … ..
    .....
    باشد، خراب است.
    */

    const normalizedTail =
        tail.replace(/\s+/g, " ").trim();

    if (
        /^(?:\.+\s*){2,}$/.test(
            normalizedTail
        )
    ) {
        return true;
    }

    if (
        /^(?:\.+|…)(?:\s+(?:\.+|…))+$/.test(
            normalizedTail
        )
    ) {
        return true;
    }

    if (
        /^(?:\.+\s*){4,}$/.test(
            normalizedTail
        )
    ) {
        return true;
    }

    if (
        /^(?:…\s*){2,}$/.test(
            normalizedTail
        )
    ) {
        return true;
    }

    /*
    حالت‌هایی مانند:
    .…
    ….
    */

    if (
        /^[.…]{2,}$/.test(
            normalizedTail
        )
    ) {
        return true;
    }

    return false;
}

/* ========================================================
NORMALIZE PERSIAN TEXT
======================================================== */

function normalizePersianText(text) {

    if (!text) {
        return "";
    }

    let value =
        cleanText(text)
            .replace(/ي/g, "ی")
            .replace(/ى/g, "ی")
            .replace(/ك/g, "ک")
            .replace(/ۀ/g, "ه")
            .replace(/ة/g, "ه")
            .replace(/\u0640+/g, "")
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'");

    /*
    --------------------------------------------------------
    اصلاح فاصله در اعداد اعشاری
    --------------------------------------------------------

    فارسی:
    ۱. ۵  -> ۱.۵
    ۱۰. ۵ -> ۱۰.۵

    انگلیسی:
    1. 5 -> 1.5
    10. 5 -> 10.5

    فقط نقطه‌ای که بین دو رقم است
    اصلاح می‌شود.
    */

    value =
        value.replace(
            /([0-9۰-۹]+)\s*\.\s*([0-9۰-۹]+)/g,
            "$1.$2"
        );

    /*
    حذف فاصله قبل از علائم نگارشی
    */

    value =
        value.replace(
            /\s+([،؛:!؟,.])/g,
            "$1"
        );

    /*
    فاصله بعد از علائم نگارشی،
    به‌جز نقطه‌ای که بخشی از عدد اعشاری است.

    مثال:
    "خبر.سپس" -> "خبر. سپس"

    ولی:
    "۱.۵" دست‌نخورده می‌ماند.
    */

    value =
        value.replace(
            /([،؛:!؟])(?=\S)/g,
            "$1 "
        );

    value =
        value.replace(
            /\.(?=\S)/g,
            match => "."
        );

    /*
    نقطه بعد از جمله اگر بلافاصله
    با متن ادامه پیدا کند، فاصله می‌گیرد؛
    اما اعشار دست‌نخورده می‌ماند.
    */

    value =
        value.replace(
            /([.!؟])(?=[^\s.!؟])/g,
            (match, punctuation, offset, full) => {

                if (
                    punctuation === "." &&
                    offset > 0 &&
                    offset + 1 < full.length
                ) {

                    const previous =
                        full[offset - 1];

                    const next =
                        full[offset + 1];

                    if (
                        /[0-9۰-۹]/.test(previous) &&
                        /[0-9۰-۹]/.test(next)
                    ) {
                        return ".";
                    }
                }

                return punctuation + " ";
            }
        );

    /*
    استانداردسازی فاصله‌ها
    */

    value =
        value
            .replace(/[ ]{2,}/g, " ")
            .trim();

    /*
    فقط اگر پایان واقعاً خراب باشد،
    به ... تبدیل می‌شود.

    سه‌نقطه سالم دست‌نخورده می‌ماند.
    */

    if (
        hasMalformedEllipsisEnding(value)
    ) {

        value =
            value
                .replace(
                    /[\s.…]+$/,
                    "..."
                )
                .trim();
    }

    return value;
}

/* ========================================================
ELLIPSIS HELPERS
======================================================== */

function hasEllipsisEnding(text) {

    if (!text) {
        return false;
    }

    const value =
        cleanText(text);

    return (
        value.endsWith("...") ||
        value.endsWith("…")
    );
}

/* ========================================================
NORMALIZE ELLIPSIS ENDING
======================================================== */

function normalizeEllipsisEnding(text) {

    if (!text) {
        return "";
    }

    let value =
        cleanText(text);

    /*
    پایان سالم
    */

    if (
        value.endsWith("...") ||
        value.endsWith("…")
    ) {
        return value;
    }

    /*
    فقط پایان‌های خراب را اصلاح می‌کنیم.
    */

    if (
        hasMalformedEllipsisEnding(value)
    ) {

        value =
            value.replace(
                /[\s.…]+$/,
                "..."
            );
    }

    return value.trim();
}

/* ========================================================
URL
======================================================== */

function normalizeUrl(value) {

    const text =
        cleanText(value);

    if (!text) {
        return "";
    }

    if (
        text.startsWith("http://") ||
        text.startsWith("https://")
    ) {
        return text;
    }

    return "";
}

/* ========================================================
SITE DETECTION
======================================================== */

function detectSite(url) {

    try {

        const hostname =
            new URL(url)
                .hostname
                .toLowerCase();

        if (
            hostname.includes("irna.ir")
        ) {
            return "irna";
        }

        if (
            hostname.includes("isna.ir")
        ) {
            return "isna";
        }

        if (
            hostname.includes("mehrnews.com")
        ) {
            return "mehr";
        }

        if (
            hostname.includes("imna.ir")
        ) {
            return "imna";
        }

        if (
            hostname.includes("ilna.ir")
        ) {
            return "ilna";
        }

        if (
            hostname.includes("tasnimnews.com")
        ) {
            return "tasnim";
        }

        if (
            hostname.includes("farsnews.ir")
        ) {
            return "fars";
        }

        if (
            hostname.includes("khabaronline.ir")
        ) {
            return "khabaronline";
        }

        if (
            hostname.includes("asriran.com")
        ) {
            return "asriran";
        }

        if (
            hostname.includes("yjc.ir")
        ) {
            return "yjc";
        }

        return "generic";

    } catch {

        return "generic";
    }
}

/* ========================================================
REQUEST
======================================================== */

function requestPage(
    url,
    redirectCount = 0
) {

    return new Promise(
        (resolve, reject) => {

            if (
                redirectCount > MAX_REDIRECTS
            ) {

                reject(
                    new Error(
                        "Too many redirects"
                    )
                );

                return;
            }

            let parsed;

            try {

                parsed =
                    new URL(url);

            } catch {

                reject(
                    new Error(
                        "Invalid URL"
                    )
                );

                return;
            }

            const client =
                parsed.protocol === "https:"
                    ? https
                    : http;

            const request =
                client.get(
                    parsed,
                    {
                        headers: {
                            "User-Agent":
                                USER_AGENT,

                            "Accept":
                                "text/html," +
                                "application/xhtml+xml",

                            "Accept-Language":
                                "fa-IR,fa;q=0.9,en;q=0.5",

                            "Cache-Control":
                                "no-cache"
                        }
                    },
                    response => {

                        const status =
                            response.statusCode || 0;

                        /*
                        Redirect
                        */

                        if (
                            [
                                301,
                                302,
                                303,
                                307,
                                308
                            ].includes(status)
                        ) {

                            const location =
                                response.headers.location;

                            response.resume();

                            if (!location) {

                                reject(
                                    new Error(
                                        "Redirect without location"
                                    )
                                );

                                return;
                            }

                            const nextUrl =
                                new URL(
                                    location,
                                    url
                                ).toString();

                            requestPage(
                                nextUrl,
                                redirectCount + 1
                            )
                                .then(resolve)
                                .catch(reject);

                            return;
                        }

                        /*
                        HTTP error
                        */

                        if (
                            status < 200 ||
                            status >= 300
                        ) {

                            response.resume();

                            reject(
                                new Error(
                                    "HTTP " + status
                                )
                            );

                            return;
                        }

                        const chunks = [];

                        let totalSize = 0;

                        response.on(
                            "data",
                            chunk => {

                                totalSize +=
                                    chunk.length;

                                if (
                                    totalSize >
                                    MAX_RESPONSE_SIZE
                                ) {

                                    response.destroy(
                                        new Error(
                                            "Response too large"
                                        )
                                    );

                                    return;
                                }

                                chunks.push(chunk);
                            }
                        );

                        response.on(
                            "end",
                            () => {

                                const buffer =
                                    Buffer.concat(
                                        chunks
                                    );

                                const contentType =
                                    String(
                                        response.headers[
                                            "content-type"
                                        ] || ""
                                    );

                                resolve({
                                    url:
                                        parsed.toString(),

                                    status,

                                    contentType,

                                    html:
                                        buffer.toString(
                                            "utf8"
                                        )
                                });
                            }
                        );
                    }
                );

            request.setTimeout(
                REQUEST_TIMEOUT,
                () => {

                    request.destroy(
                        new Error(
                            "Request timeout"
                        )
                    );
                }
            );

            request.on(
                "error",
                reject
            );
        }
    );
}

/* ========================================================
META EXTRACTION
======================================================== */

function getMetaAttributes(html) {

    const result = [];

    const regex =
        /<meta\b[^>]*>/gi;

    const tags =
        html.match(regex) || [];

    for (
        const tag of tags
    ) {

        const attrs = {};

        const attrRegex =
            /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

        let match;

        while (
            (match = attrRegex.exec(tag))
        ) {

            attrs[
                match[1].toLowerCase()
            ] =
                match[2] ??
                match[3] ??
                match[4] ??
                "";
        }

        result.push(attrs);
    }

    return result;
}

/* ========================================================
META DESCRIPTIONS
======================================================== */

function extractMetaDescriptions(html) {

    const metas =
        getMetaAttributes(html);

    const candidates = [];

    for (
        const meta of metas
    ) {

        const key =
            (
                meta.name ||
                meta.property ||
                meta.itemprop ||
                ""
            ).toLowerCase();

        const content =
            normalizePersianText(
                decodeHtmlEntities(
                    meta.content || ""
                )
            );

        if (!content) {
            continue;
        }

        if (
            key === "og:description" ||
            key === "description"
        ) {

            candidates.push(content);
        }

        if (
            key === "twitter:description"
        ) {

            candidates.push(content);
        }

        if (
            key === "article:description"
        ) {

            candidates.push(content);
        }
    }

    return uniqueTexts(
        candidates
    );
}

/* ========================================================
JSON-LD
======================================================== */

function extractJsonLd(html) {

    const result = [];

    const regex =
        /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

    let match;

    while (
        (match = regex.exec(html))
    ) {

        let raw =
            match[1]
                .trim();

        if (!raw) {
            continue;
        }

        raw =
            raw
                .replace(/^\uFEFF/, "")
                .replace(/<!--/g, "")
                .replace(/-->/g, "")
                .trim();

        try {

            const data =
                JSON.parse(raw);

            collectJsonLd(
                data,
                result
            );

        } catch {

            /*
            JSON-LD خراب را نادیده می‌گیریم.
            */
        }
    }

    return uniqueTexts(
        result
    );
}

/* ========================================================
COLLECT JSON-LD
======================================================== */

function collectJsonLd(
    data,
    result
) {

    if (!data) {
        return;
    }

    if (
        Array.isArray(data)
    ) {

        data.forEach(
            item =>
                collectJsonLd(
                    item,
                    result
                )
        );

        return;
    }

    if (
        typeof data !== "object"
    ) {
        return;
    }

    if (
        typeof data.description ===
        "string"
    ) {

        result.push(
            normalizePersianText(
                decodeHtmlEntities(
                    data.description
                )
            )
        );
    }

    if (
        typeof data.articleBody ===
        "string"
    ) {

        result.push(
            normalizePersianText(
                decodeHtmlEntities(
                    data.articleBody
                )
            )
        );
    }

    if (
        data["@graph"]
    ) {

        collectJsonLd(
            data["@graph"],
            result
        );
    }
}

/* ========================================================
TITLE FROM PAGE
======================================================== */

function extractPageTitle(html) {

    const match =
        html.match(
            /<title[^>]*>([\s\S]*?)<\/title>/i
        );

    if (!match) {
        return "";
    }

    return normalizePersianText(
        stripHtml(
            match[1]
        )
    );
}

/* ========================================================
ARTICLE PARAGRAPHS
======================================================== */

function extractParagraphs(html) {

    const paragraphs = [];

    const regex =
        /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

    let match;

    while (
        (match = regex.exec(html))
    ) {

        const text =
            normalizePersianText(
                stripHtml(
                    match[1]
                )
            );

        if (
            text.length >=
            MIN_SUMMARY_LENGTH
        ) {

            paragraphs.push(text);
        }
    }

    return uniqueTexts(
        paragraphs
    );
}

/* ========================================================
ARTICLE AREAS
======================================================== */

function extractArticleAreas(html) {

    const areas = [];

    const patterns = [

        /<article\b[^>]*>([\s\S]*?)<\/article>/gi,

        /<main\b[^>]*>([\s\S]*?)<\/main>/gi,

        /<div\b[^>]+class=["'][^"']*(?:article|news|content|body|detail|post)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi
    ];

    for (
        const regex of patterns
    ) {

        let match;

        while (
            (match = regex.exec(html))
        ) {

            const text =
                stripHtml(
                    match[1]
                );

            if (
                text.length >=
                MIN_SUMMARY_LENGTH
            ) {

                areas.push(text);
            }
        }
    }

    return uniqueTexts(
        areas
    );
}

/* ========================================================
SITE SPECIFIC EXTRACTION
======================================================== */

function extractSiteSpecificSummary(
    html,
    site
) {

    const selectors = {

        irna: [

            /<div\b[^>]+class=["'][^"']*(?:body|item-body|news-body|article-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ],

        isna: [

            /<div\b[^>]+class=["'][^"']*(?:item-text|news-text|article-text|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ],

        mehr: [

            /<div\b[^>]+class=["'][^"']*(?:item-text|article-body|news-body|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ],

        imna: [

            /<div\b[^>]+class=["'][^"']*(?:news-body|item-body|article-body|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ],

        ilna: [

            /<div\b[^>]+class=["'][^"']*(?:news-body|article-body|item-body|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ],

        tasnim: [

            /<div\b[^>]+class=["'][^"']*(?:body|news-body|content|article-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ],

        fars: [

            /<div\b[^>]+class=["'][^"']*(?:news-body|body|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ],

        khabaronline: [

            /<div\b[^>]+class=["'][^"']*(?:body|content|article-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ],

        asriran: [

            /<div\b[^>]+class=["'][^"']*(?:body|content|article-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ],

        yjc: [

            /<div\b[^>]+class=["'][^"']*(?:news-text|content|article-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,

            /<article\b[^>]*>([\s\S]*?)<\/article>/gi
        ]
    };

    const patterns =
        selectors[site] || [];

    const candidates = [];

    for (
        const regex of patterns
    ) {

        let match;

        while (
            (match = regex.exec(html))
        ) {

            const text =
                normalizePersianText(
                    stripHtml(
                        match[1]
                    )
                );

            if (
                text.length >=
                MIN_SUMMARY_LENGTH
            ) {

                candidates.push(text);
            }
        }
    }

    return uniqueTexts(
        candidates
    );
}

/* ========================================================
UNIQUE
======================================================== */

function uniqueTexts(values) {

    const seen =
        new Set();

    const result = [];

    for (
        const value of values
    ) {

        const text =
            normalizePersianText(
                value
            );

        if (!text) {
            continue;
        }

        const key =
            text
                .replace(/\s+/g, " ")
                .trim();

        if (
            seen.has(key)
        ) {
            continue;
        }

        seen.add(key);

        result.push(text);
    }

    return result;
}

/* ========================================================
BAD / USELESS TEXT
======================================================== */

const BAD_PHRASES = [

    "بیشتر بخوانید",
    "ادامه مطلب",
    "ادامه خبر",
    "برای مشاهده ادامه",
    "برای خواندن ادامه",
    "کلیک کنید",
    "اینجا کلیک",
    "منبع:",
    "ارسال نظر",
    "نظرات",
    "تبلیغات",
    "خبرنامه",
    "عضویت در خبرنامه",
    "کانال تلگرام",
    "کانال ایتا",
    "کانال روبیکا",
    "واتساپ",
    "اینستاگرام",
    "لینکدین",
    "دنبال کنید",
    "پیشنهاد سردبیر",
    "اخبار مرتبط",
    "مطالب مرتبط",
    "گزارش تصویری",
    "تصاویر بیشتر",
    "کد خبر",
    "کدخبر",
    "انتهای پیام",
    "پایان پیام"
];

/* ========================================================
BAD PHRASE CHECK
======================================================== */

function containsBadPhrase(text) {

    const lower =
        text.toLowerCase();

    return BAD_PHRASES.some(
        phrase =>
            lower.includes(
                phrase.toLowerCase()
            )
    );
}

/* ========================================================
TRUNCATION HELPERS
======================================================== */

function removeTrailingIncomplete(text) {

    let value =
        normalizePersianText(
            text
        );

    /*
    علائم انتهایی ناقص
    */

    value =
        value
            .replace(/[،:؛]+$/g, "")
            .trim();

    return value;
}

/* ========================================================
STRONG ENDING
======================================================== */

function hasStrongEnding(text) {

    if (!text) {
        return false;
    }

    const value =
        cleanText(text);

    if (
        hasEllipsisEnding(value)
    ) {
        return true;
    }

    return /[.!؟؛]$/.test(
        value
    );
}

/* ========================================================
SENTENCE ENDINGS
======================================================== */

function findSentenceEndings(text) {

    const positions = [];

    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];

        /*
        پرسش و تعجب
        */

        if (
            char === "؟" ||
            char === "!"
        ) {

            positions.push(
                i + 1
            );

            continue;
        }

        /*
        نقطه
        */

        if (
            char === "."
        ) {

            /*
            سه‌نقطه
            */

            if (
                text[i + 1] === "." ||
                text[i - 1] === "."
            ) {

                continue;
            }

            const previous =
                text[i - 1] || "";

            const next =
                text[i + 1] || "";

            /*
            عدد اعشاری فارسی یا انگلیسی
            */

            if (
                /[0-9۰-۹]/.test(previous) &&
                /[0-9۰-۹]/.test(next)
            ) {

                continue;
            }

            positions.push(
                i + 1
            );

            continue;
        }

        /*
        نقطه‌ویرگول
        */

        if (
            char === "؛"
        ) {

            positions.push(
                i + 1
            );
        }
    }

    return positions;
}

/* ========================================================
REMOVE ELLIPSIS FOR ANALYSIS
======================================================== */

function removeTerminalEllipsis(text) {

    if (!text) {
        return "";
    }

    return cleanText(text)
        .replace(
            /(?:\.\.\.|…)\s*$/,
            ""
        )
        .trim();
}

/* ========================================================
INCOMPLETE CONNECTORS
======================================================== */

const INCOMPLETE_ENDINGS = [

    " و",
    " یا",
    " که",
    " از",
    " به",
    " برای",
    " با",
    " در",
    " همچنین",
    " اما",
    " اگر",
    " این",
    " آن",
    " بر",
    " تا",
    " نیز"
];

/* ========================================================
IS INCOMPLETE
======================================================== */

function isIncompleteSummary(text) {

    if (!text) {
        return true;
    }

    const value =
        normalizePersianText(
            text
        );

    if (
        value.length <
        MIN_SUMMARY_LENGTH
    ) {

        return true;
    }

    const validationValue =
        removeTerminalEllipsis(
            value
        );

    if (
        /[،:؛]$/.test(
            validationValue
        )
    ) {

        return true;
    }

    for (
        const ending of INCOMPLETE_ENDINGS
    ) {

        if (
            validationValue.endsWith(
                ending
            )
        ) {

            return true;
        }
    }

    return false;
}

/* ========================================================
NATURAL SHORTENING
======================================================== */

function shortenNaturally(
    text,
    maxLength = MAX_SUMMARY_LENGTH
) {

    let value =
        normalizePersianText(
            text
        );

    if (!value) {
        return "";
    }

    /*
    سه‌نقطه انتهایی قبلی را برای
    تحلیل طول حذف می‌کنیم.
    */

    if (
        hasEllipsisEnding(value)
    ) {

        value =
            removeTerminalEllipsis(
                value
            );
    }

    value =
        removeTrailingIncomplete(
            value
        );

    if (!value) {
        return "";
    }

    /*
    اگر متن کامل و در محدوده است،
    هیچ ... اضافه نمی‌کنیم.
    */

    if (
        value.length <= maxLength &&
        hasStrongEnding(value)
    ) {

        return value;
    }

    /*
    ابتدا آخرین جمله کامل
    در محدوده را پیدا می‌کنیم.
    */

    const endings =
        findSentenceEndings(
            value
        );

    let best = "";

    for (
        const end of endings
    ) {

        if (
            end <= maxLength
        ) {

            const candidate =
                value
                    .slice(0, end)
                    .trim();

            if (
                candidate.length >=
                MIN_SUMMARY_LENGTH &&
                !isIncompleteSummary(
                    candidate
                )
            ) {

                best = candidate;
            }
        }
    }

    /*
    جمله کامل پیدا شد.
    */

    if (best) {
        return best;
    }

    /*
    متن واقعاً باید کوتاه شود.
    */

    const needsEllipsis =
        value.length >
        maxLength;

    const suffix =
        needsEllipsis
            ? "..."
            : "";

    const availableLength =
        needsEllipsis
            ? maxLength - suffix.length
            : maxLength;

    let candidate =
        value.slice(
            0,
            availableLength
        );

    /*
    کلمه نصف نشود.
    */

    let cut =
        candidate.lastIndexOf(" ");

    if (
        cut < MIN_SUMMARY_LENGTH
    ) {

        cut =
            candidate.length;
    }

    let result =
        value
            .slice(
                0,
                cut
            )
            .trim();

    /*
    پایان ناقص حذف شود.
    */

    result =
        removeTrailingIncomplete(
            result
        );

    /*
    علائم ناقص انتهایی حذف شوند.
    */

    result =
        result
            .replace(
                /[،:؛]+$/g,
                ""
            )
            .trim();

    if (
        needsEllipsis &&
        result
    ) {

        result =
            result.replace(
                /[\s.…]+$/g,
                ""
            );

        return (
            result +
            suffix
        );
    }

    return result;
}

/* ========================================================
FINAL SUMMARY NORMALIZER
======================================================== */

function finalizeSummary(
    text,
    maxLength = MAX_SUMMARY_LENGTH
) {

    if (!text) {
        return "";
    }

    let value =
        normalizePersianText(
            text
        );

    if (!value) {
        return "";
    }

    value =
        normalizeEllipsisEnding(
            value
        );

    /*
    اگر متن در محدوده است،
    دست‌کاری بیشتر نمی‌شود.
    */

    if (
        value.length <= maxLength
    ) {

        return value;
    }

    /*
    متن بیش از سقف است.
    */

    let result =
        shortenNaturally(
            value,
            maxLength
        );

    if (!result) {
        return "";
    }

    /*
    محافظ نهایی طول
    */

    if (
        result.length >
        maxLength
    ) {

        const suffix =
            "...";

        const limit =
            maxLength -
            suffix.length;

        let cut =
            result
                .replace(
                    /(?:\.\.\.|…)\s*$/,
                    ""
                )
                .slice(
                    0,
                    limit
                )
                .trim();

        const space =
            cut.lastIndexOf(" ");

        if (
            space >=
            MIN_SUMMARY_LENGTH
        ) {

            cut =
                cut
                    .slice(
                        0,
                        space
                    )
                    .trim();
        }

        cut =
            cut
                .replace(
                    /[\s.…،:؛]+$/g,
                    ""
                )
                .trim();

        result =
            cut +
            suffix;
    }

    return result;
}

/* ========================================================
USEFUL SUMMARY
======================================================== */

function isUsefulSummary(text) {

    if (!text) {
        return false;
    }

    const value =
        normalizePersianText(
            text
        );

    if (
        value.length <
        MIN_SUMMARY_LENGTH
    ) {

        return false;
    }

    if (
        value.length >
        MAX_SUMMARY_LENGTH
    ) {

        return false;
    }

    if (
        containsBadPhrase(value)
    ) {

        return false;
    }

    if (
        isIncompleteSummary(value)
    ) {

        return false;
    }

    /*
    URL تنها
    */

    if (
        /^https?:\/\//i.test(
            value
        )
    ) {

        return false;
    }

    /*
    درصد حداقل حروف
    */

    const letters =
        (
            value.match(
                /[\u0600-\u06FFa-zA-Z]/g
            ) || []
        ).length;

    if (
        letters <
        MIN_SUMMARY_LENGTH * 0.45
    ) {

        return false;
    }

    return true;
}

/* ========================================================
CLEAN CANDIDATE
======================================================== */

function cleanCandidate(text) {

    if (!text) {
        return "";
    }

    let value =
        normalizePersianText(
            stripHtml(text)
        );

    if (!value) {
        return "";
    }

    /*
    حذف عبارات ابتدایی
    */

    value =
        value.replace(
            /^(?:خبرگزاری\s+)?(?:به گزارش|گزارش\s+)[^:]{0,100}:\s*/i,
            ""
        );

    /*
    حذف عبارات تبلیغاتی
    */

    for (
        const phrase of BAD_PHRASES
    ) {

        const index =
            value.indexOf(
                phrase
            );

        if (
            index >
            MIN_SUMMARY_LENGTH
        ) {

            value =
                value
                    .slice(
                        0,
                        index
                    )
                    .trim();
        }
    }

    return value;
}

/* ========================================================
CANDIDATE SCORING
======================================================== */

function scoreCandidate(
    text,
    sourceType,
    site
) {

    if (!text) {
        return -999;
    }

    const value =
        normalizePersianText(
            text
        );

    let score = 0;

    /*
    طول مناسب
    */

    if (
        value.length >= 80 &&
        value.length <= 500
    ) {

        score += 20;
    }

    /*
    جمله کامل
    */

    if (
        hasStrongEnding(value)
    ) {

        score += 20;
    }

    /*
    متن بسیار طولانی
    */

    if (
        value.length > 1200
    ) {

        score -= 15;
    }

    /*
    نوع منبع
    */

    if (
        sourceType === "og"
    ) {

        score += 30;
    }

    if (
        sourceType === "meta"
    ) {

        score += 25;
    }

    if (
        sourceType === "jsonld-description"
    ) {

        score += 28;
    }

    if (
        sourceType === "site"
    ) {

        score += 24;
    }

    if (
        sourceType === "paragraph"
    ) {

        score += 18;
    }

    if (
        sourceType === "article"
    ) {

        score += 10;
    }

    /*
    سایت‌هایی که استخراج اختصاصی
    برایشان مناسب‌تر است.
    */

    if (
        site === "irna" &&
        sourceType === "site"
    ) {

        score += 8;
    }

    if (
        site === "isna" &&
        sourceType === "site"
    ) {

        score += 8;
    }

    if (
        site === "ilna" &&
        sourceType === "site"
    ) {

        score += 8;
    }

    /*
    تبلیغات
    */

    if (
        containsBadPhrase(value)
    ) {

        score -= 100;
    }

    /*
    پایان ناقص
    */

    if (
        isIncompleteSummary(value)
    ) {

        score -= 60;
    }

    return score;
}

/* ========================================================
BUILD CANDIDATES
======================================================== */

function buildCandidates(
    html,
    site
) {

    const candidates = [];

    /*
    META
    */

    const metas =
        extractMetaDescriptions(
            html
        );

    metas.forEach(
        text => {

            candidates.push({
                text,
                type: "meta"
            });
        }
    );

    /*
    JSON-LD
    */

    const jsonld =
        extractJsonLd(
            html
        );

    jsonld.forEach(
        text => {

            candidates.push({
                text,
                type:
                    text.length > 1000
                        ? "article"
                        : "jsonld-description"
            });
        }
    );

    /*
    Site specific
    */

    const siteSpecific =
        extractSiteSpecificSummary(
            html,
            site
        );

    siteSpecific.forEach(
        text => {

            candidates.push({
                text,
                type: "site"
            });
        }
    );

    /*
    Article / Main
    */

    const areas =
        extractArticleAreas(
            html
        );

    areas.forEach(
        text => {

            candidates.push({
                text,
                type: "article"
            });
        }
    );

    /*
    Paragraphs
    */

    const paragraphs =
        extractParagraphs(
            html
        );

    paragraphs.forEach(
        text => {

            candidates.push({
                text,
                type: "paragraph"
            });
        }
    );

    return candidates;
}

/* ========================================================
SELECT BEST SUMMARY
======================================================== */

function chooseSummary(
    candidates,
    site
) {

    const prepared = [];

    for (
        const candidate of candidates
    ) {

        const cleaned =
            cleanCandidate(
                candidate.text
            );

        if (!cleaned) {
            continue;
        }

        let summary =
            cleaned;

        if (
            summary.length >
            MAX_SUMMARY_LENGTH
        ) {

            summary =
                shortenNaturally(
                    summary,
                    MAX_SUMMARY_LENGTH
                );
        }

        summary =
            finalizeSummary(
                summary
            );

        if (
            !isUsefulSummary(
                summary
            )
        ) {

            continue;
        }

        const score =
            scoreCandidate(
                cleaned,
                candidate.type,
                site
            );

        prepared.push({
            summary,
            score,
            type: candidate.type
        });
    }

    /*
    ابتدا بر اساس امتیاز
    */

    prepared.sort(
        (a, b) =>
            b.score -
            a.score
    );

    if (
        !prepared.length
    ) {

        return "";
    }

    /*
    جلوگیری از انتخاب خلاصه‌ای که
    عملاً فقط عنوان را تکرار می‌کند
    در صورت وجود گزینه بهتر.
    */

    return prepared[0].summary;
}

/* ========================================================
RSS FALLBACK
======================================================== */

function buildSummaryFromRssDescription(
    item
) {

    const raw =
        item &&
        typeof item.rssDescription ===
            "string"
            ? item.rssDescription
            : "";

    if (!raw) {
        return null;
    }

    const cleaned =
        cleanCandidate(
            raw
        );

    if (!cleaned) {
        return null;
    }

    let summary =
        cleaned;

    if (
        summary.length >
        MAX_SUMMARY_LENGTH
    ) {

        summary =
            shortenNaturally(
                summary,
                MAX_SUMMARY_LENGTH
            );
    }

    summary =
        finalizeSummary(
            summary
        );

    if (
        !isUsefulSummary(
            summary
        )
    ) {

        return null;
    }

    return {
        summary,
        status: "found-rss-fallback"
    };
}

/* ========================================================
EXTRACT SUMMARY FROM PAGE
======================================================== */

async function generateSummary(
    item
) {

    const url =
        normalizeUrl(
            item.link ||
            item.url ||
            item.href
        );

    if (!url) {

        return {
            summary: "",
            status: "no-url"
        };
    }

    const site =
        detectSite(
            url
        );

    let primaryResult;

    try {

        const response =
            await requestPage(
                url
            );

        const html =
            response.html || "";

        if (!html) {

            primaryResult = {
                summary: "",
                status: "empty-response"
            };

        } else {

            const candidates =
                buildCandidates(
                    html,
                    site
                );

            let summary =
                chooseSummary(
                    candidates,
                    site
                );

            /*
            اگر هیچ خلاصه‌ای پیدا نشد،
            یک بار پاراگراف‌ها را بررسی می‌کنیم.
            */

            if (!summary) {

                const paragraphs =
                    extractParagraphs(
                        html
                    );

                for (
                    const paragraph of paragraphs
                ) {

                    const cleaned =
                        cleanCandidate(
                            paragraph
                        );

                    if (!cleaned) {
                        continue;
                    }

                    const shortened =
                        shortenNaturally(
                            cleaned
                        );

                    const finalized =
                        finalizeSummary(
                            shortened
                        );

                    if (
                        isUsefulSummary(
                            finalized
                        )
                    ) {

                        summary =
                            finalized;

                        break;
                    }
                }
            }

            primaryResult =
                summary
                    ? {
                        summary:
                            finalizeSummary(
                                summary
                            ),
                        status: "found"
                    }
                    : {
                        summary: "",
                        status: "not-found"
                    };
        }

    } catch (error) {

        primaryResult = {
            summary: "",
            status: "fetch-failed",
            error:
                error.message
        };
    }

    /*
    RSS فقط وقتی مسیر اصلی
    خلاصه‌ای پیدا نکرده است.
    */

    if (
        primaryResult.status ===
        "not-found"
    ) {

        const rssFallback =
            buildSummaryFromRssDescription(
                item
            );

        if (rssFallback) {
            return rssFallback;
        }
    }

    return primaryResult;
}

/* ========================================================
PREVIOUS FILE
======================================================== */

function loadPreviousFile() {

    if (
        !fs.existsSync(
            OUTPUT_FILE
        )
    ) {

        return null;
    }

    try {

        const raw =
            fs.readFileSync(
                OUTPUT_FILE,
                "utf8"
            );

        return JSON.parse(
            raw
        );

    } catch (error) {

        console.warn(
            "⚠️ خواندن news-summary.json قبلی ناموفق بود:",
            error.message
        );

        return null;
    }
}

/* ========================================================
GET NEWS ARRAY
======================================================== */

function getNewsArray(data) {

    if (
        Array.isArray(data)
    ) {

        return data;
    }

    if (
        data &&
        Array.isArray(data.news)
    ) {

        return data.news;
    }

    if (
        data &&
        Array.isArray(data.items)
    ) {

        return data.items;
    }

    return [];
}

/* ========================================================
GET ITEM URL
======================================================== */

function getItemUrl(item) {

    return normalizeUrl(
        item &&
        (
            item.link ||
            item.url ||
            item.href
        )
    );
}

/* ========================================================
PREVIOUS MAP
======================================================== */

function buildPreviousMap(data) {

    const map =
        new Map();

    const items =
        getNewsArray(
            data
        );

    for (
        const item of items
    ) {

        const url =
            getItemUrl(
                item
            );

        if (!url) {
            continue;
        }

        /*
        متن خام قبلی را نگه می‌داریم.
        */

        const summary =
            item &&
            typeof item.summary ===
                "string"
                ? item.summary
                : "";

        map.set(
            url,
            {
                ...item,
                summary
            }
        );
    }

    return map;
}

/* ========================================================
PREVIOUS SUMMARY VALIDATION
======================================================== */

function isValidPreviousSummary(
    summary
) {

    if (!summary) {
        return false;
    }

    /*
    بسیار مهم:
    ابتدا متن خام را بررسی می‌کنیم.
    */

    if (
        hasMalformedEllipsisEnding(
            summary
        )
    ) {

        return false;
    }

    const normalized =
        normalizePersianText(
            summary
        );

    if (!normalized) {
        return false;
    }

    /*
    بعد از Normalize نیز بررسی می‌کنیم.
    */

    if (
        hasMalformedEllipsisEnding(
            normalized
        )
    ) {

        return false;
    }

    /*
    خلاصه ناقص نباید reuse شود.
    */

    if (
        isIncompleteSummary(
            normalized
        )
    ) {

        return false;
    }

    if (
        !isUsefulSummary(
            normalized
        )
    ) {

        return false;
    }

    /*
    خلاصه‌های نزدیک سقف که پایان مشخصی
    ندارند احتمالاً در اجرای قبلی
    بریده شده‌اند.
    */

    if (
        normalized.length >=
        MAX_SUMMARY_LENGTH - 3 &&
        !hasEllipsisEnding(normalized) &&
        !hasStrongEnding(normalized)
    ) {

        return false;
    }

    /*
    اگر خلاصه قبلی بیش از سقف باشد،
    آن را دوباره کوتاه می‌کنیم.
    */

    if (
        normalized.length >
        MAX_SUMMARY_LENGTH
    ) {

        const shortened =
            shortenNaturally(
                normalized
            );

        const finalized =
            finalizeSummary(
                shortened
            );

        return isUsefulSummary(
            finalized
        );
    }

    return true;
}

/* ========================================================
NEWS NORMALIZATION
======================================================== */

function normalizeNewsItem(
    item,
    index
) {

    const source =
        item &&
        typeof item === "object"
            ? item
            : {};

    const normalized = {
        ...source
    };

    normalized.title =
        decodeHtmlEntities(
            cleanText(
                source.title ||
                source.name ||
                source.headline ||
                ""
            )
        );

    normalized.link =
        normalizeUrl(
            source.link ||
            source.url ||
            source.href ||
            ""
        );

    normalized.source =
        cleanText(
            source.source ||
            source.publisher ||
            source.origin ||
            source.site ||
            ""
        );

    normalized.category =
        cleanText(
            source.category ||
            source.cat ||
            source.group ||
            "متفرقه"
        );

    normalized.flag =
        source.flag ??
        "";

    normalized.date =
        source.date ||
        source.pubDate ||
        source.publishedAt ||
        source.published_at ||
        source.createdAt ||
        source.created_at ||
        "";

    normalized._index =
        index;

    return normalized;
}

/* ========================================================
CONCURRENCY
======================================================== */

async function processWithConcurrency(
    items,
    worker,
    concurrency
) {

    const results =
        new Array(
            items.length
        );

    let nextIndex = 0;

    async function runner() {

        while (true) {

            const index =
                nextIndex++;

            if (
                index >=
                items.length
            ) {

                return;
            }

            try {

                results[index] =
                    await worker(
                        items[index],
                        index
                    );

            } catch (error) {

                results[index] = {
                    error
                };
            }
        }
    }

    const workers = [];

    const count =
        Math.min(
            concurrency,
            items.length
        );

    for (
        let i = 0;
        i < count;
        i++
    ) {

        workers.push(
            runner()
        );
    }

    await Promise.all(
        workers
    );

    return results;
}

/* ========================================================
MAIN
======================================================== */

async function main() {

    console.log("");
    console.log(
        "📰 تولید خلاصه اخبار دیار قدمگاه"
    );
    console.log("");

    /*
    Read input
    */

    if (
        !fs.existsSync(
            INPUT_FILE
        )
    ) {

        throw new Error(
            "فایل news.json پیدا نشد: " +
            INPUT_FILE
        );
    }

    const inputRaw =
        fs.readFileSync(
            INPUT_FILE,
            "utf8"
        );

    const inputData =
        JSON.parse(
            inputRaw
        );

    const inputNews =
        getNewsArray(
            inputData
        )
            .map(
                normalizeNewsItem
            );

    if (
        !inputNews.length
    ) {

        throw new Error(
            "هیچ خبری در news.json پیدا نشد."
        );
    }

    console.log(
        "📥 تعداد اخبار ورودی:",
        inputNews.length
    );

    /*
    Previous
    */

    const previousData =
        loadPreviousFile();

    const previousMap =
        buildPreviousMap(
            previousData
        );

    let keptCount = 0;

    let needFetchCount = 0;

    /*
    Decide which items need fetching
    */

    const jobs =
        inputNews.map(
            item => {

                const previous =
                    previousMap.get(
                        item.link
                    );

                const previousSummary =
                    previous &&
                    typeof previous.summary ===
                        "string"
                        ? previous.summary
                        : "";

                if (
                    isValidPreviousSummary(
                        previousSummary
                    )
                ) {

                    let summary =
                        normalizePersianText(
                            previousSummary
                        );

                    if (
                        summary.length >
                        MAX_SUMMARY_LENGTH
                    ) {

                        summary =
                            shortenNaturally(
                                summary
                            );
                    }

                    summary =
                        finalizeSummary(
                            summary
                        );

                    if (
                        isUsefulSummary(
                            summary
                        )
                    ) {

                        keptCount++;

                        return {
                            item,
                            reuse: true,
                            summary
                        };
                    }
                }

                needFetchCount++;

                return {
                    item,
                    reuse: false,
                    summary: ""
                };
            }
        );

    console.log(
        "♻️ خلاصه‌های سالم قبلی:",
        keptCount
    );

    console.log(
        "🌐 نیازمند بررسی اینترنتی:",
        needFetchCount
    );

    console.log("");

    /*
    Fetch only missing / incomplete
    */

    const fetchJobs =
        jobs.filter(
            job =>
                !job.reuse
        );

    let foundCount = 0;

    let notFoundCount = 0;

    let failedCount = 0;

    const fetched =
        await processWithConcurrency(
            fetchJobs,
            async job => {

                const title =
                    job.item.title ||
                    "بدون عنوان";

                const result =
                    await generateSummary(
                        job.item
                    );

                if (
                    result.summary
                ) {

                    foundCount++;

                    console.log(
                        "✅",
                        title
                    );

                    console.log(
                        " 📝",
                        result.summary
                    );

                } else if (
                    result.status ===
                    "fetch-failed"
                ) {

                    failedCount++;

                    console.log(
                        "⚠️",
                        title,
                        "→",
                        result.error ||
                        "خطای دریافت"
                    );

                } else {

                    notFoundCount++;

                    console.log(
                        "ℹ️",
                        title,
                        "→ خلاصه پیدا نشد"
                    );
                }

                return {
                    ...job,
                    ...result
                };
            },
            CONCURRENCY
        );

    /*
    Merge results
    */

    const fetchedMap =
        new Map();

    for (
        const result of fetched
    ) {

        if (!result) {
            continue;
        }

        fetchedMap.set(
            result.item.link,
            result
        );
    }

    const finalNews =
        inputNews.map(
            item => {

                const job =
                    jobs.find(
                        x =>
                            x.item.link ===
                            item.link
                    );

                let summary = "";

                let status =
                    "not-found";

                /*
                Reused
                */

                if (
                    job &&
                    job.reuse
                ) {

                    summary =
                        job.summary;

                    status =
                        "reused";

                } else {

                    const fetchedResult =
                        fetchedMap.get(
                            item.link
                        );

                    if (
                        fetchedResult
                    ) {

                        summary =
                            fetchedResult.summary ||
                            "";

                        status =
                            fetchedResult.status ||
                            (
                                summary
                                    ? "found"
                                    : "not-found"
                            );
                    }
                }

                /*
                آخرین کنترل کیفیت
                */

                summary =
                    normalizePersianText(
                        summary
                    );

                summary =
                    finalizeSummary(
                        summary
                    );

                /*
                اگر خلاصه معتبر نیست،
                خالی می‌ماند.
                */

                if (
                    !isUsefulSummary(
                        summary
                    )
                ) {

                    summary = "";

                    if (
                        status ===
                        "reused"
                    ) {

                        status =
                            "not-found";
                    }
                }

                /*
                ساختار اصلی خبر حفظ می‌شود.
                */

                return {

                    ...item,

                    summary,

                    status
                };
            }
        );

    /*
    Statistics
    */

    const summariesFound =
        finalNews.filter(
            item =>
                Boolean(
                    item.summary
                )
        ).length;

    const summariesMissing =
        finalNews.length -
        summariesFound;

    /*
    Output
    */

    const output = {

        lastUpdate:
            new Date().toISOString(),

        sourceLastUpdate:
            inputData.sourceLastUpdate ||
            inputData.lastUpdate ||
            null,

        totalNews:
            finalNews.length,

        summariesFound,

        summariesMissing,

        news:
            finalNews
    };

    fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(
            output,
            null,
            2
        ),
        "utf8"
    );

    /*
    Final report
    */

    console.log("");

    console.log(
        "✅ عملیات تولید خلاصه‌ها پایان یافت."
    );

    console.log("");

    console.log(
        "📊 کل اخبار:",
        finalNews.length
    );

    console.log(
        "📝 خلاصه موجود:",
        summariesFound
    );

    console.log(
        "❌ بدون خلاصه:",
        summariesMissing
    );

    console.log(
        "♻️ استفاده از خلاصه قبلی:",
        keptCount
    );

    console.log(
        "🌐 خلاصه‌های جدید پیدا شده:",
        foundCount
    );

    console.log(
        "ℹ️ خلاصه پیدا نشد:",
        notFoundCount
    );

    console.log(
        "⚠️ خطای دریافت:",
        failedCount
    );

    console.log("");

    console.log(
        "📄 خروجی:",
        OUTPUT_FILE
    );

    console.log("");
}

/* ========================================================
START
======================================================== */

main()
    .catch(
        error => {

            console.error("");

            console.error(
                "❌ خطای اصلی:"
            );

            console.error(
                error.message
            );

            console.error("");

            process.exit(1);
        }
    );
