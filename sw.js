// Service worker: network first, cache as fallback.
// Online the page always gets the latest files (revalidated, usually a cheap 304); offline it uses the last copy it saw.
// Every file below is stored on install so the app works offline right after the first visit.
const CACHE = "evm-v2";
const ASSETS = [
  "./", "./index.html", "./style.css", "./manifest.webmanifest",
  "./js/config.js", "./js/text.js", "./js/catalog.js", "./js/search.js", "./js/geometry.js", "./js/templates.js", "./js/urlstate.js", "./js/speech.js", "./js/app.js",
  "./data/part1.js", "./data/part2.js", "./data/part3.js", "./data/part4.js", "./data/part5.js",
  "./data/part6.js", "./data/part7.js", "./data/part8.js", "./data/part9.js", "./data/part10.js",
  "./data/art1.js", "./data/art2.js", "./data/art3.js", "./data/art4.js", "./data/art5.js",
  "./data/art6.js", "./data/art7.js", "./data/art8.js", "./data/art9.js", "./data/art10.js",
  "./fonts/patrick-hand-latin.woff2", "./fonts/patrick-hand-latin-ext.woff2", "./fonts/patrick-hand-vietnamese.woff2",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png",
];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("evm-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req, { cache: "no-cache" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS)),
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // "index.html?lvl=B1&q=get" and the bare folder URL must also work offline, so the query string is ignored
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === "navigate") return (await cache.match("./index.html")) || Response.error();
    return Response.error();
  }
}
