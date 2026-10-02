/**
 * ==========================================================================
 * Diyar Visitor Widget — Single-Tag Embed Loader
 * ==========================================================================
 * Lets any page — a plain static HTML page, a GitHub Pages site, or a
 * Blogfa template — render the widget with exactly one script tag:
 *
 *   <script src="https://diyareghadamgah.github.io/diyar-widgets/visitor/embed.js"></script>
 *
 * This file is intentionally the ONLY thing a third-party page needs to
 * reference. It locates its own directory, injects the widget's
 * stylesheet and icon sprite, loads the five widget modules in the exact
 * order they depend on each other, creates a mount point exactly where
 * the `<script>` tag was placed, and mounts a widget instance there via
 * the public `window.DiyarVisitor.mount()` API that `visitor.js` already
 * exposes — no changes to any other file are required or made.
 *
 * It also fires a single, fire-and-forget visit-tracking beacon at a
 * Cloudflare Worker endpoint (see the TRACK_ENDPOINT constant and
 * `sendVisitBeacon()` below) so real visits can be counted — this is the
 * ONLY outbound request in the entire widget that goes to a domain other
 * than wherever these files are hosted, and its failure is always silent
 * and never affects whether the widget itself renders.
 *
 * OWN-URL DETECTION
 * --------------------------------------------------------------------------
 * `document.currentScript` reliably points at the `<script>` element
 * currently being executed for a plain, synchronous (non-`async`,
 * non-`module`) script — exactly the kind of tag documented above. As a
 * defensive fallback (older Safari edge cases, or this file having been
 * inserted by other means), the loader also scans every `<script>` tag
 * on the page for one whose `src` ends in `embed.js`, taking the *last*
 * match — since scripts execute top-to-bottom, the currently running
 * script is always the most recently encountered one in that scan.
 *
 * Once found, `new URL('./', scriptUrl)` resolves the *directory* the
 * script lives in — stripping the filename, any query string (useful
 * for cache-busting a specific embed version, e.g. `embed.js?v=1.0.0`),
 * and any hash — which becomes the base path every other asset
 * (`visitor.css`, `config.js`, `utils.js`, `theme.js`, `animations.js`,
 * `visitor.js`) is resolved against. Because this is computed from the
 * *actual* URL the browser used to fetch this file, it works correctly
 * both at the repository root and on a GitHub Pages project subpath
 * (e.g. `https://diyareghadamgah.github.io/diyar-widgets/visitor/`).
 *
 * DEPENDENCY LOADING ORDER
 * --------------------------------------------------------------------------
 * The five widget modules attach themselves to `window` as plain
 * classic scripts (no bundler, no ES module graph) and each one assumes
 * the previous ones have already run:
 *
 *   config.js → utils.js → theme.js → animations.js → visitor.js
 *
 * `loadScriptsSequentially()` therefore loads them one at a time,
 * waiting for each `<script>`'s `load` event before appending the next,
 * rather than firing all five in parallel and hoping the browser
 * happens to execute them in the right order.
 *
 * DUPLICATE PREVENTION
 * --------------------------------------------------------------------------
 * All loader state (whether the stylesheet/sprite/scripts have already
 * been requested, and the shared loading promise itself) lives on a
 * single object at `window.__diyarVisitorEmbedState`. Because every
 * `<script src="embed.js">` tag on the page re-executes this file's top
 * level code independently, that state object is created only once (via
 * `window.__diyarVisitorEmbedState = window.__diyarVisitorEmbedState ||
 * {...}`) and is then shared by every subsequent execution — so no
 * matter how many times this file is included on one page, the
 * stylesheet is injected once, the icon sprite is injected once, and
 * each of the five scripts is requested exactly once. Every embed tag
 * still gets its own mount container (see MULTIPLE WIDGETS below); they
 * simply all wait on the same shared dependency-loading promise before
 * mounting.
 *
 * MULTIPLE WIDGETS ON ONE PAGE
 * --------------------------------------------------------------------------
 * `visitor.js`'s own auto-init only ever queries the single ID selector
 * `#diyar-visitor-widget` (by design, unrelated to this file). To avoid
 * ever colliding with that — and to genuinely support more than one
 * widget per page today, without modifying `visitor.js` — this loader
 * never creates an element with that id. Instead, every embed tag gets
 * its own uniquely-identified container (`diyar-visitor-embed-N`) and is
 * mounted *explicitly* by this file via `window.DiyarVisitor.mount(el)`,
 * the public API `visitor.js` already exposes. This sidesteps the
 * single-ID-selector limitation entirely using only existing, public
 * surface area, and is exactly what a future multi-instance-aware
 * `visitor.js` (see the project roadmap) will keep working with.
 *
 * @module embed
 * @license MIT
 * ==========================================================================
 */

