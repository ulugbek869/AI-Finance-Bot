// src/context/AppContext.js
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as storage from '../lib/storage';
import * as db from '../lib/db';
import { getAppCategories } from '../lib/categories';
import { applyTelegramTheme } from '../lib/telegram';
import { convertCurrencyAmount } from '../lib/currency';

const AppContext = createContext(null);

const defaultSettings = {
  currency: 'UZS',
  currencySymbol: 'sum',
  language: 'uz',
  theme: 'system'
};

function normalizeCurrencySymbol(settings) {
  const legacyUzbekSomSymbols = ["so'm", 'so‘m', 'soʻm'];
  if (settings?.currency === 'UZS' && legacyUzbekSomSymbols.includes(settings.currencySymbol)) {
    return { ...settings, currencySymbol: 'sum' };
  }
  return settings;
}

// Sinxron ravishda localStorage dan settings ni o'qish (theme flash oldini oladi)
function getInitialSettings() {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const stored = localStorage.getItem('afb_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return normalizeCurrencySymbol({ ...defaultSettings, ...parsed });
    }
  } catch (e) {}
  return defaultSettings;
}

export function AppProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [settings, setSettings] = useState(getInitialSettings);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [loading, setLoading] = useState(true);
  const [telegramId, setTelegramId] = useState(null);
  const [useSupabase, setUseSupabase] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    const initData = async () => {
      try {
        // Telegram user ma'lumotlarini olish
        let tgId = null;
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
          tgId = window.Telegram.WebApp.initDataUnsafe.user.id;
          setTelegramId(tgId);
        }

        // Supabase mavjudligini tekshirish
        const supabaseReady = db.isSupabaseAvailable() && tgId;

        if (supabaseReady) {
          setUseSupabase(true);

          // Foydalanuvchini yaratish/topish
          const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
          await db.getOrCreateUser(tgId, tgUser.first_name || '', tgUser.username || '');

          // Ma'lumotlarni Supabase dan olish
          const [dbTransactions, dbBudgets, dbSettings] = await Promise.all([
            db.fetchTransactions(tgId),
            db.fetchBudgets(tgId),
            db.fetchUserSettings(tgId),
          ]);

          setTransactions(dbTransactions);
          setBudgets(dbBudgets);
          if (dbSettings) {
            setSettings(normalizeCurrencySymbol(dbSettings));
          }

          console.log('[App] Supabase dan ma\'lumotlar yuklandi ✅');
        } else {
          // Fallback: localStorage dan olish
          setTransactions(storage.getTransactions());
          setBudgets(storage.getBudgets());
          setSettings(normalizeCurrencySymbol(storage.getSettings()));
          console.log('[App] localStorage dan ma\'lumotlar yuklandi (fallback)');
        }

        setCategories(getAppCategories());
      } catch (e) {
        console.error('[App] Init xatolik:', e);
        // Xatolikda localStorage ga qaytish
        setTransactions(storage.getTransactions());
        setBudgets(storage.getBudgets());
        setSettings(normalizeCurrencySymbol(storage.getSettings()));
        setCategories(getAppCategories());
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Theme Sync Effect
  useEffect(() => {
    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme-mode', theme);
      
      if (theme === 'dark' || theme === 'light') {
        document.documentElement.setAttribute('data-theme', theme);
        // Clear Telegram theme inline properties so stylesheet overrides can work
        const root = document.documentElement.style;
        root.removeProperty('--tg-theme-bg-color');
        root.removeProperty('--tg-theme-secondary-bg-color');
        root.removeProperty('--tg-theme-text-color');
        root.removeProperty('--tg-theme-hint-color');
        root.removeProperty('--tg-theme-link-color');
        root.removeProperty('--tg-theme-button-color');
        root.removeProperty('--tg-theme-button-text-color');
      } else {
        // System preference
        if (window.Telegram?.WebApp?.colorScheme) {
          document.documentElement.setAttribute('data-theme', window.Telegram.WebApp.colorScheme);
          applyTelegramTheme();
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }
      }
    };

    applyTheme(settings.theme);

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e) => {
        if (!window.Telegram?.WebApp?.colorScheme) {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);

      const handleTelegramThemeChange = () => {
        if (window.Telegram?.WebApp?.colorScheme) {
          document.documentElement.setAttribute('data-theme', window.Telegram.WebApp.colorScheme);
          applyTelegramTheme();
        }
      };
      
      window.Telegram?.WebApp?.onEvent('themeChanged', handleTelegramThemeChange);

      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
        window.Telegram?.WebApp?.offEvent('themeChanged', handleTelegramThemeChange);
      };
    }
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.lang = ['uz', 'ru', 'en'].includes(settings.language) ? settings.language : 'uz';
  }, [settings.language]);

  const addTransaction = useCallback(async (tx) => {
    if (useSupabase && telegramId) {
      // Supabase ga qo'shish
      const newTx = await db.insertTransaction(telegramId, tx);
      if (newTx) {
        setTransactions(prev => [newTx, ...prev]);
        return newTx;
      }
    }

    // Fallback: localStorage
    const newTx = {
      id: 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
      type: tx.type,
      amount: parseFloat(tx.amount),
      categoryId: tx.categoryId,
      note: tx.note || '',
      date: tx.date || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString()
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    storage.saveTransactions(updated);
    return newTx;
  }, [useSupabase, telegramId, transactions]);

  const deleteTransaction = useCallback(async (id) => {
    if (useSupabase && telegramId) {
      const success = await db.removeTransaction(id);
      if (success) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        return;
      }
    }

    // Fallback: localStorage
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    storage.saveTransactions(updated);
  }, [useSupabase, telegramId, transactions]);

  const updateTransaction = useCallback((id, updates) => {
    const updated = transactions.map(t => {
      if (t.id === id) {
        return {
          ...t,
          ...updates,
          amount: updates.amount ? parseFloat(updates.amount) : t.amount
        };
      }
      return t;
    });
    setTransactions(updated);
    storage.saveTransactions(updated);
  }, [transactions]);

  const updateBudget = useCallback(async (categoryId, amount) => {
    if (useSupabase && telegramId) {
      if (amount <= 0) {
        const success = await db.removeBudget(telegramId, categoryId);
        if (success) {
          setBudgets(prev => prev.filter(b => b.categoryId !== categoryId));
          return;
        }
      } else {
        const success = await db.upsertBudget(telegramId, categoryId, amount);
        if (success) {
          setBudgets(prev => {
            const existingIdx = prev.findIndex(b => b.categoryId === categoryId);
            if (existingIdx > -1) {
              const newBudgets = [...prev];
              newBudgets[existingIdx] = { categoryId, amount: parseFloat(amount) };
              return newBudgets;
            }
            return [...prev, { categoryId, amount: parseFloat(amount) }];
          });
          return;
        }
      }
    }

    // Fallback: localStorage
    const existingIdx = budgets.findIndex(b => b.categoryId === categoryId);
    let updated;
    if (existingIdx > -1) {
      if (amount <= 0) {
        updated = budgets.filter(b => b.categoryId !== categoryId);
      } else {
        updated = [...budgets];
        updated[existingIdx].amount = parseFloat(amount);
      }
    } else {
      if (amount > 0) {
        updated = [...budgets, { categoryId, amount: parseFloat(amount) }];
      } else {
        updated = budgets;
      }
    }
    setBudgets(updated);
    storage.saveBudgets(updated);
  }, [useSupabase, telegramId, budgets]);

  const updateSettings = useCallback(async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (useSupabase && telegramId) {
      await db.updateUserSettings(telegramId, updated);
    }

    // Har doim localStorage ga ham saqlash (fallback uchun)
    storage.saveSettings(updated);
  }, [useSupabase, telegramId, settings]);

  const convertCurrency = useCallback(async ({ currency, currencySymbol, rates }) => {
    if (currency === settings.currency) return { success: true, converted: false };

    const sourceRate = Number(rates?.[settings.currency]);
    const targetRate = Number(rates?.[currency]);
    if (!Number.isFinite(sourceRate) || !Number.isFinite(targetRate) || sourceRate <= 0 || targetRate <= 0) {
      return { success: false, message: "Tanlangan valyuta uchun kurs topilmadi." };
    }

    const conversionRate = sourceRate / targetRate;
    const convertedTransactions = transactions.map((transaction) => ({
      ...transaction,
      amount: convertCurrencyAmount(transaction.amount, conversionRate, currency),
    }));
    const convertedBudgets = budgets.map((budget) => ({
      ...budget,
      amount: convertCurrencyAmount(budget.amount, conversionRate, currency),
    }));

    if (convertedTransactions.some((item) => item.amount === null) || convertedBudgets.some((item) => item.amount === null)) {
      return { success: false, message: "Summalarni valyutaga o'tkazib bo'lmadi." };
    }

    const updatedSettings = { ...settings, currency, currencySymbol };
    if (useSupabase && telegramId) {
      const saved = await Promise.all([
        ...convertedTransactions.map((transaction) => db.updateTransactionAmount(transaction.id, transaction.amount)),
        ...convertedBudgets.map((budget) => db.upsertBudget(telegramId, budget.categoryId, budget.amount)),
        db.updateUserSettings(telegramId, updatedSettings),
      ]);
      if (saved.some((success) => !success)) {
        return { success: false, message: "Ma'lumotlar serverga saqlanmadi. Qayta urinib ko'ring." };
      }
    }

    setTransactions(convertedTransactions);
    setBudgets(convertedBudgets);
    setSettings(updatedSettings);
    storage.saveTransactions(convertedTransactions);
    storage.saveBudgets(convertedBudgets);
    storage.saveSettings(updatedSettings);

    return { success: true, converted: true, rate: conversionRate };
  }, [budgets, settings, telegramId, transactions, useSupabase]);

  const resetAllData = useCallback(async () => {
    setTransactions([]);
    setBudgets([]);

    if (useSupabase && telegramId) {
      await db.removeAllUserData(telegramId);
    }

    // "Ma'lumotlarni tozalash" moliyaviy yozuvlarni o'chiradi, ammo
    // foydalanuvchi tanlagan mavzu va asosiy valyutani saqlab qoladi.
    storage.saveTransactions([]);
    storage.saveBudgets([]);
    storage.saveSettings(settings);
  }, [useSupabase, telegramId, settings]);

  const importAllData = useCallback(async (jsonString) => {
    const result = storage.importData(jsonString);
    if (result.success) {
      const importedTxs = storage.getTransactions();
      const importedBudgets = storage.getBudgets();
      const importedSettings = storage.getSettings();

      if (useSupabase && telegramId) {
        await db.removeAllUserData(telegramId);
        await Promise.all([
          ...importedTxs.map(tx => db.insertTransaction(telegramId, tx)),
          ...importedBudgets.map(b => db.upsertBudget(telegramId, b.categoryId, b.amount)),
          db.updateUserSettings(telegramId, importedSettings)
        ]);
      }

      setTransactions(importedTxs);
      setBudgets(importedBudgets);
      setSettings(importedSettings);
      setCategories(getAppCategories());
    }
    return result;
  }, [useSupabase, telegramId]);

  // Helper getters
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <AppContext.Provider value={{
      transactions,
      budgets,
      settings,
      categories,
      loading,
      addTransaction,
      deleteTransaction,
      updateTransaction,
      updateBudget,
      updateSettings,
      convertCurrency,
      resetAllData,
      importAllData,
      totalIncome,
      totalExpense,
      balance
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
