import { NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.0-flash';

function buildSystemPrompt(context) {
  const lines = [
    "Siz AI Finance Bot ilovasining shaxsiy moliyaviy maslahatchisisiz.",
    "Foydalanuvchi bilan o'zbek tilida, do'stona va tushunarli javob bering.",
    "Faqat berilgan moliyaviy ma'lumotlar asosida maslahat bering; taxmin qilmang.",
    "Javoblarni qisqa va amaliy qiling. Kerak bo'lsa ro'yxat va raqamlardan foydalaning.",
    "Markdown formatidan (**qalin**, ro'yxatlar) foydalanishingiz mumkin.",
    '',
    'Foydalanuvchi moliyaviy ma\'lumotlari:',
    `- Valyuta: ${context.currency}`,
    `- Balans: ${context.balance}`,
    `- Jami daromad: ${context.totalIncome}`,
    `- Jami xarajat: ${context.totalExpense}`,
    `- Tranzaksiyalar soni: ${context.transactionCount}`,
  ];

  if (context.topCategories?.length) {
    lines.push('', "Eng ko'p xarajat qilingan kategoriyalar:");
    context.topCategories.forEach((cat, i) => {
      lines.push(`${i + 1}. ${cat.icon} ${cat.name}: ${cat.amount} ${context.currency}`);
    });
  }

  if (context.budgetStatus?.length) {
    lines.push('', 'Byudjet holati:');
    context.budgetStatus.forEach((b) => {
      lines.push(
        `- ${b.icon} ${b.category}: ${b.spent}/${b.limit} ${context.currency} (${b.percent}%)`
      );
    });
  } else {
    lines.push('', "Byudjet limitlari hali o'rnatilmagan.");
  }

  if (context.recentTransactions?.length) {
    lines.push('', 'So\'nggi tranzaksiyalar:');
    context.recentTransactions.forEach((t) => {
      const sign = t.type === 'income' ? '+' : '-';
      lines.push(
        `- ${t.date}: ${sign}${t.amount} ${context.currency} (${t.category})${t.note ? ` — ${t.note}` : ''}`
      );
    });
  }

  return lines.join('\n');
}

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI API kaliti sozlanmagan." }, { status: 500 });
    }

    const { message, context, history } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Xabar bo'sh bo'lishi mumkin emas." }, { status: 400 });
    }

    const contents = [];

    if (Array.isArray(history)) {
      history.slice(-6).forEach((msg) => {
        if (!msg?.text?.trim()) return;
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(context || {}) }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini API xatoligi:', response.status, errBody);
      return NextResponse.json(
        { error: 'AI hozir javob bera olmadi. Keyinroq qayta urinib ko\'ring.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: 'AI bo\'sh javob qaytardi.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI route xatoligi:', error);
    return NextResponse.json({ error: 'Server xatoligi yuz berdi.' }, { status: 500 });
  }
}
