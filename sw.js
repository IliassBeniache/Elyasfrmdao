const C = 'gymlog-v3';
const FILES = ['./', './index.html', './manifest.json', './icon-180.png', './icon-512.png'];

// Cache each file separately so one missing file can't block the whole install.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => Promise.allSettled(FILES.map(f => c.add(f)))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Open instantly from cache (works offline); refresh the cache in the background when online.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const net = fetch(req).then(async r => {
    if (r && r.ok) { const c = await caches.open(C); c.put(req, r.clone()); }
    return r;
  }).catch(() => null);
  e.waitUntil(net);
  e.respondWith((async () => {
    const c = await caches.open(C);
    const hit = await c.match(req, {ignoreSearch: true});
    if (hit) return hit;
    const r = await net;
    if (r) return r;
    if (req.mode === 'navigate') {
      const p = (await c.match('./index.html')) || (await c.match('./'));
      if (p) return p;
    }
    return Response.error();
  })());
});
