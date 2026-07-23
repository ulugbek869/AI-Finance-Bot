import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Prioritize the low-latency model for chat. The larger model is used only if
// the fast model is temporarily unavailable.
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_MESSAGES = 4;
const REQUEST_TIMEOUT_MS = 18_000;

function textValue(value, fallback = "Ma'lumot yo'q") {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).slice(0, 500);
  }
  return fallback;
}

function buildSystemPrompt(context = {}, language = 'uz') {
  const responseLanguage = { uz: "o'zbek", ru: 'rus', en: 'English' }[language] || "o'zbek";
  const userName = textValue(context.userName, '').replace(/[\r\n]+/g, ' ').trim();
  const lines = [
    "Siz AI Finance Bot ilovasining aqlli yordamchisisiz.",
    `Foydalanuvchiga faqat ${responseLanguage} tilida, do'stona va tushunarli javob bering.`,
    "Har qanday mavzudagi savollarga to'liq va foydali javob bering: umumiy bilim, texnologiya, ta'lim, hayot maslahatlari va boshqalar.",
    "Moliyaviy savollar bo'lsa, quyidagi foydalanuvchi ma'lumotlaridan foydalaning; ma'lumot yetarli bo'lmasa, buni ayting.",
    "Berilgan ma'lumotlarda yo'q faktlarni uydirmang. Ishonchingiz past bo'lsa buni aniq ayting.",
    "Javoblarni qisqa va amaliy qiling. Kerak bo'lsa ro'yxat va raqamlardan foydalaning.",
    "Muhim moliyaviy qarorlar uchun mutaxassis bilan maslahatlashishni tavsiya qiling.",
    "Markdown formatidan (**qalin**, ro'yxatlar) foydalanishingiz mumkin.",
    '',
    "Foydalanuvchi moliyaviy ma'lumotlari (moliya savollari uchun):",
    `- Valyuta: ${textValue(context.currency)}`,
    `- Balans: ${textValue(context.balance)}`,
    `- Jami daromad: ${textValue(context.totalIncome)}`,
    `- Jami xarajat: ${textValue(context.totalExpense)}`,
    `- Tranzaksiyalar soni: ${textValue(context.transactionCount)}`,
  ];

  if (userName) {
    lines.splice(2, 0, `Foydalanuvchining Telegramdagi ismi: ${userName}. Unga javoblarda tabiiy tarzda shu ism bilan murojaat qiling.`);
  }

  if (Array.isArray(context.topCategories) && context.topCategories.length) {
    lines.push('', "Eng ko'p xarajat qilingan kategoriyalar:");
    context.topCategories.slice(0, 5).forEach((category, index) => {
      lines.push(
        `${index + 1}. ${textValue(category?.icon, '📌')} ${textValue(category?.name)}: ${textValue(category?.amount)} ${textValue(context.currency)}`
      );
    });
  }

  if (Array.isArray(context.budgetStatus) && context.budgetStatus.length) {
    lines.push('', 'Byudjet holati:');
    context.budgetStatus.slice(0, 10).forEach((budget) => {
      lines.push(
        `- ${textValue(budget?.icon, '📌')} ${textValue(budget?.category)}: ${textValue(budget?.spent)}/${textValue(budget?.limit)} ${textValue(context.currency)} (${textValue(budget?.percent)}%)`
      );
    });
  } else {
    lines.push('', "Byudjet limitlari hali o'rnatilmagan.");
  }

  if (Array.isArray(context.recentTransactions) && context.recentTransactions.length) {
    lines.push('', "So'nggi tranzaksiyalar:");
    context.recentTransactions.slice(0, 10).forEach((transaction) => {
      const sign = transaction?.type === 'income' ? '+' : '-';
      const note = transaction?.note ? ` — ${textValue(transaction.note)}` : '';
      lines.push(
        `- ${textValue(transaction?.date)}: ${sign}${textValue(transaction?.amount)} ${textValue(context.currency)} (${textValue(transaction?.category)})${note}`
      );
    });
  }

  return lines.join('\n');
}

function buildContents(history, message) {
  const contents = [];

  if (Array.isArray(history)) {
    for (const item of history.slice(-MAX_HISTORY_MESSAGES)) {
      if (typeof item?.text !== 'string') continue;

      const text = item.text.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!text) continue;

      const role = item.sender === 'user' ? 'user' : 'model';
      // Gemini conversations must begin with the user. The app's greeting is
      // an assistant message, so it is deliberately not sent as chat history.
      if (!contents.length && role === 'model') continue;

      const previous = contents.at(-1);
      if (previous?.role === role) {
        previous.parts[0].text += `\n\n${text}`;
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }
  }

  const previous = contents.at(-1);
  if (previous?.role === 'user') {
    previous.parts[0].text += `\n\n${message}`;
  } else {
    contents.push({ role: 'user', parts: [{ text: message }] });
  }

  return contents;
}

async function generateResponse({ apiKey, model, contents, systemInstruction, signal }) {
  return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 512,
          },
        }),
        signal,
      }
    );
}

export async function POST(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortForDisconnect = () => controller.abort();
  request.signal.addEventListener('abort', abortForDisconnect, { once: true });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI API kaliti sozlanmagan." }, { status: 500 });
    }

    const { message, context, history, language } = await request.json();

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: "Xabar bo'sh bo'lishi mumkin emas." }, { status: 400 });
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Xabar ${MAX_MESSAGE_LENGTH} ta belgidan oshmasligi kerak.` },
        { status: 400 }
      );
    }

    const contents = buildContents(history, message.trim());
    const systemInstruction = buildSystemPrompt(context, language);
    let data = null;
    let lastError = null;

    for (const model of GEMINI_MODELS) {
      let response;
      try {
        response = await generateResponse({
          apiKey,
          model,
          contents,
          systemInstruction,
          signal: controller.signal,
        });
      } catch (error) {
        lastError = { model, status: 0, reason: error.name };
        continue;
      }

      if (response.ok) {
        data = await response.json();
        break;
      }

      const body = await response.text();
      lastError = { model, status: response.status, body };
      console.error('Gemini API xatoligi:', model, response.status);

      if (![404, 408, 429, 500, 502, 503, 504].includes(response.status)) {
        break;
      }
    }

    if (!data) {
      const isQuota =
        lastError?.status === 429 ||
        lastError?.body?.includes('RESOURCE_EXHAUSTED') ||
        lastError?.body?.includes('quota');
      const isUnavailable = [0, 408, 500, 502, 503, 504].includes(lastError?.status);

      return NextResponse.json(
        {
          error: isQuota
            ? "AI limiti tugagan. Google AI Studio'da billing/quotani tekshiring yoki biroz kutib qayta urinib ko'ring."
            : isUnavailable
              ? "AI modeli hozir band. Bir ozdan so'ng qayta urinib ko'ring."
              : "AI hozir javob bera olmadi. Keyinroq qayta urinib ko'ring.",
        },
        { status: 502 }
      );
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!reply) {
      return NextResponse.json({ error: "AI bo'sh javob qaytardi." }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI route xatoligi:', error.name);
    return NextResponse.json({ error: 'Server xatoligi yuz berdi.' }, { status: 500 });
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', abortForDisconnect);
  }
}
