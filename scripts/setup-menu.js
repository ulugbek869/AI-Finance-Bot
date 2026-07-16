// scripts/setup-menu.js
const fs = require('fs');
const path = require('path');

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

if (!token || token.includes('your_bot_token_here')) {
  console.error("❌ Xatolik: Iltimos, loyiha ildizidagi '.env' fayliga Telegram Bot Tokeningizni kiriting!");
  process.exit(1);
}

if (!appUrl || appUrl.includes('your-ngrok-or-hosted-url')) {
  console.error("❌ Xatolik: Iltimos, loyiha ildizidagi '.env' fayliga Mini App URL manzilingizni kiriting!");
  process.exit(1);
}

async function setupMenuButton() {
  console.log("⚙️ Telegram Bot uchun 'Open Mini App' menyu tugmasi o'rnatilmoqda...");
  console.log(`🔗 Mini App URL: ${appUrl}`);

  const apiUrl = `https://api.telegram.org/bot${token}/setChatMenuButton`;
  
  const payload = {
    menu_button: {
      type: 'web_app',
      text: 'Open Mini App',
      web_app: {
        url: appUrl
      }
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.ok) {
      console.log("✅ Muvaffaqiyatli bajarildi! Bot menyusida 'Open Mini App' tugmasi faollashtirildi.");
      console.log("💡 Telegram botingizga kirib tugmani ko'rishingiz va sinab ko'rishingiz mumkin.");
    } else {
      console.error("❌ Telegram API xatoligi:", result.description);
    }
  } catch (error) {
    console.error("❌ Tarmoq xatoligi yuz berdi:", error.message);
  }
}

setupMenuButton();
