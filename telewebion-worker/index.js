/**
 * Telewebion manifest rewriter, for players that cannot handle the original.
 *
 * WHY THIS EXISTS
 * Telewebion publishes IRIB's channels, and it is the only source for them reachable from
 * outside Iran. Its media playlists are valid HLS, and one number in them is more than a
 * television can hold:
 *
 *   EXT-X-MEDIA-SEQUENCE is sixteen digits, for example 1786395804195022, because the
 *   packager derives it from a microsecond timestamp. Samsung's AVPlay keeps that field in
 *   a SIGNED 32 bit integer, so anything above 2,147,483,647 overflows and its window
 *   arithmetic collapses. Telewebion's value is about 831,000 times the limit.
 *
 * Measured on a Samsung QE55S90D running Tizen 9.0, one property changed at a time, by
 * serving AVPlay manifests built from this same stream:
 *
 *   sequence 2,147,483,000 (just under 2^31)  ->  plays, window reported correctly
 *   sequence 2,147,484,000 (just over 2^31)   ->  reports the stream as 2000ms, one frame
 *   sequence 4,294,966,000 (just under 2^32)  ->  same failure, so it is signed, not unsigned
 *
 * THE WINDOW IS NOT THE PROBLEM, AND THAT MATTERS
 * The same test says the size of the playlist is fine: 3600 segments and 813KB parsed
 * correctly and played, as did 600 and 120. So trimming is not what fixes anything, and a
 * shorter window on its own would not have helped. Trimming stays because it is what keeps
 * this Worker's CPU and egress small, which is a cost decision rather than a fix. Anyone
 * tempted to raise SEQUENCE_MODULUS to fit "32 bits" should read the table above first:
 * four billion is not a safe number here, two billion is.
 *
 * COST CONTROL, THE POINT OF THE DESIGN
 * AVPlay receives absolute Telewebion segment URLs, so its video never touches this Worker.
 * Browser JavaScript requests need segment proxying because Telewebion allows only its own
 * website origin. That browser path carries the video and consumes far more Worker requests.
 * Cloudflare bills a Worker per incoming request. fetch() subrequests and the Cache API are
 * free and do not count.
 *
 * How often a player comes back was assumed here and is now measured. AVPlay reloads at
 * about HALF the declared TARGETDURATION, not once per target, and it starts playback about
 * three targets behind the live edge. Counted over 64 seconds of real playback:
 *
 *   target 12s -> reload every 6.4s -> 562 requests/viewer-hour -> 178 viewer-hours/day
 *   target 20s -> reload every 9.1s -> 394 requests/viewer-hour -> 253 viewer-hours/day
 *   target 30s -> reload every 12.8s -> 281 requests/viewer-hour -> 355 viewer-hours/day
 *
 * The right hand column is the free plan's 100,000 requests a day. The old comment here
 * claimed 300 requests per viewer-hour at a 12 second target, which was half the truth and
 * therefore twice the capacity.
 *
 * Two things that would have decoupled the request rate from the latency do not work, and
 * both were tried on the set rather than reasoned about:
 *
 *   EXT-X-START:TIME-OFFSET   ignored. Playback began 33.6s behind the edge with and
 *                             without it, which is three times the target either way.
 *   Cache-Control: max-age    ignored for playlist reloads. Ten requests in 64 seconds
 *                             with max-age=10, and ten with no-cache.
 *
 * So the only lever is TARGETDURATION, and it buys fewer requests with more delay behind
 * live. 20 seconds is the default below: a third fewer requests than before, and a viewer
 * about a minute behind the broadcast, which nobody notices on a channel and everybody
 * notices during a football match.
 *
 * PLAYERS THAT CAN READ THE ORIGINAL ARE SENT AWAY
 * VLC, ffmpeg, mpv and Kodi read Telewebion's original manifest perfectly well, so they are
 * redirected to it and stop costing anything at all. Native browser media requests are also
 * redirected (identified by their initial Range request). Browser JavaScript requests receive
 * a rewritten manifest whose segment URLs use the restricted proxy route. AVPlay identifies
 * itself as "samsung-agent/1.1", so it receives the rewritten manifest with direct segment URLs.
 *
 * DEPLOY
 *   npx wrangler deploy
 *
 * USE
 *   https://<your-worker>.workers.dev/tv1/1080p
 *   https://<your-worker>.workers.dev/irinn/720p
 */

import { connect } from "cloudflare:sockets";

