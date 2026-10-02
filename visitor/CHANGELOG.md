# Changelog

All notable changes to the **Diyar Visitor Widget** are documented in this
file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] — 2026-08-08

### Added

- **A real, working data backend.** `visitor/stats.json` is no longer a
  static demo file — it's now published automatically from real,
  deduplicated visit counts. Two new components, living outside the
  `visitor/` folder GitHub Pages serves, make this possible:
  - `worker/` — a Cloudflare Worker (`src/index.js`) with two routes:
    `POST /hit` (called once per real page load to record a
    privacy-respecting, deduplicated visit) and `GET /aggregate`
    (authenticated, returns live `today`/`yesterday`/`week`/`month`/
    `total`/`online`/`updatedAt` computed from a Cloudflare D1 database).
  - `.github/workflows/publish-stats.yml` — a scheduled GitHub Actions
    workflow (every ~10 minutes) that reads the Worker's aggregate and
    commits it to `visitor/stats.json` using the workflow's own built-in,
    short-lived `GITHUB_TOKEN` — no external token is ever exposed.
- `embed.js` now sends a single, fire-and-forget visit beacon
  (`navigator.sendBeacon`, with a `fetch` fallback) to the new Worker on
  load. This is the only addition to any widget file — see "Changed"
  below for the exact scope.

### Changed

- `embed.js`: added the `TRACK_ENDPOINT` constant and `sendVisitBeacon()`,
  called once at the very start of `init()`. Every failure mode (missing
  `sendBeacon`, network error, an unconfigured placeholder URL) is
  swallowed silently and can never block or delay widget rendering.

### Unchanged (by design)

- `visitor.js`, `utils.js`, `theme.js`, `animations.js`, `config.js`,
  `index.html`, `visitor.css`, `demo.css` — zero changes. The widget still
  consumes `stats.json` through the exact same `fetchVisitorStats()` path
  it always has; it has no idea the file is now real instead of static.
- The `stats.json` schema — still exactly `{ today, yesterday, week,
  month, total, online, updatedAt }`, nothing added or renamed.
- The Blogfa template — still only ever needs the one `<script
  src=".../embed.js">` tag it already has.

### Privacy & Security Notes

- Visit deduplication uses `SHA-256(IP + User-Agent + calendar day)`. The
  raw IP address is **never** written to the database — only its
  daily-rotating hash.
- The Worker's `/aggregate` endpoint (which exposes real numbers before
  they're public in `stats.json`) requires a shared-secret header, known
  only to the GitHub Actions workflow.

## [1.2.0] — 2026-08-06

### Added

- **A fully original icon set** (`icons/calendar.svg`, `chart.svg`, `eye.svg`,
  `globe.svg`, `online.svg`, `favicon.svg`), designed from scratch around a
  single unifying "Signal" language: a minimal rounded silhouette plus
  exactly one solid accent dot per icon, representing a visitor data point.
  Consistent `viewBox="0 0 24 24"`, `stroke-width="1.8"`, round line caps
  and joins, and `currentColor` throughout. None of the shapes are copied
  from any icon library.
- A distinctive `favicon.svg` brand mark — a rounded "D" monogram with an
  embedded accent dot — replacing the previous generic icon.

### Changed

- The inline SVG sprites in both `index.html` and `embed.js` were migrated
  to the new icon geometry. Symbol ids (`icon-eye`, `icon-calendar`,
  `icon-chart`, `icon-globe`, `icon-online`) and everything downstream in
  `visitor.js` are unchanged — this was a pure visual swap.
- The standalone files under `icons/` use `currentColor` with an inline
  `style="color:..."` fallback, so they stay theme-adaptable when used by
  the sprite while still rendering with a sensible color when viewed
  standalone (e.g. in a file browser or this README).

### Verified

- Geometry cross-checked programmatically across `icons/*.svg`,
  `index.html`'s sprite, and `embed.js`'s sprite — confirmed byte-for-byte
  identical in all three locations for every migrated icon.
- No hardcoded colors remain inside either sprite; `visitor.js` was not
  modified.

## [1.1.0] — 2026-08-03

### Added

- **Real data layer**: `stats.json` is now the widget's actual data source,
  fetched by `utils.js` via `config.js`'s `DATA_URL`, replacing the earlier
  mock-data placeholder entirely.
- **Schema flexibility**: `stats.json` may use either a flat legacy shape
  or a versioned, nested shape (`{ version, generatedAt, stats: {...} }`);
  `utils.js` detects and normalizes both automatically.
- **Retry logic**: failed `stats.json` requests are retried automatically
  (`config.API_RETRY_COUNT`, default 2 additional attempts) with cache-busting
  on every retry, before falling back to the last-known-good cache or
  `DEFAULT_DATA`.
- **`embed.js`** — a single-tag loader (`<script src=".../embed.js">`) that
  auto-discovers its own directory, injects the stylesheet and icon sprite
  once, loads all dependent modules in the correct order, and mounts a
  widget instance exactly where the tag was placed. Built for third-party
  pages (Blogfa, plain HTML sites) as a first-class use case.
- **`demo.css`** — page-shell styling (background, backdrop, intro copy)
  for the bundled `index.html` demo, split out of `visitor.css` so the
  widget's own stylesheet never leaks page-level styles onto a host page.
