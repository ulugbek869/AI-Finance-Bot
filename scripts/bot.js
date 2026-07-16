// scripts/bot.js
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
  console.error("❌ Xatolik: Iltimos, '.env' fayliga TELEGRAM_BOT_TOKEN ni yozing!");
  process.exit(1);
}

if (!appUrl || appUrl.includes('your-ngrok-or-hosted-url')) {
  console.error("❌ Xatolik: Iltimos, '.env' fayliga MINI_APP_URL ni yozing!");
  process.exit(1);
}

async function request(method, body = {}) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await response.json();
  } catch (e) {
    console.error(`Telegram API request error (${method}):`, e.message);
    return null;
  }
}

async function startBot() {
  console.log("🚀 Telegram Bot ishga tushdi (Long Polling)...");
  console.log(`🤖 Bot orqali ochiladigan sayt: ${appUrl}`);
  
  let offset = 0;
  
  // Set Menu Button on start automatically
  await request('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Open Mini App',
      web_app: { url: appUrl }
    }
  });

  while (true) {
    const updatesRes = await request('getUpdates', { offset, timeout: 30 });
    
    if (updatesRes && updatesRes.ok && updatesRes.result.length > 0) {
      for (const update of updatesRes.result) {
        offset = update.update_id + 1;
        
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text.trim();
          const firstName = update.message.chat.first_name || 'Foydalanuvchi';

          if (text.startsWith('/start')) {
            console.log(`📨 /start buyrug'i olindi. Chat ID: ${chatId}`);
            
            const replyText = `Salom, ${firstName}! 👋\n\nAI Finance Bot shaxsiy moliyaviy maslahatchingizga xush kelibsiz.\n\nDaromad va xarajatlaringizni yozib borish, oylik limitlarni belgilash hamda sun'iy intellektdan maslahatlar olish uchun quyidagi tugmani bosib Mini Appga kiring:`;
            
            const replyMarkup = {
              inline_keyboard: [
                [
                  { text: '🚀 Mini Appni ochish', web_app: { url: appUrl } }
                ]
              ]
            };

            await request('sendMessage', {
              chat_id: chatId,
              text: replyText,
              reply_markup: replyMarkup
            });
          }
        }
      }
    }
    
    // Brief sleep to avoid CPU lock on connection issues
    await new Promise(r => setTimeout(r, 1000));
  }
}

startBot().catch(err => {
  console.error("Bot ishida xatolik:", err.message);
});