const ORIGIN = "https://ncdn.telewebion.ir";
const TARGET_DURATION = 20;   // what we advertise, halved is how often a player returns
const WINDOW_SECONDS = 150;   // three targets of start latency, plus 90s of margin
const EDGE_CACHE_SECONDS = 8; // collapses concurrent viewers into one origin fetch
/**
 * Nine digits, and the ceiling is 2^31 rather than 2^32: see the table at the top. Nine
 * digits also means the number a player sees never grows past this, whatever Telewebion's
 * does, and it advances by one per segment exactly as the original does.
 */
const SEQUENCE_MODULUS = 1_000_000_000;

const SLUG = /^[a-z0-9_-]{1,40}$/i;
const RENDITION = /^(\d{3,4}p)$/;
const TELEWEBION_HOST = /(^|\.)telewebion\.(ir|net|com)$/i;
const RADIO_JAVAN_HOST = "radio.sr-api.ir";
const IRANSEDA_HOST = /(^|\.)cdn[0-9]\.iranseda\.ir$/i;
const IRAN_RADIO_SOURCES = {
  radioiran: "http://s1.cdn1.iranseda.ir:1935/liveedge/radio-iran/playlist.m3u8",
};

/**
 * IranSeda serves its public HLS over plain HTTP on TCP/1935. Workers fetch()
 * cannot reliably reach that non-standard HTTP port, so use the TCP socket API
 * and speak a small, bounded HTTP/1.0 request. The body is buffered per HLS
 * object (playlists and short audio segments), with a hard size limit.
 */
function joinBytes(parts, total) {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function findHeaderEnd(bytes) {
  for (let i = 0; i <= bytes.length - 4; i++) {
    if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) return i;
  }
  return -1;
}

function decodeChunkedBody(bytes) {
  const parts = [];
  let total = 0;
  let offset = 0;
  while (offset < bytes.length) {
    let end = -1;
    for (let i = offset; i < bytes.length - 1; i++) {
      if (bytes[i] === 13 && bytes[i + 1] === 10) { end = i; break; }
    }
    if (end < 0) return bytes;
    const line = new TextDecoder().decode(bytes.subarray(offset, end));
    const size = Number.parseInt(line.split(";")[0].trim(), 16);
    if (!Number.isFinite(size) || size < 0) return bytes;
    offset = end + 2;
    if (size === 0) break;
    if (offset + size > bytes.length) return bytes;
    parts.push(bytes.subarray(offset, offset + size));
    total += size;
    offset += size;
    if (bytes[offset] === 13 && bytes[offset + 1] === 10) offset += 2;
  }
  return joinBytes(parts, total);
}

