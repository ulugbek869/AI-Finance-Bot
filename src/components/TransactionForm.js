// src/components/TransactionForm.js
'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../lib/telegram';
import { getCategoryName, t } from '../lib/i18n';

export default function TransactionForm({ onSubmit, initialData = null }) {
  const { categories, settings } = useApp();
  const [type, setType] = useState(() => initialData?.type || 'expense');
  const [amount, setAmount] = useState(() => initialData?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState(() => initialData?.categoryId || '');
  const [note, setNote] = useState(() => initialData?.note || '');
  const [date, setDate] = useState(() => initialData?.date ? initialData.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const language = settings.language || 'uz';

  // Set default category if not selected or categories load
  useEffect(() => {
    if (!categoryId) {
      const currentCats = type === 'expense' ? categories.expense : categories.income;
      if (currentCats && currentCats.length > 0) {
        setCategoryId(currentCats[0].id);
      }
    }
  }, [categories, type, categoryId]);

  // Adjust category selection when type changes
  const handleTypeChange = (newType) => {
    setType(newType);
    triggerHaptic('light');
    const currentCats = newType === 'expense' ? categories.expense : categories.income;
    if (currentCats && currentCats.length > 0) {
      setCategoryId(currentCats[0].id);
    }
  };

  const handleCategorySelect = (id) => {
    setCategoryId(id);
    triggerHaptic('selection');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      triggerHaptic('error');
      alert(t(language, 'validAmount'));
      return;
    }
    if (!categoryId) {
      triggerHaptic('error');
      alert(t(language, 'selectCategory'));
      return;
    }

    triggerHaptic('success');
    onSubmit({
      type,
      amount: parseFloat(amount),
      categoryId,
      note,
      date
    });

    // Reset if not editing
    if (!initialData) {
      setAmount('');
      setNote('');
      setDate(new Date().toISOString().slice(0, 10));
    }
  };

  const currentCats = type === 'expense' ? categories.expense : categories.income;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-md">
      {/* Type Toggle */}
      <div className="type-selector">
        <button
          type="button"
          onClick={() => handleTypeChange('expense')}
          className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
        >
          💸 {t(language, 'expense')}
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`type-btn ${type === 'income' ? 'active income' : ''}`}
        >
          💰 {t(language, 'income')}
        </button>
      </div>

      {/* Amount Input */}
      <div className="form-group">
        <label className="form-label text-center">{t(language, 'amount', { currency: settings.currencySymbol })}</label>
        <input
          type="number"
          inputMode="decimal"
          pattern="[0-9]*"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="form-input form-input-amount"
          required
          autoFocus
        />
      </div>

      {/* Category Selection Grid */}
      <div className="form-group">
        <label className="form-label">{t(language, 'category')}</label>
        <div className="category-grid">
          {currentCats.map((cat) => (
            <div
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`category-chip ${categoryId === cat.id ? 'selected' : ''}`}
              style={categoryId === cat.id ? { borderColor: cat.color, backgroundColor: `${cat.color}15` } : {}}
            >
              <span className="category-chip-icon">{cat.icon}</span>
              <span className="category-chip-label">{getCategoryName(cat, language)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Date Picker */}
      <div className="form-group">
        <label className="form-label">{t(language, 'date')}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="form-input"
          required
        />
      </div>

      {/* Note Input */}
      <div className="form-group">
        <label className="form-label">{t(language, 'note')}</label>
        <input
          type="text"
          placeholder={t(language, 'notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="form-input"
        />
      </div>

      {/* Submit Button */}
      <button 
        type="submit" 
        className={`btn ${type === 'expense' ? 'btn-expense' : 'btn-income'}`}
      >
        {t(language, 'save')}
      </button>
    </form>
  );
}
