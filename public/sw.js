/**
 * Jalanea ATS Service Worker
 * Keeps the app installable and provides an honest offline notice.
 *
 * Resume analysis is not advertised or cached as an offline feature.
 */

const CACHE_NAME = 'jalanea-ats-install-v4';

// Install assets only. Do not cache app pages, resume data, or analysis output.
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - network for the app, with a static notice for offline navigation.
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API routes (let them always go to network)
  if (event.request.url.includes('/api/')) return;

  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) =>
        cachedResponse || fetch(event.request)
      )
    );
    return;
  }

  // Everything else stays network-only so a previous user's document or a
  // stale application bundle is never served from this cache.
  event.respondWith(
    fetch(event.request).catch(
      () => new Response('Network connection required', { status: 503 })
    )
  );
});
