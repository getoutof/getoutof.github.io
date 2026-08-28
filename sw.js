const SHELL_CACHE = "trajectry-shell-v1";
const RUNTIME_CACHE = "trajectry-runtime-v1";
const KNOWN = new Set([SHELL_CACHE, RUNTIME_CACHE]);

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("trajectry-") && !KNOWN.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isServiceWorkerRequest(url) {
  return url.pathname.endsWith("/sw.js") || url.pathname.endsWith("sw.js");
}

function isNavigationRequest(request) {
  if (request.mode === "navigate") return true;
  return request.method === "GET" && Boolean(request.headers.get("accept")?.includes("text/html"));
}

function isHashedAsset(url) {
  return url.origin === self.location.origin && url.pathname.includes("/assets/");
}

function isBunnyFont(url) {
  return url.hostname === "fonts.bunny.net";
}

async function putCopy(cacheName, request, response) {
  if (!response.ok) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch {
    /* opaque, quota, or Cache API missing mid-flight */
  }
}

async function networkFirstShell(request) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      await putCopy(SHELL_CACHE, "./index.html", fresh);
    }
    if (fresh.status !== 0) return fresh;
  } catch {
    /* offline */
  }
  return (
    (await caches.match("./index.html")) ||
    (await caches.match("./")) ||
    (await caches.match(request)) ||
    Response.error()
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  await putCopy(cacheName, request, fresh);
  return fresh;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refreshing = fetch(request)
    .then((fresh) => {
      if (fresh.ok) void cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || refreshing;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isServiceWorkerRequest(url)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstShell(request));
    return;
  }

  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  if (isBunnyFont(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