- **Multi-instance mounting**: `autoInit()` now discovers widgets marked up
  via the legacy `#diyar-visitor-widget` id, a `[data-diyar-widget]`
  attribute, or a `.diyar-visitor-widget` class — all on one page,
  simultaneously. `DiyarVisitor.mount()` now also accepts a `NodeList` or
  an `Array` of elements in addition to a selector string or single
  element, returning an array of instances when more than one element
  resolves (a single element still returns a single instance object,
  unchanged).
- Content-Type validation on `stats.json` responses, tolerant of a missing
  header (some CDNs omit it) but rejecting a header that is present and
  explicitly non-JSON — guards against HTML error pages being parsed as data.

### Fixed

- **CSS scoping**: `visitor.css` previously included a global `*` box-sizing
  reset and unscoped `html`/`body`/`:root` rules. Since `embed.js` loads this
  file verbatim on third-party pages, these rules would have overridden the
  host page's own background, text color, and font the instant the widget
  was embedded. Every rule in `visitor.css` is now scoped under
  `.diyar-visitor`.
- **`destroy()` didn't actually destroy**: the theme-toggle and refresh
  button click listeners (and their ripple effects) were anonymous closures
  with no stored reference, so `destroy()` couldn't remove them — a
  "destroyed" widget instance kept responding to clicks. `destroy()` now
  removes every listener it attached and clears the instance's rendered
  markup entirely.
- **Duplicate network requests across multiple widget instances**: the
  request-deduplication guard in `fetchVisitorStats` only applied to
  non-forced calls, but every real call site (polling, manual refresh,
  visibility-resume) always passes `force: true` — so it never actually
  engaged. With several widgets mounted on one page, every polling tick
  fired one fully redundant network request per widget. Concurrent callers
  now always share a single in-flight request, regardless of `force`.
- **Stale fallback timestamp**: `DEFAULT_DATA.updatedAt` was computed once
  at page-load time and never refreshed, so every fallback render for the
  rest of a long-lived tab's life reported the exact page-load moment
  instead of the actual time of the fallback. The field is now computed
  fresh at the moment it's actually needed.
- **Shallow-frozen configuration**: `config.ANIMATION_SPEED` and
  `config.THEME` were mutable despite the top-level object being frozen.
  Both are now deep-frozen.
- Corrected an outdated demo-page note that described editing
  `fetchVisitorStats` directly to connect real data — no longer accurate
  now that `config.DATA_URL` is the intended integration point.

### Changed

- `utils.js`'s single-attempt fetch logic was split into
  `requestStatsJsonOnce` (one HTTP attempt) and `requestStatsJson` (adds
  the new retry behavior on top).
- `animations.js`'s `attachRipple()` now returns a detach function
  (additive — existing callers ignoring the return value are unaffected).

## [1.0.0] — 2026-08-01

### Added

- Initial public release of the Diyar Visitor Widget.
- Six statistic cards: امروز (Today), دیروز (Yesterday), این هفته (This
  Week), این ماه (This Month), کل بازدید (Total Visits), and کاربران آنلاین
  (Online Users).
- Material Design 3 inspired visual language: rounded surfaces, soft
  elevation shadows, glassmorphism containers, and role-based color tokens.
- Full right-to-left (RTL) layout with native Persian typography via the
  Vazirmatn font family.
- Persian (Farsi) digit formatting with locale-correct thousands separators,
  exposed as a reusable `toPersianDigits()` utility.
- Light, Dark, and Auto (system-synced) theming with persisted user
  preference and an animated cross-fade transition between themes.
- Animated numeric counters using an ease-out-cubic roll-up, staggered card
  entrance animations (fade + slide + scale), Material ripple feedback on
  interactive controls, and a shimmering skeleton loading state.
- Fully isolated mock data layer (`fetchVisitorStats` in `utils.js`) designed
  so a future live API integration requires editing a single module.
- Background polling with automatic pause/resume based on tab visibility to
  avoid unnecessary work in hidden tabs.
- Manual refresh control with an accessible live-region announcement.
- Accessibility: semantic landmarks, ARIA roles and labels, visible focus
  rings, `prefers-reduced-motion` support, and `forced-colors` compatibility.
- Responsive layout tuned for mobile, foldables, tablets, desktops, and
  large/ultra-wide displays.
- Zero build step, zero runtime dependencies, and zero frameworks — pure
  ES2023 vanilla JavaScript, loaded as plain `<script>` tags.
- Complete project scaffolding: `README.md`, `CHANGELOG.md`, MIT `LICENSE`,
  `package.json`, `.gitignore`, and a standalone SVG icon set.

[1.3.0]: https://github.com/diyareghadamgah/diyar-widgets/releases/tag/visitor-v1.3.0
[1.2.0]: https://github.com/diyareghadamgah/diyar-widgets/releases/tag/visitor-v1.2.0
[1.1.0]: https://github.com/diyareghadamgah/diyar-widgets/releases/tag/visitor-v1.1.0
[1.0.0]: https://github.com/diyareghadamgah/diyar-widgets/releases/tag/visitor-v1.0.0
