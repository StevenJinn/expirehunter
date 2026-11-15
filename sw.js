/* sw.js — ตัวแทนที่ service worker เดิมของ Expire Hunter
   เครื่องที่เคยติดตั้ง/เปิด Expire Hunter ไว้จะดึงไฟล์นี้ไปแทนของเก่าเอง (URL เดิม ./sw.js)
   ทำแค่ 3 อย่าง: เข้าแทนทันที → ล้างแคชเก่าทั้งหมด → ยกเลิกตัวเอง
   ไม่มี fetch handler จึงไม่แคชอะไรอีก ทุกคำขอไปที่เครือข่ายตรงๆ (SMS ไม่ใช้ service worker) */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (_) {}
  try { await self.registration.unregister(); } catch (_) {}
})()));
