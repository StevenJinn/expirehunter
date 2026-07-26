/* ═══════════════════════════════════════════════════════════════
   Expire Hunter — Service Worker v1.0
   Hosted at: https://stevenjinn.github.io/expirehunter/
   ═══════════════════════════════════════════════════════════════ */

/* [AUTO 2026-07-26] เดิมต้อง bump CACHE_VER เองทุกครั้งที่ deploy — เปลี่ยนเป็นคำนวณจากวันที่
   ปัจจุบัน (รายวัน) แทน ทุกวันใหม่จะได้ cache name ใหม่ → cache เก่าถูกลบทิ้งตอน activate
   อัตโนมัติ ไม่ต้องแก้เลขมือแล้ว (คู่กับ SW_BUILD_VERSION ฝั่ง index.html ที่เป็นรายชั่วโมง) */
const _d = new Date();
const CACHE_VER  = `v${_d.getFullYear()}${String(_d.getMonth()+1).padStart(2,'0')}${String(_d.getDate()).padStart(2,'0')}`;
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
    /* [FIX 2026-06-30] index.html/navigation ต้องเป็น network-first ไม่ใช่ cache-first
       เดิม cache-first ทำให้พอ cache ครั้งแรกแล้ว ทุกครั้งหลังจากนั้นเสิร์ฟจาก cache เก่าตลอดไป
       โดยไม่เช็ค network เลย — ถ้าลืม bump CACHE_VER ตอน deploy (sw.js ไบต์เหมือนเดิม) browser
       จะไม่เห็นว่ามี SW update ให้ติดตั้งเลย ทำให้ index.html ค้างเวอร์ชันเก่าถาวรในเครื่องที่เคย
       เปิดแอปมาก่อน (ต้นเหตุของปัญหา "บางเครื่องไม่เห็นหน้า login Google sign-in ใหม่")
       network-first: พยายามดึงของสดจาก network ก่อนเสมอ (ถ้าเน็ตปกติจะได้ของล่าสุดทุกครั้ง)
       ใช้ cache เป็น fallback เฉพาะตอนออฟไลน์/network fail เท่านั้น */
    const isHTML = req.mode === 'navigate' ||
                   url.pathname === `${BASE}/` ||
                   url.pathname === `${BASE}/index.html` ||
                   (req.headers.get('accept') || '').includes('text/html');

    if (isHTML) {
      e.respondWith(
        fetch(req).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          }
          return res;
        }).catch(() => caches.match(req).then(cached => cached || caches.match(`${BASE}/index.html`)))
      );
      return;
    }

    /* ไฟล์ static อื่น (icons, manifest ฯลฯ) ไม่ค่อยเปลี่ยน — cache-first ตามเดิมได้ */
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (!res || res.status !== 200) return res;
          caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
  }
});

/* ── MESSAGE (รับคำสั่ง skipWaiting จากฝั่ง client ถ้ามี) ── */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
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
