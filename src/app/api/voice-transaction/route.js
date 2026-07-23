import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];
const MAX_AUDIO_BASE64_LENGTH = 12_000_000;
const MAX_TRANSCRIPT_LENGTH = 1_000;
// Keep a separate deadline for every fallback model. The route deadline has
// enough room for both attempts plus request parsing/response serialization.
const MODEL_TIMEOUT_MS = 12_000;
const REQUEST_TIMEOUT_MS = MODELS.length * MODEL_TIMEOUT_MS + 6_000;

function getCategories(categories, type) {
  if (!categories || !Array.isArray(categories[type])) return [];

  return categories[type]
    .filter((category) => typeof category?.id === 'string' && typeof category?.name === 'string')
    .slice(0, 30)
    .map(({ id, name }) => ({ id, name }));
}

function extractJson(text) {
  const candidate = text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('uz-UZ')
    .replace(/[ʻʼ‘’'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXPENSE_CATEGORY_KEYWORDS = [
  ['transport', ['taksi', 'taxi', 'metro', 'avtobus', 'bus', 'yol kira', 'benzin', 'yoqilgi', 'zapravka', 'parking']],
  ['grocery', ['oziq ovqat', 'supermarket', 'market', 'bozor']],
  ['food', ['ovqat', 'tushlik', 'nonushta', 'kechki ovqat', 'kafe', 'cafe', 'restoran', 'oshxona']],
  ['utilities', ['kommunal', 'elektr', 'gaz', 'suv', 'svet']],
  ['phone', ['telefon', 'mobil', 'internet', 'aloqa']],
  ['home', ['ijara', 'kvartira', 'uy joy', 'remont']],
  ['health', ['dori', 'dorixona', 'shifokor', 'kasalxona']],
  ['education', ['kurs', 'talim', 'kitob', 'maktab']],
  ['clothing', ['kiyim', 'poyabzal']],
  ['entertainment', ['kino', 'oyin', 'konsert']],
  ['gift', ['sovga']],
  ['other_expense', ['sigaret', 'tamaki', 'ozim uchun', 'shaxsiy xarajat', 'boshqa xarajat']],
];

function chooseCategory(parsed, categories, type) {
  const available = getCategories(categories, type);
  if (!available.length) return null;

  const text = normalizeText(`${parsed.transcript || ''} ${parsed.note || ''}`);
  if (type === 'expense' && text) {
    for (const [id, keywords] of EXPENSE_CATEGORY_KEYWORDS) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        const matchedCategory = available.find((category) => category.id === id);
        if (matchedCategory) return matchedCategory.id;
      }
    }
  }

  const requestedCategory = normalizeText(parsed.categoryId);
  const categoryMatch = available.find((category) =>
    normalizeText(category.id) === requestedCategory || normalizeText(category.name) === requestedCategory
  );
  if (categoryMatch) return categoryMatch.id;

  return available.find((category) => category.id === `other_${type}`)?.id || available[0].id;
}

function buildTransactionPrompt(categories, currencySymbol) {
  const expenseCategories = getCategories(categories, 'expense');
  const incomeCategories = getCategories(categories, 'income');

  return [
    "Foydalanuvchining o'zbekcha ovozli xabari yoki nutq matnidan bitta moliyaviy tranzaksiya ajrating.",
    "Agar audio yuborilgan bo'lsa, avval uni o'zbekcha matnga aniq aylantiring va transcript maydoniga yozing.",
    "Faqat JSON qaytaring; Markdown yoki boshqa matn yozmang.",
    "Agar summa yoki daromad/xarajat turi aniq aytilmagan bo'lsa, type va amount uchun null qaytaring.",
    "Summani raqam sifatida qaytaring; minglik qiymatlarni to'g'ri tushuning. Taxmin qilmang.",
    "Izohga foydalanuvchi aytgan sabab yoki manbani qisqa yozing.",
    "categoryId faqat berilgan kategoriyalardagi aynan id bo'lishi kerak; kategoriya nomini yoki yangi id ni yozmang.",
    "Taksi, metro, avtobus va benzin — transport. Oziq-ovqat yoki kafe — food/grocery. Noma'lum, shaxsiy yoki sigaret kabi xarajatlar — other_expense.",
    'JSON shakli: {"transcript":"...","type":"expense"|"income"|null,"amount":number|null,"categoryId":"..."|null,"note":"..."}.',
    `Valyuta belgisi: ${typeof currencySymbol === 'string' ? currencySymbol.slice(0, 12) : ''}.`,
    `Xarajat kategoriyalari: ${JSON.stringify(expenseCategories)}.`,
    `Daromad kategoriyalari: ${JSON.stringify(incomeCategories)}.`,
  ].join('\n');
}

