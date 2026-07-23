// scripts/setup-menu.js
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

// 1. Load .env file manually (Zero-dependency dotenv helper)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = val;
  });
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.MINI_APP_URL;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  || createHash('sha256').update(`${token}:telegram-webhook`).digest('hex');

if (!token || token.includes('your_bot_token_here')) {
  console.error("❌ Xatolik: Iltimos, loyiha ildizidagi '.env' fayliga Telegram Bot Tokeningizni kiriting!");
  process.exit(1);
}

if (!appUrl || appUrl.includes('your-ngrok-or-hosted-url')) {
  console.error("❌ Xatolik: Iltimos, loyiha ildizidagi '.env' fayliga Mini App URL manzilingizni kiriting!");
  process.exit(1);
}

async function setupMenuButton() {
  console.log("⚙️ Telegram Bot sozlamalari yangilanmoqda...");
  console.log(`🔗 Mini App URL: ${appUrl}`);

  const botDescription = `AI Finance Bot 🤖\n\nShaxsiy moliyaviy hisob-kitoblar va byudjet nazoratida sizning sun'iy intellekt yordamchingiz.\n\n✨ Daromad va xarajatlarni oson kiritish\n📊 Oylik limitlar (byudjetlar) o'rnatish\n📈 Moliyaviy statistika va grafiklar\n💡 Sun'iy intellektdan shaxsiy maslahatlar\n📱 Qulay Telegram Mini App interfeysi\n\nMoliyaviy erkinlik sari birinchi qadamni bugun boshlang! 🚀`;
  const botShortDescription = `Shaxsiy moliyaviy hisob-kitoblar va byudjet nazoratida sizning sun'iy intellekt yordamchingiz.`;

  try {
    // 1. Set Chat Menu Button
    const menuUrl = `https://api.telegram.org/bot${token}/setChatMenuButton`;
    const menuPayload = {
      menu_button: {
        type: 'web_app',
        text: 'Open Mini App',
        web_app: { url: appUrl }
      }
    };
    const menuRes = await fetch(menuUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menuPayload)
    }).then(r => r.json());

    if (menuRes.ok) {
      console.log("✅ Bot menyusida 'Open Mini App' tugmasi faollashtirildi.");
    } else {
      console.error("❌ Menu tugmasi API xatoligi:", menuRes.description);
    }

    // 2. Set Bot Description (What can this bot do?)
    const descUrl = `https://api.telegram.org/bot${token}/setMyDescription`;
    const descPayload = { description: botDescription };
    const descRes = await fetch(descUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(descPayload)
    }).then(r => r.json());

    if (descRes.ok) {
      console.log("✅ Botning 'Description' matni o'rnatildi (start bosishdan oldin ko'rinadi).");
    } else {
      console.error("❌ Description API xatoligi:", descRes.description);
    }

    // 3. Set Bot Short Description
    const shortDescUrl = `https://api.telegram.org/bot${token}/setMyShortDescription`;
    const shortDescPayload = { short_description: botShortDescription };
    const shortDescRes = await fetch(shortDescUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shortDescPayload)
    }).then(r => r.json());

    if (shortDescRes.ok) {
      console.log("✅ Botning 'Short Description' matni o'rnatildi.");
    } else {
      console.error("❌ Short Description API xatoligi:", shortDescRes.description);
    }

    // 4. Deliver /start updates to the deployed Next.js app.
    const webhookUrl = `${appUrl.replace(/\/+$/, '')}/api/telegram/webhook`;
    const webhookPayload = {
      url: webhookUrl,
      allowed_updates: ['message'],
      secret_token: webhookSecret
    };

    const webhookRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    }).then(r => r.json());

    if (webhookRes.ok) {
      console.log("✅ Webhook sozlandi. Endi 'npm run bot' doimiy ishlashi shart emas.");
    } else {
      console.error("❌ Webhook API xatoligi:", webhookRes.description);
    }

    console.log("\n💡 Telegram botingizga kirib o'zgarishlarni ko'rishingiz mumkin.");
  } catch (error) {
    console.error("❌ Xatolik yuz berdi:", error.message);
  }
}

setupMenuButton();
