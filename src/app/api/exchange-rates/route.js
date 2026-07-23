import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CBU_RATES_URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/';
const REQUEST_TIMEOUT_MS = 8_000;

function toNumber(value) {
  return Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
}

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CBU_RATES_URL, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`CBU ${response.status}`);

    const rows = await response.json();
    const rates = { UZS: 1 };
    let date = null;

    for (const row of Array.isArray(rows) ? rows : []) {
      const code = typeof row?.Ccy === 'string' ? row.Ccy.toUpperCase() : '';
      const rate = toNumber(row?.Rate);
      const nominal = toNumber(row?.Nominal);
      if (code && Number.isFinite(rate) && Number.isFinite(nominal) && nominal > 0) {
        rates[code] = rate / nominal;
        date ||= row.Date || null;
      }
    }

    if (!rates.USD || !rates.EUR || !rates.RUB) throw new Error('Kerakli kurslar topilmadi');

    return NextResponse.json({ rates, date, source: 'CBU' });
  } catch (error) {
    console.error('Exchange rate API error:', error.name);
    return NextResponse.json(
      { error: "Valyuta kurslarini olishning imkoni bo'lmadi. Internetni tekshirib, qayta urinib ko'ring." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
