# 📱 Expire Hunter — คู่มือติดตั้งเป็นแอปบนมือถือ

## วิธีที่ 1: Deploy ฟรีด้วย Netlify Drop (แนะนำ — ง่ายที่สุด)

1. ไปที่ **https://app.netlify.com/drop**
2. **ลาก folder ทั้งหมดนี้** วางลงในหน้าเว็บ
3. Netlify จะให้ URL เช่น `https://expire-hunter-xyz.netlify.app`
4. เปิด URL นั้นบน Chrome/Safari มือถือ
5. แตะ **"Add to Home Screen"** — แอปจะอยู่บน home screen เหมือนแอปปกติ

## วิธีที่ 2: Deploy ด้วย Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. ใน terminal เข้า folder นี้ แล้วพิมพ์ `vercel`
3. Follow instructions — ได้ URL ฟรีทันที

## วิธีที่ 3: ทดสอบในเครื่องก่อน

```bash
# ต้องใช้ local server (ไม่ใช่ file://)
npx serve .
# แล้วเปิด http://localhost:3000
```

## วิธีติดตั้งบน Android (Chrome)
1. เปิด URL ในแอป Chrome
2. แตะ ⋮ (สามจุด) > **"Add to Home screen"**
3. กด "Add" — แอปจะอยู่หน้า Home

## วิธีติดตั้งบน iOS (Safari)
1. เปิด URL ในแอป Safari
2. แตะ **Share** (□↑) > **"Add to Home Screen"**
3. กด "Add" — แอปจะมีไอคอน Expire Hunter

## โครงสร้างไฟล์ที่ต้องอยู่ด้วยกัน
```
📁 expire-hunter/
  📄 index.html      ← แอปหลัก
  📄 manifest.json   ← ข้อมูลแอป (ชื่อ, ไอคอน, สี)
  📄 sw.js           ← Service Worker (ทำงานออฟไลน์ได้)
  📁 icons/          ← ไอคอนทุกขนาด
    🖼 icon-72.png
    🖼 icon-192.png
    🖼 icon-512.png
    ... (9 sizes total)
```

## ฟีเจอร์ที่ได้จากการแปลงเป็น PWA
- ✅ ติดตั้งบน Home Screen ได้ (ไม่ต้องพิมพ์ URL)
- ✅ ทำงานออฟไลน์ได้ (หลังจากเปิดครั้งแรก)
- ✅ Loading เร็วขึ้น (cache CDN scripts)
- ✅ Splash screen และ theme color
- ✅ Standalone mode (ไม่มี browser bar)
- ✅ รองรับ Push Notification (สำหรับแจ้งเตือนสินค้าใกล้หมดอายุ)
