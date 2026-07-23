// src/lib/storage.js

const KEYS = {
  TRANSACTIONS: 'afb_transactions',
  BUDGETS: 'afb_budgets',
  CATEGORIES: 'afb_categories',
  SETTINGS: 'afb_settings',
  ONBOARDED: 'afb_onboarded'
};

const isBrowser = typeof window !== 'undefined';

const save = (key, data) => {
  if (!isBrowser) return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('[Storage] Save error:', e);
    return false;
  }
};

const load = (key, defaultValue = null) => {
  if (!isBrowser) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('[Storage] Load error:', e);
    return defaultValue;
  }
};

const remove = (key) => {
  if (!isBrowser) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('[Storage] Remove error:', e);
    return false;
  }
};

export const getTransactions = () => load(KEYS.TRANSACTIONS, []);
export const saveTransactions = (txs) => save(KEYS.TRANSACTIONS, txs);

export const getBudgets = () => load(KEYS.BUDGETS, []);
export const saveBudgets = (budgets) => save(KEYS.BUDGETS, budgets);

export const getCategories = () => load(KEYS.CATEGORIES, null);
export const saveCategories = (cats) => save(KEYS.CATEGORIES, cats);

export const getSettings = () => load(KEYS.SETTINGS, {
  currency: 'UZS',
  currencySymbol: 'sum',
  language: 'uz',
  theme: 'system'
});
export const saveSettings = (settings) => save(KEYS.SETTINGS, settings);

export const isOnboarded = () => load(KEYS.ONBOARDED, false);
export const setOnboarded = () => save(KEYS.ONBOARDED, true);

export const exportAllData = () => {
  return JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    transactions: getTransactions(),
    budgets: getBudgets(),
    categories: getCategories(),
    settings: getSettings()
  }, null, 2);
};

export const importData = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    if (!data.version) throw new Error('Invalid format');
    if (data.transactions) saveTransactions(data.transactions);
    if (data.budgets) saveBudgets(data.budgets);
    if (data.categories) saveCategories(data.categories);
    if (data.settings) saveSettings(data.settings);
    return { success: true, message: "Muvaffaqiyatli yuklandi!" };
  } catch (e) {
    console.error('[Storage] Import error:', e);
    return { success: false, message: "Xatolik: noto'g'ri fayl formati" };
  }
};

export const clearAll = () => {
  Object.values(KEYS).forEach(k => remove(k));
};
