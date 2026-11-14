/**
 * Naghme static web app served from a Cloudflare Worker workers.dev hostname.
 * The IPTV proxy remains on the existing diyar-widgets Worker; this Worker
 * only serves the files in ../naghme.
 */
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === "/health") {
      return new Response("naghme-worker-ok\n", {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