async function iranSedaTcpFetch(target, extraHeaders = {}, maxBytes = 20_000_000, redirects = 0) {
  if (target.protocol !== "http:" || !IRANSEDA_HOST.test(target.hostname)) {
    throw new Error("IranSeda TCP proxy only accepts approved HTTP hosts");
  }
  const port = Number(target.port || 80);
  const socket = connect({ hostname: target.hostname, port });
  try {
    await socket.opened;
    const writer = socket.writable.getWriter();
    const headers = {
      "User-Agent": "VLC/3.0.20 LibVLC/3.0.20",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Connection": "close",
      ...extraHeaders,
    };
    const requestLines = [
      `GET ${target.pathname}${target.search} HTTP/1.0`,
      `Host: ${target.host}`,
      ...Object.entries(headers).map(([key, value]) => `${key}: ${value}`),
      "",
      "",
    ];
    await writer.write(new TextEncoder().encode(requestLines.join("\r\n")));
    await writer.close();

    const reader = socket.readable.getReader();
    const received = [];
    let receivedBytes = 0;
    let buffer = new Uint8Array(0);
    let headerEnd = -1;
    while (headerEnd < 0) {
      const part = await reader.read();
      if (part.done) throw new Error("IranSeda closed before sending HTTP headers");
      receivedBytes += part.value.byteLength;
      if (receivedBytes > 32_768) throw new Error("IranSeda HTTP headers are too large");
      const merged = new Uint8Array(buffer.byteLength + part.value.byteLength);
      merged.set(buffer);
      merged.set(part.value, buffer.byteLength);
      buffer = merged;
      headerEnd = findHeaderEnd(buffer);
    }

    const headerText = new TextDecoder("latin1").decode(buffer.subarray(0, headerEnd));
    const headerLines = headerText.split("\r\n");
    const statusMatch = headerLines[0].match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/i);
    if (!statusMatch) throw new Error("Invalid HTTP status from IranSeda");
    const status = Number(statusMatch[1]);
    const responseHeaders = new Headers();
    for (const line of headerLines.slice(1)) {
      const colon = line.indexOf(":");
      if (colon > 0) responseHeaders.append(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
    }
    const bodyStart = headerEnd + 4;
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = responseHeaders.get("location");
      if (!location || redirects >= 3) throw new Error("IranSeda redirect could not be followed");
      const next = new URL(location, target);
      await socket.close();
      if (next.protocol !== "http:" || !IRANSEDA_HOST.test(next.hostname)) {
        throw new Error("IranSeda redirected outside the approved host list");
      }
      return iranSedaTcpFetch(next, extraHeaders, maxBytes, redirects + 1);
    }

    const bodyParts = [];
    let bodySize = 0;
    if (buffer.byteLength > bodyStart) {
      const firstBody = buffer.subarray(bodyStart);
      bodyParts.push(firstBody);
      bodySize += firstBody.byteLength;
    }
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bodySize += part.value.byteLength;
      if (bodySize > maxBytes) throw new Error("IranSeda response exceeded the size limit");
      bodyParts.push(part.value);
    }
    let body = joinBytes(bodyParts, bodySize);
    const transferEncoding = responseHeaders.get("transfer-encoding") || "";
    if (/chunked/i.test(transferEncoding)) {
      body = decodeChunkedBody(body);
      responseHeaders.delete("transfer-encoding");
      responseHeaders.delete("content-length");
    }
    responseHeaders.set("X-Upstream-Final-Url", target.href);
    await socket.close();
    return new Response(body, { status, headers: responseHeaders });
  } catch (error) {
    try { await socket.close(); } catch {}
    throw error;
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range",
  "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range",
};

export function isNativeMediaRequest(request) {
  return request.headers.get("range") === "bytes=0-"
    && !/samsung-agent/i.test(request.headers.get("user-agent") ?? "");
}

/**
 * Desktop players that read the original without help, and are therefore not this Worker's
 * problem. Browsers use the range based branch above when native media playback is selected.
 */
const READS_THE_ORIGINAL = /vlc|libvlc|lavf|ffmpeg|mpv|kodi|gstreamer|mplayer/i;

