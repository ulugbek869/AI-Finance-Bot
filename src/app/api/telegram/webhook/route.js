import { createHash } from 'crypto';

export const runtime = 'nodejs';

const TELEGRAM_API = 'https://api.telegram.org';

function getWebhookSecret(token) {
  return process.env.TELEGRAM_WEBHOOK_SECRET
    || createHash('sha256').update(`${token}:telegram-webhook`).digest('hex');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isStartCommand(text) {
  return /^\/start(?:@\w+)?(?:\s|$)/i.test(text.trim());
}

async function sendTelegramMessage(token, body) {
  const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description || 'Telegram xabarni yubora olmadi.');
  }
}

export async function POST(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const miniAppUrl = process.env.MINI_APP_URL?.replace(/\/+$/, '');
  const webhookSecret = getWebhookSecret(token);

  if (!token || !miniAppUrl) {
    return Response.json({ ok: false, error: 'Telegram sozlamalari topilmadi.' }, { status: 500 });
  }

  if (request.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Noto‘g‘ri so‘rov.' }, { status: 400 });
  }

  const message = update.message;
  if (!message?.text || !isStartCommand(message.text)) {
    return Response.json({ ok: true });
  }

  const firstName = escapeHtml(message.from?.first_name || message.chat?.first_name || 'Foydalanuvchi');
  const replyText = `Salom, <b>${firstName}</b>! 👋\n\n<b>AI Finance Bot</b> shaxsiy moliyaviy maslahatchingizga xush kelibsiz.\n\n<b>Bizning imkoniyatlarimiz:</b>\n✨ Daromad va xarajatlarni oson kiritish\n📊 Oylik limitlar (byudjetlar) o'rnatish\n📈 Moliyaviy statistika va grafiklar\n💡 Sun'iy intellektdan shaxsiy maslahatlar\n📱 Qulay Telegram Mini App interfeysi\n\nMini Appga kirish uchun quyidagi tugmani bosing:`;

  try {
    await sendTelegramMessage(token, {
      chat_id: message.chat.id,
      text: replyText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: 'Open Mini App', web_app: { url: miniAppUrl } }]],
      },
    });
  } catch (error) {
    console.error('Telegram webhook xatoligi:', error.message);
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true });
}