'use strict';

(function (global, document) {
  const EMBED_VERSION = '1.0.0';
  const SCRIPT_FILENAME = 'embed.js';

  /**
   * Absolute URL of the real-time visit-tracking Worker's `/hit` endpoint.
   * REPLACE THIS after deploying your own Worker (see worker/wrangler.toml)
   * — the placeholder below will simply fail silently (see
   * `sendVisitBeacon`'s error handling) until you do.
   *
   * This is intentionally NOT read from config.js: config.js describes the
   * widget's own display settings, while this endpoint is specifically an
   * embed-time concern — sending a tracking beacon is something only
   * `embed.js` does, so it owns this constant.
   */
  const TRACK_ENDPOINT = 'https://diyar-visitor-tracker.diyareghadamgah.workers.dev/hit';

  /**
   * Resolves the tracking endpoint actually used for this page. A page can
   * override the constant above WITHOUT editing this file by adding a
   * `data-worker` attribute to the embed tag, with the base URL of its own
   * Cloudflare Worker (no trailing `/hit` needed):
   *
   *   <script src=".../visitor/embed.js"
   *           data-worker="https://diyar-visitor-tracker.YOUR-NAME.workers.dev"></script>
   *
   * @param {HTMLScriptElement|null} scriptEl
   * @returns {string}
   */
  function resolveTrackEndpoint(scriptEl) {
    const attr = scriptEl && scriptEl.getAttribute('data-worker');
    if (attr && /^https?:\/\//i.test(attr.trim())) {
      return attr.trim().replace(/\/+$/, '').replace(/\/hit$/, '') + '/hit';
    }
    return TRACK_ENDPOINT;
  }

  /**
   * Modules loaded, in this exact order, before a widget can be mounted.
   * @type {string[]}
   */
  const DEPENDENCY_SCRIPTS = ['config.js', 'utils.js', 'theme.js', 'animations.js', 'visitor.js'];

  /**
   * Emits a namespaced console warning/error, but ONLY when debugging has
   * been explicitly opted into. This never depends on `config.js` having
   * loaded successfully (it may be the very thing that failed to load),
   * so it also recognizes an optional pre-set global flag a page can
   * define *before* the embed `<script>` tag:
   *
   *   <script>window.__DIYAR_VISITOR_DEBUG = true;</script>
   *   <script src="https://diyareghadamgah.github.io/diyar-widgets/visitor/embed.js"></script>
   *
   * @param {'warn'|'error'} level
   * @param {...*} args
   */
  function embedLog(level, ...args) {
    const debugEnabled =
      (global.DiyarVisitorConfig && global.DiyarVisitorConfig.DEBUG === true) ||
      global.__DIYAR_VISITOR_DEBUG === true;

    if (!debugEnabled) return;

    // eslint-disable-next-line no-console
    (console[level] || console.warn)('%c[Diyar Visitor Embed]', 'color:#4C6EF5;font-weight:600;', ...args);
  }

  /**
   * Locates the `<script>` element responsible for executing this file.
   *
   * @returns {HTMLScriptElement|null}
   */
  function getOwnScriptElement() {
    if (document.currentScript && document.currentScript.tagName === 'SCRIPT') {
      return document.currentScript;
    }

    // Fallback for environments where `document.currentScript` is
    // unavailable: the currently executing script is always the last
    // matching one seen so far, since script tags execute in document
    // order for plain (non-async, non-deferred) inclusion.
    const candidates = document.getElementsByTagName('script');
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const src = candidates[i].getAttribute('src') || '';
      if (src.indexOf(SCRIPT_FILENAME) !== -1) {
        return candidates[i];
      }
    }

    return null;
  }

  /**
   * Resolves the directory this script was loaded from as an absolute
   * URL, stripping the filename, query string, and hash — e.g.
   * `https://host/widgets/visitor/embed.js?v=2` becomes
   * `https://host/widgets/visitor/`.
   *
   * @param {HTMLScriptElement} scriptEl
   * @returns {string}
   */
  function resolveBaseUrl(scriptEl) {
    const rawSrc = scriptEl.getAttribute('src') || scriptEl.src || './' + SCRIPT_FILENAME;
    const absoluteScriptUrl = new URL(rawSrc, document.baseURI);
    return new URL('./', absoluteScriptUrl).href;
  }

  /**
   * Injects the widget's stylesheet exactly once per page, regardless of
   * how many embed tags are present. Resolved failures (e.g. a 404 on
   * `visitor.css`) never reject — a missing stylesheet degrades the
   * widget's appearance but must never block the rest of the loading
   * chain or throw into the host page.
   *
   * @param {string} baseUrl
   * @returns {Promise<void>}
   */
  function ensureStylesheetLoaded(baseUrl) {
    return new Promise((resolve) => {
      if (document.querySelector('link[data-diyar-visitor-css]')) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = baseUrl + 'visitor.css';
      link.setAttribute('data-diyar-visitor-css', EMBED_VERSION);
      link.onload = () => resolve();
      link.onerror = () => {
        embedLog('warn', 'Failed to load visitor.css from', link.href);
        resolve();
      };

      (document.head || document.documentElement).appendChild(link);
    });
  }

  /**
   * Injects the widget's SVG icon sprite exactly once per page. Every
   * shape below is a fixed, hand-authored literal with no interpolated
   * or externally-sourced data of any kind, so assigning it via
   * `innerHTML` carries no injection risk — the same pattern `visitor.js`
   * itself already uses for its own static, internally-defined markup.
   * The container element itself is still created with
   * `document.createElement`, per the loader's general rule of never
   * building structural/script-loading nodes via string concatenation.
   *
   * @returns {void}
   */
  function ensureIconSpriteInjected() {
    if (document.querySelector('svg[data-diyar-visitor-sprite]')) {
      return;
    }

    const sprite = document.createElement('div');
    sprite.setAttribute('aria-hidden', 'true');
    sprite.style.position = 'absolute';
    sprite.style.width = '0';
    sprite.style.height = '0';
    sprite.style.overflow = 'hidden';

    // Static, trusted, non-interpolated markup — identical artwork to
    // the sprite shipped inline in index.html and to the standalone
    // files under /icons, kept in sync manually across both locations.
    sprite.innerHTML =
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true" ' +
      'focusable="false" data-diyar-visitor-sprite="' + EMBED_VERSION + '">' +
      '<defs>' +
      '<symbol id="icon-eye" viewBox="0 0 24 24" fill="none">' +
      '<path d="M4 12C4 8.5 7.8 6 12 6C16.2 6 20 8.5 20 12C20 15.5 16.2 18 12 18C7.8 18 4 15.5 4 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="12" r="2.4" fill="currentColor"/>' +
      '</symbol>' +
      '<symbol id="icon-calendar" viewBox="0 0 24 24" fill="none">' +
      '<rect x="4" y="5" width="16" height="15" rx="3.5" stroke="currentColor" stroke-width="1.8"/>' +
      '<path d="M4 10H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M8.5 3.5V6.5M15.5 3.5V6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="12" cy="15" r="1.6" fill="currentColor"/>' +
      '</symbol>' +
      '<symbol id="icon-globe" viewBox="0 0 24 24" fill="none">' +
      '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/>' +
      '<path d="M4 12H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M12 4C15.5 7 15.5 17 12 20C8.5 17 8.5 7 12 4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<circle cx="16.5" cy="7.5" r="1.5" fill="currentColor"/>' +
      '</symbol>' +
      '<symbol id="icon-online" viewBox="0 0 24 24" fill="none">' +
      '<circle cx="11" cy="9" r="3.4" stroke="currentColor" stroke-width="1.8"/>' +
      '<path d="M5 19.5C5 15.5 7.8 13 11.3 13C12.5 13 13.6 13.3 14.6 13.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="17.5" cy="17.5" r="2.7" fill="currentColor"/>' +
      '</symbol>' +
      '<symbol id="icon-chart" viewBox="0 0 24 24" fill="none">' +
      '<path d="M4 16L9 11L13 14L20 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="20" cy="6" r="1.8" fill="currentColor"/>' +
      '</symbol>' +
      '<symbol id="icon-clock" viewBox="0 0 24 24" fill="none">' +
      '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>' +
      '<path d="M12 7V12L15.5 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</symbol>' +
      '<symbol id="icon-refresh" viewBox="0 0 24 24" fill="none">' +
      '<path d="M4 12C4 7.58172 7.58172 4 12 4C15.0637 4 17.7238 5.72916 19.0426 8.27002" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M20 12C20 16.4183 16.4183 20 12 20C8.93627 20 6.27618 18.2708 4.95736 15.73" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M19.5 4.5V8.5H15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M4.5 19.5V15.5H8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</symbol>' +
      '</defs>' +
      '</svg>';

    (document.body || document.documentElement).appendChild(sprite);
  }

  /**
   * Loads a single classic `<script>` and resolves once it has executed,
   * or rejects with a descriptive error if it fails to load.
   *
   * @param {string} src
   * @returns {Promise<void>}
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      // Explicitly synchronous-in-order: this is already the default for
      // a script inserted this way (dynamically created scripts default
      // to async=true only in some older engines), so this is set
      // defensively to guarantee in-order execution across all browsers
      // regardless of engine-specific defaults.
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

      (document.head || document.documentElement).appendChild(script);
    });
  }

  /**
   * Loads every dependency script one at a time, in strict order,
   * waiting for each to finish before requesting the next — required
   * because each module reads globals the previous one attached to
   * `window` at the moment its own top-level code executes.
   *
   * @param {string[]} urls - Absolute URLs, in the order they must load.
   * @returns {Promise<void>}
   */
  async function loadScriptsSequentially(urls) {
    for (const url of urls) {
      // eslint-disable-next-line no-await-in-loop
      await loadScript(url);
    }
  }

  /**
   * Once `config.js` has loaded, its `DATA_URL` default (`'./stats.json'`)
   * is relative to the CURRENT PAGE, not to wherever this widget is
   * actually hosted — correct for the bundled `index.html` demo, but
   * wrong the moment the widget is embedded on a third-party domain
   * (e.g. a Blogfa page), where a relative fetch would incorrectly try
   * to load `stats.json` from the Blogfa domain itself.
   *
   * This corrects that WITHOUT modifying `config.js`: `DiyarVisitorConfig`
   * is frozen (so its `DATA_URL` property can't be reassigned), but
   * `window.DiyarVisitorConfig` itself is an ordinary, reassignable
   * property. A new object is built — every existing property preserved
   * via spread, only `DATA_URL` overridden to an absolute URL resolved
   * against this embed script's own directory — and re-frozen, keeping
   * the same "config is always frozen" invariant the rest of the project
   * relies on. Absolute `DATA_URL` values (already an `http(s)://` or
   * protocol-relative URL, e.g. a future live API endpoint) are left
   * completely untouched.
   *
   * @param {string} baseUrl
   * @returns {void}
   */
  function resolveDataUrlForEmbeddedContext(baseUrl) {
    const config = global.DiyarVisitorConfig;
    if (!config || typeof config.DATA_URL !== 'string') return;

    const isAlreadyAbsolute = /^([a-z][a-z0-9+.-]*:)?\/\//i.test(config.DATA_URL);
    if (isAlreadyAbsolute) return;

    const absoluteDataUrl = new URL(config.DATA_URL, baseUrl).href;

    global.DiyarVisitorConfig = Object.freeze(
      Object.assign({}, config, { DATA_URL: absoluteDataUrl })
    );

    embedLog('warn', 'Resolved relative DATA_URL to absolute for embedded context:', absoluteDataUrl);
  }

  /**
   * Kicks off the one-time, page-wide dependency load: stylesheet, icon
   * sprite, then the five scripts in order. Safe to call multiple times
   * — callers always receive the SAME promise via the shared state
   * object, so the actual loading work only ever happens once.
   *
   * @param {string} baseUrl
   * @param {Object} state - The shared `window.__diyarVisitorEmbedState`.
   * @returns {Promise<void>}
   */
  function loadDependenciesOnce(baseUrl, state) {
    if (state.dependenciesPromise) {
      return state.dependenciesPromise;
    }

    state.dependenciesPromise = (async () => {
      await ensureStylesheetLoaded(baseUrl);
      ensureIconSpriteInjected();

      // config.js must finish loading — and DATA_URL must already be
      // corrected to an absolute URL — BEFORE visitor.js runs, because
      // visitor.js's own autoInit() fires its first fetchVisitorStats()
      // call synchronously as soon as it finishes loading. Previously,
      // all five scripts (including visitor.js) loaded first, and only
      // THEN was DATA_URL corrected — so on a third-party page the very
      // first fetch always resolved the still-relative './stats.json'
      // against the HOST page's own origin (e.g. a Blogfa domain),
      // 404'd there, and silently fell back to config.js's DEFAULT_DATA
      // placeholder numbers for that first render. Loading config.js by
      // itself first, correcting DATA_URL right away, and only then
      // loading the remaining four scripts in their required order
      // closes that race without changing anything else about how or
      // in what order the modules load.
      const [configScript, ...remainingScripts] = DEPENDENCY_SCRIPTS;
      await loadScript(baseUrl + configScript);
      resolveDataUrlForEmbeddedContext(baseUrl);

      const remainingUrls = remainingScripts.map((file) => baseUrl + file);
      await loadScriptsSequentially(remainingUrls);
    })().catch((error) => {
      embedLog('error', 'Failed to load one or more widget dependencies:', error);
      // Re-throw so callers awaiting this promise (the mount step) know
      // loading failed and can skip mounting rather than crashing — the
      // host page must never see an uncaught exception from this file.
      throw error;
    });

    return state.dependenciesPromise;
  }

  /**
   * Creates a uniquely-identified mount container and inserts it at the
   * position the embed `<script>` tag occupies in the page. If the
   * script happens to sit inside `<head>` (a common copy-paste mistake
   * on template-driven platforms), the container is appended to the end
   * of `<body>` instead once the DOM is ready, since an element placed
   * directly inside `<head>` would never render.
   *
   * @param {HTMLScriptElement} scriptEl
   * @param {number} instanceIndex
   * @returns {HTMLElement}
   */
  function createMountContainer(scriptEl, instanceIndex) {
    const container = document.createElement('div');
    // Deliberately never `#diyar-visitor-widget` — see the MULTIPLE
    // WIDGETS note in the module header for why that id is reserved for
    // visitor.js's own, separate auto-init path.
    container.id = `diyar-visitor-embed-${instanceIndex}`;
    container.className = 'diyar-visitor-embed-mount';

    const scriptIsInHead = !!(document.head && document.head.contains(scriptEl));

    if (!scriptIsInHead && scriptEl.parentNode) {
      scriptEl.parentNode.insertBefore(container, scriptEl.nextSibling);
      return container;
    }

    if (document.body) {
      document.body.appendChild(container);
      return container;
    }

    // Script executed before <body> exists (e.g. placed in <head>) and
    // <body> isn't available yet — defer the actual DOM insertion, but
    // still return the (not-yet-attached) element synchronously so the
    // rest of this file's flow doesn't need to branch on timing.
    document.addEventListener('DOMContentLoaded', () => {
      (document.body || document.documentElement).appendChild(container);
    });

    return container;
  }

  /**
   * Mounts every container queued so far that hasn't been mounted yet,
   * using the public `window.DiyarVisitor.mount()` API. Safe to call
   * more than once — already-mounted containers are skipped.
   *
   * @param {Object} state - The shared `window.__diyarVisitorEmbedState`.
   */
  function flushPendingMounts(state) {
    if (!global.DiyarVisitor || typeof global.DiyarVisitor.mount !== 'function') {
      embedLog('error', 'window.DiyarVisitor.mount is unavailable; visitor.js may have failed to load.');
      state.pendingContainers.forEach((container) => container.remove());
      state.pendingContainers = [];
      return;
    }

    const containersToMount = state.pendingContainers;
    state.pendingContainers = [];

    containersToMount.forEach((container) => {
      const instance = global.DiyarVisitor.mount(container);
      state.mountedInstances.push(instance);
    });
  }

  /**
   * Fires a single, fire-and-forget "visit" signal at the tracking Worker's
   * `/hit` endpoint. This is the ONLY thing in the whole widget that talks
   * to a domain other than wherever the widget's own files are hosted —
   * everything else (CSS, icon sprite, the five dependency scripts,
   * `stats.json` itself) still only ever touches the widget's own origin.
   *
   * Uses `navigator.sendBeacon` where available — the browser-native API
   * built exactly for this ("send this small thing, don't wait for a
   * response, and don't block page unload"). Falls back to a
   * `fetch(..., { keepalive: true })` call for the rare environment
   * without `sendBeacon`. Every failure mode (missing API, network error,
   * the placeholder URL never having been replaced) is swallowed
   * silently — a visitor must never see a console error, and a tracking
   * failure must never prevent the widget itself from rendering.
   *
   * @returns {void}
   */
  function sendVisitBeacon(endpoint) {
    try {
      if (!endpoint || endpoint.indexOf('REPLACE-WITH-YOUR-WORKER') !== -1) {
        // No real Worker configured yet — nothing to send to.
        return;
      }

      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        // An empty-but-valid payload is enough; the Worker reads visitor
        // identity from request headers (IP, User-Agent), not the body.
        navigator.sendBeacon(endpoint, new Blob([], { type: 'text/plain' }));
        return;
      }

      if (typeof fetch === 'function') {
        fetch(endpoint, { method: 'POST', keepalive: true, mode: 'cors' }).catch(() => {});
      }
    } catch (error) {
      embedLog('warn', 'Visit beacon failed (widget rendering is unaffected):', error);
    }
  }

  /**
   * Entry point executed every time this file runs (i.e. once per
   * `<script src="embed.js">` tag present on the page).
   */
  function init() {
    const scriptEl = getOwnScriptElement();
    sendVisitBeacon(resolveTrackEndpoint(scriptEl));

    if (!scriptEl) {
      embedLog('error', 'Could not locate the embed <script> element; aborting.');
      return;
    }

    const baseUrl = resolveBaseUrl(scriptEl);

    // Shared, page-wide state — created once, reused by every subsequent
    // execution of this file on the same page.
    global.__diyarVisitorEmbedState = global.__diyarVisitorEmbedState || {
      dependenciesPromise: null,
      instanceCount: 0,
      pendingContainers: [],
      mountedInstances: [],
    };
    const state = global.__diyarVisitorEmbedState;

    state.instanceCount += 1;
    const container = createMountContainer(scriptEl, state.instanceCount);
    state.pendingContainers.push(container);

    loadDependenciesOnce(baseUrl, state)
      .then(() => flushPendingMounts(state))
      .catch(() => {
        // Dependency loading already logged its own error above; ensure
        // any containers queued by THIS execution don't linger empty.
        state.pendingContainers = state.pendingContainers.filter((el) => el !== container);
        container.remove();
      });
  }

  /** Minimal public namespace, primarily useful for debugging in devtools. */
  global.DiyarVisitorEmbed = global.DiyarVisitorEmbed || Object.freeze({ version: EMBED_VERSION });

  init();
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : null);
