# 📦 วิธีอัปโหลดขึ้น GitHub

## ไฟล์ที่ต้องอัปโหลดเข้า repo: stevenjinn/expirehunter

ต้องอยู่ตำแหน่งเดียวกับ index.html:

```
📁 root ของ repo
  📄 manifest.json     ← อัปโหลดไฟล์นี้
  📄 sw.js             ← อัปโหลดไฟล์นี้
  📁 icons/
    🖼 icon-72.png     ← อัปโหลดทั้ง folder
    🖼 icon-96.png
    🖼 icon-128.png
    🖼 icon-144.png
    🖼 icon-152.png
    🖼 icon-180.png
    🖼 icon-192.png    ← สำคัญ (homescreen icon)
    🖼 icon-384.png
    🖼 icon-512.png    ← สำคัญ (splash screen)
```

## อัปโหลดผ่าน GitHub Web (ไม่ต้องใช้ git)

1. ไปที่ https://github.com/stevenjinn/expirehunter
2. กด **"Add file"** → **"Upload files"**
3. ลาก `manifest.json` และ `sw.js` วาง
4. กด **"Commit changes"**
5. กด **"Add file"** อีกครั้ง → สร้าง folder `icons` → อัปโหลด icon ทั้งหมด

## ทดสอบว่า PWA ทำงานหรือยัง

เปิด https://stevenjinn.github.io/expirehunter/ บน Chrome:
- DevTools → Application → Manifest → ควรเห็น icon หมี
- DevTools → Application → Service Workers → ควรเห็น sw.js running
- แถบที่อยู่ด้านบนจะมีปุ่ม "Install" (💻) หรือ banner ล่าง

## ติดตั้งบนมือถือ

Android Chrome: แตะ ⋮ → "Add to Home screen"
iOS Safari: แตะ □↑ → "Add to Home Screen"
→ ไอคอนหมี Expire Hunter จะปรากฏบน Home Screen
