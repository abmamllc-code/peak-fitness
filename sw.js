/* PEAK Fitness service worker — caches the app shell for offline use. */
const CACHE = 'peakfit-v19';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './assets/icon.svg', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-256.png', './assets/icon-512.png',
  './assets/icon-maskable-512.png', './assets/fonts/roboto-latin.woff2',
  './assets/meals/chicken-potatoes.jpg', './assets/meals/snack-yogurt.jpg', './assets/meals/bananas-dates.jpg',
  './assets/meals/potatoes.jpg', './assets/meals/dinner-mince.jpg'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // sync.json turns cloud sync on after deploy. It must not stick in the app cache.
  if (url.pathname.endsWith('/sync.json')) {
    e.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }
  // Exercise photos are not in the install list. The first view stores them here for offline use.
  // Stale-while-revalidate: instant from cache, refresh in background.
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }));
});
