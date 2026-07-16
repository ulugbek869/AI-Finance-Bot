# AI Finance Bot — Telegram Mini App (Next.js + Node.js)

Shaxsiy moliyaviy daromad va xarajatlarni boshqarish uchun mo'ljallangan, Telegram Mini App interfeysiga ega zamonaviy ilova.

## Texnik Stack

- **Frontend**: Next.js (React) va Vanilla CSS Design System.
- **Backend API**: Next.js (API Routes).
- **Statistika**: Chart.js va react-chartjs-2.
- **Integratsiya**: Telegram Web App SDK.
- **Ma'lumotlar saqlanishi**: `localStorage` (Brauzer) va `DeviceStorage` (Telegram).

## Loyiha Tuzilishi

- `src/app/` — Ekranlar/Sahifalar:
  - `page.js` — Bosh sahifa (Dashboard)
  - `transactions/page.js` — Amallar tarixi (Tarix)
  - `stats/page.js` — Moliya tahlili va statistikalar
  - `budget/page.js` — Oylik byudjet limitlari
  - `settings/page.js` — Ilova sozlamalari (valyuta, eksport/import, tozalash)
- `src/components/` — UI komponentlar:
  - `BottomNav.js` — Navigatsiya paneli
  - `Modal.js` — Bottom sheet interfeysi
  - `TransactionForm.js` — Yangi daromad/xarajat qo'shish formasi
  - `TransactionItem.js` — Tranzaksiya qatori
  - `Toast.js` — Tezkor xabarnomalar
- `src/lib/` — Yordamchi modullar:
  - `telegram.js` — Telegram WebApp wrapperi
  - `storage.js` — LocalStorage boshqaruvi
  - `categories.js` — Standart kategoriyalar ro'yxati

## O'rnatish va Ishga tushirish

1. **Kutubxonalarni o'rnatish**:
   ```bash
   npm install
   ```

2. **Dasturni ishga tushirish**:
   ```bash
   npm run dev
   ```

3. **Telegram Botini Sozlash (.env)**:
   - Loyiha ildizidagi `.env` faylini oching.
   - `TELEGRAM_BOT_TOKEN` o'zgaruvchisiga o'zingizning bot tokeningizni yozing.
   - `MINI_APP_URL` o'zgaruvchisiga Mini App ochiladigan sayt (masalan, `ngrok` manzilingiz: `https://xxxx.ngrok-free.app`) yozing.

4. **Menyuda "Open Mini App" Tugmasini Faollashtirish**:
   Har safar botingizga kirganda chap pastki burchakda avtomatik "Open Mini App" tugmasi chiqishi uchun quyidagi buyruqni bir marta bajaring:
   ```bash
   npm run setup-menu
   ```

5. **Telegram Botini Ishga Tushirish (Long Polling)**:
   Agar botingiz foydalanuvchilar `/start` yuborganda inline havola bilan javob berishini xohlasangiz, botni ishga tushiring:
   ```bash
   npm run bot
   ```