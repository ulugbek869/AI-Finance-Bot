// src/context/AppContext.js
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as storage from '../lib/storage';
import { getAppCategories } from '../lib/categories';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [settings, setSettings] = useState({
    currency: 'UZS',
    currencySymbol: "so'm",
    language: 'uz',
    theme: 'system'
  });
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [loading, setLoading] = useState(true);

  // Initialize data on mount
  useEffect(() => {
    setTransactions(storage.getTransactions());
    setBudgets(storage.getBudgets());
    setSettings(storage.getSettings());
    setCategories(getAppCategories());
    setLoading(false);
  }, []);

  // Theme Sync Effect
  useEffect(() => {
    if (loading) return;
    
    const applyTheme = (theme) => {
      if (theme === 'dark' || theme === 'light') {
        document.documentElement.setAttribute('data-theme', theme);
      } else {
        // System preference
        if (window.Telegram?.WebApp?.colorScheme) {
          document.documentElement.setAttribute('data-theme', window.Telegram.WebApp.colorScheme);
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
        }
      };
      
      window.Telegram?.WebApp?.onEvent('themeChanged', handleTelegramThemeChange);

      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
        window.Telegram?.WebApp?.offEvent('themeChanged', handleTelegramThemeChange);
      };
    }
  }, [settings.theme, loading]);

  const addTransaction = (tx) => {
    const newTx = {
      id: 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
      type: tx.type, // 'income' | 'expense'
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
  };

  const deleteTransaction = (id) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    storage.saveTransactions(updated);
  };

  const updateTransaction = (id, updates) => {
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
  };

  const updateBudget = (categoryId, amount) => {
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
  };

  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    storage.saveSettings(updated);
  };

  const resetAllData = () => {
    storage.clearAll();
    setTransactions([]);
    setBudgets([]);
    setSettings({
      currency: 'UZS',
      currencySymbol: "so'm",
      language: 'uz',
      theme: 'system'
    });
    setCategories(getAppCategories());
  };

  const importAllData = (jsonString) => {
    const result = storage.importData(jsonString);
    if (result.success) {
      setTransactions(storage.getTransactions());
      setBudgets(storage.getBudgets());
      setSettings(storage.getSettings());
      setCategories(getAppCategories());
    }
    return result;
  };

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
