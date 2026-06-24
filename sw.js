/* ═══════════════════════════════════════════════════════════════
   Expire Hunter — Service Worker v1.0
   Strategy: Cache-first for static assets, Network-first for API
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'expire-hunter-v1.0.0';
const RUNTIME_CACHE = 'expire-hunter-runtime-v1';

/* ── Resources to pre-cache on install ── */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

/* ── CDN resources to cache on first fetch ── */
const CDN_PATTERNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'www.gstatic.com/firebasejs',
];

/* ═══ INSTALL ═══ */
self.addEventListener('install', event => {
  console.log('[SW] Installing Expire Hunter SW...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Pre-cache failed (ok if offline):', err))
  );
});

/* ═══ ACTIVATE ═══ */
self.addEventListener('activate', event => {
  console.log('[SW] Activating Expire Hunter SW...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      ))
      .then(() => self.clients.claim())
  );
});

/* ═══ FETCH ═══ */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Skip non-GET and Firebase RTDB / Storage API calls */
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('firebasedatabase.app')) return;
  if (url.hostname.includes('firebasestorage.googleapis.com')) return;
  if (url.hostname.includes('identitytoolkit.googleapis.com')) return;
  if (url.hostname.includes('securetoken.googleapis.com')) return;

  /* ── CDN libraries: Cache-first (stale-while-revalidate) ── */
  const isCDN = CDN_PATTERNS.some(p => url.hostname.includes(p) || url.href.includes(p));
  if (isCDN) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          /* Serve cached version, update in background */
          fetch(event.request)
            .then(fresh => {
              caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, fresh));
            })
            .catch(() => {/* offline — cached version still served */});
          return cached;
        }
        /* Not cached yet — fetch and cache */
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
      })
    );
    return;
  }

  /* ── App shell (HTML / manifest / icons): Cache-first ── */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => {
          /* Offline fallback: serve index.html for navigation */
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503 });
        });
      })
    );
  }
});

/* ═══ BACKGROUND SYNC (optional) ═══ */
self.addEventListener('sync', event => {
  if (event.tag === 'expire-hunter-sync') {
    console.log('[SW] Background sync triggered');
  }
});

/* ═══ PUSH NOTIFICATIONS (optional placeholder) ═══ */
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'Expire Hunter', {
    body: data.body || 'มีสินค้าใกล้หมดอายุ',
    icon: './icons/icon-192.png',
    badge: './icons/icon-96.png',
    tag: 'expire-hunter-push',
    renotify: true,
    vibrate: [200, 100, 200],
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('index.html') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
