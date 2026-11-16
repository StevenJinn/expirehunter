/* SMS · service worker
   - ไฟล์ของแอป (index.html, manifest, ไอคอน): ดึงจากเน็ตก่อนทุกครั้ง (ข้ามแคชของ browser/โฮสต์) → ดีพลอยเวอร์ชันใหม่แล้วเครื่องที่ติดตั้งไว้ได้ของใหม่ทันทีที่เปิดแอป
     ถ้าเน็ตช้า (เกิน 4 วินาที) หรือออฟไลน์ ใช้ตัวที่เก็บไว้แทน → ใช้งานออฟไลน์ได้เหมือนเดิม
   - สคริปต์ภายนอก (Firebase SDK, ZXing ฯลฯ): ใช้ของที่เก็บไว้ไปก่อน แล้วอัปเดตเบื้องหลัง
   - ข้อมูลซิงค์ของ Firebase (firebasedatabase.app) และหน้า login ไม่แตะ ปล่อยผ่านเน็ตตามปกติ
   - เวอร์ชันใหม่ใช้งานทันที (skipWaiting + clients.claim) และล้างแคชเวอร์ชันเก่าให้เอง
   เปลี่ยน VERSION เมื่ออยากบังคับล้างแคชทั้งหมด (ปกติไม่ต้อง — ขอแค่ไฟล์ sw.js นี้ต่างจากของเดิม 1 ครั้ง) */
const VERSION = 'sms-2026-11-16';
const CORE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

const fallback = key => caches.match(key, { ignoreSearch: true }).then(m => m || caches.match('./', { ignoreSearch: true }));

/* ไฟล์ของแอปเอง: เน็ตก่อน (ไม่ใช้แคช HTTP) · ช้า/ออฟไลน์ → ใช้ที่เก็บไว้ */
function netFirst(req) {
  const key = req.mode === 'navigate' ? './index.html' : req;
  return new Promise(res => {
    let done = false;
    const timer = setTimeout(() => {
      fallback(key).then(m => { if (m && !done) { done = true; res(m); } });
    }, 4000);
    fetch(req, { cache: 'no-cache' }).then(n => {
      if (n && n.ok) { const cp = n.clone(); caches.open(VERSION).then(c => c.put(key, cp)).catch(() => { }); }
      if (!done) { done = true; clearTimeout(timer); res(n); }
    }).catch(() => {
      clearTimeout(timer);
      if (!done) { done = true; fallback(key).then(m => res(m || Response.error())); }
    });
  });
}

/* สคริปต์/ฟอนต์ภายนอก: ใช้ของเดิมก่อน แล้วอัปเดตเบื้องหลัง */
function swr(req) {
  return caches.open(VERSION).then(c => c.match(req).then(m => {
    const f = fetch(req).then(n => { if (n && (n.ok || n.type === 'opaque')) c.put(req, n.clone()).catch(() => { }); return n; }).catch(() => m || Response.error());
    return m || f;
  }));
}

/* แคชเฉพาะ CDN ที่แอปใช้ (Firebase SDK, ZXing, ฟอนต์) · ที่เหลือ เช่น ฐานข้อมูล Firebase (firebasedatabase.app / firebaseio.com) และหน้า auth ปล่อยผ่านเน็ตตามปกติ ไม่แตะ */
const CDN = /^(www\.gstatic\.com|fonts\.gstatic\.com|fonts\.googleapis\.com|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com)$/;

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url);
  if (u.origin === location.origin) e.respondWith(netFirst(r));
  else if (CDN.test(u.hostname)) e.respondWith(swr(r));
});
