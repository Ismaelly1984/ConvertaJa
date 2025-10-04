/* eslint-env serviceworker */
const CACHE = 'convertaja-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');
  const fallbackUrl = new URL('index.html', self.registration.scope);

  if (isHTML) {
    // Network-first for HTML to avoid serving stale index from cache
    event.respondWith(fetch(req).catch(() => caches.match(fallbackUrl)));
    return;
  }

  // Cache-first for other assets
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