async function askGemini({ apiKey, model, audioBase64, mimeType, transcript, prompt, signal }) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, MODEL_TIMEOUT_MS);
  signal.addEventListener('abort', abort, { once: true });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: audioBase64
              ? [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: audioBase64 } },
                ]
              : [{ text: `${prompt}\n\nFoydalanuvchining nutqdan olingan matni: ${transcript}` }],
          }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) return { ok: false, status: response.status };

    // Read the response while this model's timer is still active. Otherwise a
    // stalled response body could consume the next model's time budget.
    return { ok: true, result: await response.json() };
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

async function getGeminiJson({ apiKey, audioBase64, mimeType, transcript, prompt, signal }) {
  for (const model of MODELS) {
    try {
      if (signal.aborted) return null;
      const response = await askGemini({
        apiKey,
        model,
        audioBase64,
        mimeType,
        transcript,
        prompt,
        signal,
      });
      if (!response.ok) {
        if (![404, 408, 429, 500, 502, 503, 504].includes(response.status)) return null;
        continue;
      }

      const answer = response.result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();
      const parsed = answer ? extractJson(answer) : null;
      if (parsed) return parsed;
    } catch {
      // A fallback model is tried unless the single request deadline has elapsed.
    }
  }

  return null;
}

function isTransactionResult(parsed) {
  return parsed
    && typeof parsed === 'object'
    && !Array.isArray(parsed)
    // A valid no-transaction result has amount/type set to null. Responses
    // without either field are malformed AI/API responses, not unheard audio.
    && ('type' in parsed || 'amount' in parsed);
}

export async function POST(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortForDisconnect = () => controller.abort();
  request.signal.addEventListener('abort', abortForDisconnect, { once: true });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI API kaliti sozlanmagan.' }, { status: 500 });

    const { audioBase64, mimeType, transcript, categories, currencySymbol } = await request.json();
    const hasTranscript = typeof transcript === 'string' && transcript.trim().length > 0;
    const hasAudio = typeof audioBase64 === 'string' && audioBase64.length > 0;

    if (!hasTranscript && !hasAudio) {
      return NextResponse.json({ error: 'Ovozli xabar yoki nutq matni yuborilmadi.' }, { status: 400 });
    }
    if (hasAudio && audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Ovozli xabar juda katta yoki noto‘g‘ri.' }, { status: 400 });
    }
    if (hasAudio && (typeof mimeType !== 'string' || !mimeType.startsWith('audio/'))) {
      return NextResponse.json({ error: 'Ovoz formati qo‘llab-quvvatlanmaydi.' }, { status: 400 });
    }
    if (hasTranscript && transcript.trim().length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json({ error: 'Nutq matni juda uzun.' }, { status: 400 });
    }

    const cleanTranscript = hasTranscript ? transcript.trim().slice(0, MAX_TRANSCRIPT_LENGTH) : null;
    const parsed = await getGeminiJson({
      apiKey,
      audioBase64: hasAudio ? audioBase64 : null,
      mimeType,
      transcript: cleanTranscript,
      prompt: buildTransactionPrompt(categories, currencySymbol),
      signal: controller.signal,
    });
    const recognizedTranscript = typeof parsed?.transcript === 'string' && parsed.transcript.trim()
      ? parsed.transcript.trim().slice(0, MAX_TRANSCRIPT_LENGTH)
      : cleanTranscript || '';

    const type = parsed?.type;
    const amount = Number(parsed?.amount);
    if (!isTransactionResult(parsed)) {
      return NextResponse.json(
        { error: "Ovoz tahlili vaqtida AI javob bermadi. Qayta urinib ko'ring." },
        { status: 502 }
      );
    }
    if (!['expense', 'income'].includes(type) || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Summa yoki daromad/xarajat turi aniq eshitilmadi. Masalan: “Taksiga 25 ming so‘m sarfladim.”' },
        { status: 422 }
      );
    }

    const categoryId = chooseCategory(parsed, categories, type);
    if (!categoryId) {
      return NextResponse.json({ error: 'Kategoriyalar hali yuklanmagan. Qayta urinib ko‘ring.' }, { status: 422 });
    }

    return NextResponse.json({
      transaction: {
        type,
        amount: Math.round(amount * 100) / 100,
        categoryId,
        note: typeof parsed.note === 'string' && parsed.note.trim()
          ? parsed.note.slice(0, 200)
          : recognizedTranscript.slice(0, 200),
      },
      transcript: recognizedTranscript,
    });
  } catch (error) {
    console.error('Voice transaction route error:', error.name);
    return NextResponse.json(
      { error: 'Ovozli xabarni tahlil qilib bo‘lmadi. Keyinroq qayta urinib ko‘ring.' },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', abortForDisconnect);
  }
}
