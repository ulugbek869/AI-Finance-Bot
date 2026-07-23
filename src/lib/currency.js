export const SUPPORTED_CURRENCIES = [
  { code: 'UZS', name: "O'zbek so'mi", symbol: 'sum' },
  { code: 'USD', name: 'AQSH dollari', symbol: '$' },
  { code: 'EUR', name: 'Yevro', symbol: 'EUR' },
  { code: 'RUB', name: 'Rossiya rubli', symbol: 'RUB' },
];

const WHOLE_UNIT_CURRENCIES = new Set(['UZS', 'JPY', 'KRW', 'VND']);

export function convertCurrencyAmount(amount, rate, targetCurrency) {
  const converted = Number(amount) * rate;
  if (!Number.isFinite(converted)) return null;

  const decimals = WHOLE_UNIT_CURRENCIES.has(targetCurrency) ? 0 : 2;
  const multiplier = 10 ** decimals;
  return Math.round((converted + Number.EPSILON) * multiplier) / multiplier;
}
