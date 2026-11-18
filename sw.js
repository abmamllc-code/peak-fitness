/* PEAK Fitness service worker — caches the app shell for offline use. */
const CACHE = 'peakfit-v3';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './assets/peak-wordmark.png', './assets/peak-wordmark-light.png',
  './assets/icon-dumbbell-light-180.png', './assets/icon-dumbbell-light-192.png', './assets/icon-dumbbell-light-256.png', './assets/icon-dumbbell-light-512.png',
  './assets/icon-dumbbell-light-maskable-512.png', './assets/fonts/roboto-latin.woff2'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Stale-while-revalidate: instant from cache, refresh in background.
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }));
});
