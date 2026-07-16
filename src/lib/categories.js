// src/lib/categories.js
import { getCategories, saveCategories } from './storage';

export const DEFAULT_CATEGORIES = {
  expense: [
    { id: 'food', icon: '🍔', name: 'Ovqat', color: '#ff6b6b' },
    { id: 'transport', icon: '🚕', name: 'Transport', color: '#ffd93d' },
    { id: 'home', icon: '🏠', name: 'Uy-joy', color: '#6c9ce9' },
    { id: 'health', icon: '💊', name: "Sog'liq", color: '#00c9a7' },
    { id: 'entertainment', icon: '🎮', name: "Ko'ngilochar", color: '#a855f7' },
    { id: 'clothing', icon: '👕', name: 'Kiyim', color: '#f97316' },
    { id: 'education', icon: '📚', name: "Ta'lim", color: '#3b82f6' },
    { id: 'utilities', icon: '💡', name: 'Kommunal', color: '#eab308' },
    { id: 'phone', icon: '📱', name: 'Aloqa', color: '#14b8a6' },
    { id: 'gift', icon: '🎁', name: "Sovg'a", color: '#ec4899' },
    { id: 'grocery', icon: '🛒', name: 'Oziq-ovqat', color: '#84cc16' },
    { id: 'other_expense', icon: '📌', name: 'Boshqa', color: '#8b8b9e' }
  ],
  income: [
    { id: 'salary', icon: '💼', name: 'Ish haqi', color: '#00c9a7' },
    { id: 'freelance', icon: '💻', name: 'Freelance', color: '#667eea' },
    { id: 'investment', icon: '📈', name: 'Investitsiya', color: '#f59e0b' },
    { id: 'gift_income', icon: '🎁', name: "Sovg'a", color: '#ec4899' },
    { id: 'business', icon: '🏪', name: 'Biznes', color: '#8b5cf6' },
    { id: 'other_income', icon: '💵', name: 'Boshqa', color: '#8b8b9e' }
  ]
};

export const getAppCategories = () => {
  const saved = getCategories();
  if (saved) return saved;
  saveCategories(DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
};

export const findCategoryById = (id) => {
  const cats = getAppCategories();
  let found = cats.expense.find(c => c.id === id);
  if (found) return { ...found, type: 'expense' };
  found = cats.income.find(c => c.id === id);
  if (found) return { ...found, type: 'income' };
  return null;
};
