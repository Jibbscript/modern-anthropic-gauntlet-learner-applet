// Minimal offline cache for the hosted build: network-first for navigations,
// cache-first for hashed assets. Bump VERSION to invalidate.
const VERSION = 'gauntlet-v1'
const RUNTIME = 'gauntlet-pyodide-v1'
self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['./', './index.html', './icon.svg', './manifest.webmanifest'])))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== RUNTIME).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})
// hashed assets from older deploys would otherwise pile up: keep the newest 80
const MAX_ASSETS = 80
async function trimAssets(cache) {
  const keys = (await cache.keys()).filter((r) => new URL(r.url).pathname.includes('/assets/'))
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(old)
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // the in-browser Python runtime for Code Labs: cache-first so labs work offline after one load
  if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/pyodide@')) {
    e.respondWith(
      caches.open(RUNTIME).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) c.put(req, res.clone())
              return res
            }),
        ),
      ),
    )
    return
  }
  if (url.origin !== location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && url.pathname.includes('/assets/')) {
            const copy = res.clone()
            caches.open(VERSION).then((c) => c.put(req, copy).then(() => trimAssets(c)))
          }
          return res
        }),
    ),
  )
})
