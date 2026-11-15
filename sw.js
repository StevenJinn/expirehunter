/* SMS service worker — เปลี่ยนเลขเวอร์ชันเมื่ออัปเดตแอป */
const VER = 'sms-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VER)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;          // ปล่อย API/ซิงค์ภายนอกผ่านตามปกติ
  // network-first (ได้หน้าใหม่เสมอ) แล้วสำรองด้วยแคชเมื่อออฟไลน์
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); }
      return res;
    }).catch(() =>
      caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') || caches.match('./') : undefined))
    )
  );
});
