/**
 * ZEROHUB UI — service worker
 * Caches the app shell so the interface (and locally stored history,
 * which lives in IndexedDB, not here) still opens with no network.
 */
const CACHE_NAME = 'zerohub-ui-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './db.js',
  './api.js',
  './app.js',
  './manifest.json',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached || caches.match('./index.html'));
    })
  );
});
