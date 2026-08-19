/* Service worker — appka funguje i bez připojení.
   Verzi zvyš při každé změně souborů, ať si prohlížeč stáhne novou. */
const CACHE = "coc-village-planner-v2";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/app.css",
  "./js/gamedata.js",
  "./js/caps.js",
  "./js/parse.js",
  "./js/analyze.js",
  "./js/strategies.js",
  "./js/planner.js",
  "./js/samples.js",
  "./js/ui.js",
  "./js/main.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Nejdřív síť, při výpadku cache — po nasazení nové verze tak uživatel
   nezůstane viset na staré, ale offline mu appka pořád naběhne. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // Cizí originy (písma z Google Fonts) neřešíme – ať si je vyřídí prohlížeč sám.
  if (new URL(e.request.url).origin !== self.location.origin) return;

  const isNavigation = e.request.mode === "navigate";

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => {
        if (r) return r;
        // Náhradu stránkou dává smysl jen u navigace, ne u skriptu nebo obrázku.
        return isNavigation ? caches.match("./index.html") : Response.error();
      }))
  );
});
