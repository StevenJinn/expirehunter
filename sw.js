/* sw.js — service worker ของ SMS (ใช้ชื่อไฟล์เดิม ./sw.js แทนของ Expire Hunter)
   - เครือข่ายก่อนเสมอ: ออนไลน์ได้ไฟล์ล่าสุดทุกครั้ง · ถ้าเน็ตหลุด/ช้าเกิน 4 วิ ใช้ที่แคชไว้
   - ตอนเปิดใช้งาน ลบแคชของ Expire Hunter เดิมทิ้งทั้งหมด
   - ไม่แตะคำขอไป Firebase Realtime Database (ซิงค์ทำงานเอง) */
const CACHE = 'sms-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  try { const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))); } catch (_) {}
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url), same = u.origin === location.origin;
  if (!same && u.hostname !== 'www.gstatic.com') return;
  e.respondWith((async () => {
    const hit = await caches.match(r)
      || (r.mode === 'navigate' ? await caches.match(new URL('index.html', self.registration.scope)) : undefined);
    const net = fetch(r, same ? { cache: 'no-cache' } : undefined).then(async res => {
      if (res && (res.ok || res.type === 'opaque') && res.status !== 206) {
        try { (await caches.open(CACHE)).put(r, res.clone()); } catch (_) {}
      }
      return res;
    });
    if (!hit) return net;
    e.waitUntil(net.catch(() => {}));
    return Promise.race([net, new Promise(ok => setTimeout(() => ok(hit), 4000))]).catch(() => hit);
  })());
});
