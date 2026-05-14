const CACHE_NAME = "education-system-pwa-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => {
      if (key !== CACHE_NAME) return caches.delete(key);
    })))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Supabase API 데이터는 항상 네트워크 우선. 오프라인에서 잘못된 오래된 DB를 보여주지 않기 위함.
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(fetch(req).catch(() => new Response(JSON.stringify({ error: "offline" }), {
      headers: { "Content-Type": "application/json" },
      status: 503
    })));
    return;
  }

  // 앱 본체는 캐시 우선 + 네트워크 갱신.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => null);
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
