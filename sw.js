/* ═══════════════════════════════════════════════════════════════
   Expire Hunter — Service Worker v1.0
   Hosted at: https://stevenjinn.github.io/expirehunter/
   ═══════════════════════════════════════════════════════════════ */

const CACHE_VER  = 'v1.0.1';
const CACHE_NAME = `expire-hunter-${CACHE_VER}`;
const RUNTIME    = `expire-hunter-runtime-${CACHE_VER}`;
const BASE       = '/expirehunter';

const PRECACHE = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
];

const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'www.gstatic.com',
];

/* ── INSTALL ── */
self.addEventListener('install', e => {
  console.log('[SW] Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE).catch(err => console.warn('[SW] precache partial fail:', err)))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ── */
self.addEventListener('activate', e => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== RUNTIME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  /* Skip Firebase live data calls */
  if (url.hostname.includes('firebasedatabase.app')) return;
  if (url.hostname.includes('firebasestorage.googleapis.com')) return;
  if (url.hostname.includes('identitytoolkit.googleapis.com')) return;
  if (url.hostname.includes('securetoken.googleapis.com')) return;

  const isCDN = CDN_HOSTS.some(h => url.hostname.includes(h));

  if (isCDN) {
    /* CDN: serve from cache, revalidate in background */
    e.respondWith(
      caches.match(req).then(cached => {
        const fresh = fetch(req).then(res => {
          if (res && res.status === 200) {
            caches.open(RUNTIME).then(c => c.put(req, res.clone()));
          }
          return res;
        }).catch(() => null);
        return cached || fresh;
      })
    );
    return;
  }

  if (url.pathname.startsWith(BASE)) {
    /* App shell: cache-first */
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (!res || res.status !== 200) return res;
          caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => {
          if (req.mode === 'navigate') return caches.match(`${BASE}/index.html`);
          return new Response('', { status: 503 });
        });
      })
    );
  }
});

self.addEventListener('push', e => {
  if (!e.data) return;
  const d = e.data.json();
  self.registration.showNotification(d.title || 'Expire Hunter', {
    body: d.body || 'มีสินค้าใกล้หมดอายุ',
    icon: `${BASE}/icons/icon-192.png`,
    badge: `${BASE}/icons/icon-96.png`,
    vibrate: [200, 100, 200],
    tag: 'expire-hunter',
    renotify: true,
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('expirehunter') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(`${BASE}/`);
    })
  );
});