function manifestError(stage, details = {}) {
  const lines = [`stage=${stage}`];
  for (const [key, value] of Object.entries(details)) {
    if (value !== undefined && value !== null && value !== "") {
      lines.push(`${key}=${String(value).replace(/[\r\n]+/g, " ").slice(0, 500)}`);
    }
  }
  return new Response(lines.join("\n") + "\n", {
    status: 502,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

const EDEM_HOST = "068382c8.kazaktelekom.com";

function edemProxyHref(target, origin) {
  return origin + "/edem?url=" + encodeURIComponent(target.href);
}

async function proxyEdemHls(request, url) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed\n", { status: 405, headers: CORS_HEADERS });
  }
  let target;
  try { target = new URL(url.searchParams.get("url")); }
  catch { return new Response("invalid source URL\n", { status: 400, headers: CORS_HEADERS }); }
  const valid = value => ["http:", "https:"].includes(value.protocol)
    && value.hostname.toLowerCase() === EDEM_HOST
    && value.pathname.startsWith("/iptv/")
    && !value.username && !value.password;
  if (!valid(target)) return new Response("source not allowed\n", { status: 403, headers: CORS_HEADERS });

  let upstream;
  try {
    upstream = await fetch(target.href, {
      method: request.method,
      headers: { "User-Agent": "VLC/3.0.20 LibVLC/3.0.20", "Accept": "*/*" },
      redirect: "follow",
    });
  } catch (error) {
    console.error("EDEM HLS fetch failed", error);
    return new Response("source unreachable\n", { status: 502, headers: CORS_HEADERS });
  }
  let finalUrl;
  try { finalUrl = new URL(upstream.url || target.href); }
  catch { return new Response("invalid upstream URL\n", { status: 502, headers: CORS_HEADERS }); }
  if (!valid(finalUrl)) return new Response("upstream redirect not allowed\n", { status: 502, headers: CORS_HEADERS });

  const headers = new Headers(CORS_HEADERS);
  headers.set("Cache-Control", "no-store");
  const contentType = upstream.headers.get("content-type") || "";
  headers.set("Content-Type", contentType || (/\.m3u8(?:$|[?#])/i.test(finalUrl.href)
    ? "application/vnd.apple.mpegurl" : "application/octet-stream"));
  if (request.method === "HEAD") return new Response(null, { status: upstream.status, headers });
  if (!upstream.ok) return new Response("upstream HTTP " + upstream.status + "\n", { status: upstream.status, headers });

  const isPlaylist = /mpegurl|vnd\.apple\.mpegurl/i.test(contentType) || /\.m3u8(?:$|[?#])/i.test(finalUrl.href);
  if (!isPlaylist) return new Response(upstream.body, { status: upstream.status, headers });

  const body = await upstream.text();
  if (!body.trimStart().startsWith("#EXTM3U")) {
    return new Response(body, { status: upstream.status, headers });
  }
  const rewriteRef = raw => {
    try {
      const resolved = new URL(raw, finalUrl);
      if (resolved.hostname.toLowerCase() === EDEM_HOST && resolved.pathname.startsWith("/iptv/")) {
        return edemProxyHref(resolved, url.origin);
      }
      return resolved.protocol === "https:" ? resolved.href : raw;
    } catch { return raw; }
  };
  const rewritten = body.split(/\r?\n/).map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g, (_, ref) => 'URI="' + rewriteRef(ref) + '"');
    }
    return rewriteRef(trimmed);
  }).join("\n");
  headers.set("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
  return new Response(rewritten, { status: upstream.status, headers });
}

async function proxySegment(request, url) {
  let target;
  try {
    target = new URL(url.searchParams.get("url"));
  } catch {
    return new Response("invalid segment\n", { status: 400 });
  }
  // Telewebion may append query parameters to segment URLs and may use
  // fragmented MP4/audio assets as well as MPEG-TS. Validate the pathname
  // (not the full URL) and keep the host allow-list as the SSRF boundary.
  const assetPath = target.pathname.toLowerCase();
  const allowedAsset = /\.(?:ts|m4s|mp4|m4a|aac|mp3|vtt|key)$/i.test(assetPath);
  const allowedHost = TELEWEBION_HOST.test(target.hostname)
    || target.hostname.toLowerCase() === RADIO_JAVAN_HOST
    || IRANSEDA_HOST.test(target.hostname);
  if (!["http:", "https:"].includes(target.protocol) || !allowedHost || !allowedAsset) {
    return new Response("invalid segment\n", { status: 400 });
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed\n", { status: 405 });
  }
  const range = request.headers.get("range");
  let upstream;
  try {
    const segmentHeaders = {
      "User-Agent": "VLC/3.0.20 LibVLC/3.0.20",
      "Accept": "*/*",
      ...(IRANSEDA_HOST.test(target.hostname) ? { Referer: "https://radio.iranseda.ir/" } : {}),
      ...(range ? { Range: range } : {}),
    };
    upstream = IRANSEDA_HOST.test(target.hostname)
      ? await iranSedaTcpFetch(target, segmentHeaders)
      : await fetch(target, { headers: segmentHeaders, redirect: "follow" });
  } catch (error) {
    console.error("Telewebion segment fetch failed", error);
    return new Response("segment unreachable\n", { status: 502 });
  }
  const headers = new Headers(CORS_HEADERS);
  for (const name of ["content-type", "content-length", "accept-ranges", "content-range", "cache-control"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Same-origin CORS proxy for the public IPTV-org playlists used by Naghme Web.
    const countryPlaylist = url.pathname.match(/^\/iptv\/countries\/([a-z]{2})\.m3u$/i);
    const categoryPlaylist = url.pathname.match(/^\/iptv\/categories\/(sports|movies|news)\.m3u$/i);
    const playlistSource = url.pathname === "/iptv/index.m3u"
      ? "https://iptv-org.github.io/iptv/index.m3u"
      : countryPlaylist
        ? "https://iptv-org.github.io/iptv/countries/" + countryPlaylist[1].toLowerCase() + ".m3u"
        : categoryPlaylist
          ? "https://iptv-org.github.io/iptv/categories/" + categoryPlaylist[1].toLowerCase() + ".m3u"
          : null;
    if (url.pathname === "/iptv/custom") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("method not allowed\\n", { status: 405, headers: CORS_HEADERS });
      const isAllowedTarget = target => {
        const host = target.hostname.toLowerCase().replace(/^\[|\]$/g, "");
        const isIp = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":");
        return ["http:", "https:"].includes(target.protocol)
          && !target.username && !target.password && !isIp
          && !/\.(?:localhost|local|internal|test|invalid)$/.test(host)
          && !["localhost", "localhost.localdomain", "metadata.google.internal"].includes(host)
          && (!target.port || ["80", "443", "8000", "8080", "8443"].includes(target.port));
      };
      let target;
      try { target = new URL(url.searchParams.get("url") || ""); }
      catch { return new Response("invalid playlist URL\\n", { status: 400, headers: CORS_HEADERS }); }
      if (!isAllowedTarget(target)) return new Response("playlist host or port not allowed\\n", { status: 403, headers: CORS_HEADERS });
      try {
        let upstream = null;
        for (let redirects = 0; redirects <= 4; redirects++) {
          upstream = await fetch(target.href, {
            headers: { "User-Agent": "Naghme-IPTV/1.0", "Accept": "audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain,*/*" },
            redirect: "manual",
          });
          if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
          const location = upstream.headers.get("location");
          if (!location || redirects === 4) throw new Error("too many or invalid playlist redirects");
          target = new URL(location, target);
          if (!isAllowedTarget(target)) throw new Error("playlist redirect host or port not allowed");
        }
        if (!upstream || !upstream.ok) {
          const status = upstream ? upstream.status : 502;
          return new Response("playlist upstream HTTP " + status + "\\n", {
            status: status >= 400 && status < 600 ? status : 502,
            headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        const declaredSize = Number(upstream.headers.get("content-length") || 0);
        if (declaredSize > 25_000_000) return new Response("playlist is too large\\n", { status: 413, headers: CORS_HEADERS });
        const body = await upstream.text();
        if (body.length > 25_000_000) return new Response("playlist is too large\\n", { status: 413, headers: CORS_HEADERS });
        if (!body.replace(/^\uFEFF/, "").trimStart().startsWith("#EXTM3U")) {
          return new Response("upstream did not return a valid M3U playlist\\n", {
            status: 502,
            headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        return new Response(request.method === "HEAD" ? null : body, {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=120" },
        });
      } catch (error) {
        console.error("Custom IPTV playlist proxy failed", target.hostname, error);
        return new Response("playlist upstream unavailable: " + String(error && error.message || error).slice(0, 180) + "\\n", {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
    }
    if (url.pathname === "/iptv/external") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("method not allowed\\n", { status: 405, headers: CORS_HEADERS });
      let target;
      try {
        target = new URL(url.searchParams.get("url") || "");
      } catch {
        return new Response("invalid playlist URL\\n", { status: 400, headers: CORS_HEADERS });
      }
      const allowedHosts = new Set(["m3url.ru", "www.m3url.ru", "iptvbest.ru", "178.124.210.172"]);
      if (!allowedHosts.has(target.hostname) || !["http:", "https:"].includes(target.protocol) || target.username || target.password ||
          (target.hostname === "178.124.210.172" && target.port !== "8000")) {
        return new Response("playlist host not allowed\\n", { status: 403, headers: CORS_HEADERS });
      }
      try {
        const upstream = await fetch(target.href, {
          headers: { "User-Agent": "Naghme-IPTV/1.0", "Accept": "audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain,*/*" },
          redirect: "follow",
          cf: { cacheTtl: 180, cacheEverything: true },
        });
        const headers = new Headers(CORS_HEADERS);
        headers.set("Content-Type", upstream.headers.get("content-type") || "audio/x-mpegurl; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=180");
        if (!upstream.ok) return new Response("playlist upstream HTTP " + upstream.status + "\\n", { status: upstream.status, headers });
        return new Response(request.method === "HEAD" ? null : upstream.body, { status: 200, headers });
      } catch (error) {
        console.error("External IPTV playlist proxy failed", target.hostname, error);
        return new Response("playlist upstream unavailable\\n", { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
      }
    }
    if (playlistSource) {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("method not allowed\\n", { status: 405, headers: CORS_HEADERS });
      try {
        const upstream = await fetch(playlistSource, {
          headers: { "User-Agent": "Naghme-IPTV/1.0", "Accept": "text/plain,*/*" },
          cf: { cacheTtl: 300, cacheEverything: true },
        });
        const headers = new Headers(CORS_HEADERS);
        headers.set("Content-Type", "text/plain; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=300");
        if (!upstream.ok) return new Response("playlist upstream HTTP " + upstream.status + "\\n", { status: 502, headers });
        if (request.method === "HEAD") return new Response(null, { status: 200, headers });
        const body = await upstream.text();
        if (!body.replace(/^\uFEFF/, "").trimStart().startsWith("#EXTM3U")) {
          return new Response("playlist upstream returned invalid M3U content\\n", {
            status: 502,
            headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        return new Response(body, { status: 200, headers });
      } catch (error) {
        console.error("IPTV playlist proxy failed", error);
        return new Response("playlist upstream unavailable\\n", { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
      }
    }
    if (url.pathname === "/edem") return proxyEdemHls(request, url);
    if (url.pathname === "/segment") return proxySegment(request, url);
    const [, slug, rendition] = url.pathname.split("/");

    if (!slug || !SLUG.test(slug)) {
      return new Response("usage: /<channel>/<rendition>, e.g. /tv1/1080p\n", { status: 400 });
    }
    const quality = RENDITION.test(rendition || "") ? rendition : "1080p";
    const isRadio = slug.startsWith("radio");
    const isRadioJavan = slug === "radiojavan";
    // Radio Javan uses its dedicated HTTPS HLS relay; other IRIB radio stations
    // use Telewebion's HTTPS radio manifests (never the legacy :1935 endpoints).
    const source = IRAN_RADIO_SOURCES[slug] || (isRadioJavan
      ? "https://radio.sr-api.ir/hls/stream.m3u8"
      : `${isRadio ? "https://cdnw.telewebion.com" : ORIGIN}/${slug}/live/playlist.m3u8`);

    /*
     * A player that can read the original is sent to it, and stops costing anything.
     *
     * Temporary rather than permanent, so nothing caches the decision: the day Telewebion
     * changes its addresses, this Worker is the only thing that has to know. If a player
     * follows the redirect but keeps asking here on every reload, the cost is this branch
     * rather than a fetch and a parse, so the worst case is still cheaper than before.
     */
    const userAgent = request.headers.get("user-agent") ?? "";
    if (READS_THE_ORIGINAL.test(userAgent) || isNativeMediaRequest(request)) {
      return Response.redirect(source, 302);
    }

    const proxyOrigin = /mozilla/i.test(userAgent) ? url.origin : null;
    const cache = caches.default;
    const cacheKey = new Request(
      `${url.origin}/${slug}/${quality}${proxyOrigin ? "?cors=1" : ""}`,
      { method: "GET" },
    );
    const cached = isRadio ? null : await cache.match(cacheKey);
    if (cached) return cached;

    let upstream;
    let body;
    let stage = "origin_manifest_fetch";
    let requestedUrl = source;
    try {
      upstream = IRANSEDA_HOST.test(new URL(source).hostname)
        ? await iranSedaTcpFetch(new URL(source), { Referer: "https://radio.iranseda.ir/" }, 2_000_000)
        : await fetch(source, {
          headers: { "User-Agent": "VLC/3.0.20 LibVLC/3.0.20", Accept: "*/*" },
          cf: { cacheTtl: isRadio ? 1 : 4, cacheEverything: true },
        });
      if (!upstream.ok) {
        return manifestError("origin_manifest_http", {
          status: upstream.status,
          url: source,
          content_type: upstream.headers.get("content-type"),
        });
      }
      body = (await upstream.text()).replace(/^\uFEFF/, "").trim();

      // Resolve a master playlist to its media playlist before rewriting segments.
      if (body.includes("#EXT-X-STREAM-INF")) {
        const variants = [];
        const lines = body.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          if (!lines[i].startsWith("#EXT-X-STREAM-INF:")) continue;
          const resolution = lines[i].match(/RESOLUTION=\d+x(\d+)/i);
          const height = resolution ? Number(resolution[1]) : 0;
          for (let j = i + 1; j < lines.length; j++) {
            const candidate = lines[j].trim();
            if (candidate && !candidate.startsWith("#")) {
              variants.push({ height, url: new URL(candidate, upstream.headers.get("X-Upstream-Final-Url") || upstream.url || requestedUrl).href });
              break;
            }
          }
        }
        if (variants.length) {
          const requestedHeight = Number(quality.slice(0, -1));
          variants.sort((x, y) => x.height - y.height);
          const selected = variants.filter(v => !v.height || v.height <= requestedHeight).at(-1) || variants[0];
          stage = "rendition_fetch";
          requestedUrl = selected.url;
          upstream = IRANSEDA_HOST.test(new URL(selected.url).hostname)
            ? await iranSedaTcpFetch(new URL(selected.url), { Referer: "https://radio.iranseda.ir/" }, 2_000_000)
            : await fetch(selected.url, {
              headers: { "User-Agent": "VLC/3.0.20 LibVLC/3.0.20", Accept: "*/*" },
              cf: { cacheTtl: 4, cacheEverything: true },
            });
          if (!upstream.ok) {
            return manifestError("rendition_http", {
              status: upstream.status,
              url: selected.url,
              content_type: upstream.headers.get("content-type"),
            });
          }
          body = (await upstream.text()).replace(/^\uFEFF/, "").trim();
        }
      }
    } catch (error) {
      console.error("Telewebion manifest fetch failed", { stage, url: requestedUrl, error });
      return manifestError(stage, {
        url: requestedUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const playlist = rewrite(body, upstream.headers.get("X-Upstream-Final-Url") || upstream.url || requestedUrl, proxyOrigin, isRadio);
    if (!playlist) {
      const preview = body.slice(0, 240).replace(/[\r\n\t]+/g, " ");
      return manifestError("unexpected_playlist_format", {
        content_type: upstream.headers.get("content-type") || "unknown",
        url: upstream.url,
        preview,
      });
    }

    const response = new Response(playlist, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": `public, max-age=${isRadio ? 1 : EDGE_CACHE_SECONDS}`,
        "Access-Control-Allow-Origin": "*",
      },
    });
    if (!isRadio) ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};

export function rewrite(body, finalUrl, proxyOrigin = null, preserveTargetDuration = false) {
  /*
   * Upstream lists two hours of segments and we publish two and a half minutes of them, so
   * the hot path must stay cheap: count in a single pass, keep only the tail in a ring
   * buffer, and resolve URLs for that tail alone. Building a URL object per line would cost
   * roughly 8ms across 1800 entries, which is where the free plan's 10ms CPU ceiling is.
   *
   * That headroom is worth watching rather than trusting, because the upstream window has
   * already doubled once: it was 1800 segments and 318KB when this was written and it is
   * 3600 and 651KB today, so the single pass walks twice the lines it used to.
   */
  const base = new URL(finalUrl);
  const baseDir = base.href.slice(0, base.href.lastIndexOf("/") + 1);
  const lines = body.split("\n");

  const keepMax = Math.max(3, Math.ceil(WINDOW_SECONDS / 2)) + 4;
  const infs = new Array(keepMax);
  const uris = new Array(keepMax);
  let count = 0, slot = 0, sequence = null, pendingInf = null, longest = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.charCodeAt(0) === 35) {              // '#'
      if (line.startsWith("#EXTINF")) {
        pendingInf = line;
        const seconds = parseFloat(line.slice(8));
        if (seconds > longest) longest = seconds;
      } else if (sequence === null && line.startsWith("#EXT-X-MEDIA-SEQUENCE:")) {
        sequence = Number(line.slice(22));
      }
    } else if (pendingInf !== null) {
      infs[slot] = pendingInf;                    // ring buffer, only the tail survives
      uris[slot] = line;
      slot = (slot + 1) % keepMax;
      count++;
      pendingInf = null;
    }
  }
  if (!count || sequence === null) return null;

  const segment = longest || 2;
  const keep = Math.min(count, Math.max(3, Math.ceil(WINDOW_SECONDS / segment)));
  const target = preserveTargetDuration ? Math.max(1, Math.ceil(longest)) : Math.max(TARGET_DURATION, Math.ceil(longest));

  const out = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    `#EXT-X-TARGETDURATION:${target}`,
    `#EXT-X-MEDIA-SEQUENCE:${(sequence + count - keep) % SEQUENCE_MODULUS}`,
  ];
  for (let i = keep; i > 0; i--) {
    const at = (slot - i + keepMax * 2) % keepMax;
    const uri = uris[at];
    const absolute = uri.charCodeAt(0) === 104 && uri.startsWith("http") ? uri
      : uri.charCodeAt(0) === 47 ? base.origin + uri
        : baseDir + uri;
    out.push(infs[at], proxyOrigin
      ? `${proxyOrigin}/segment?url=${encodeURIComponent(absolute)}`
      : absolute);
  }
  return out.join("\n") + "\n";
}
