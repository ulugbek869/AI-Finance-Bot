// src/components/TransactionForm.js
'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../lib/telegram';

export default function TransactionForm({ onSubmit, initialData = null }) {
  const { categories, settings } = useApp();
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCategoryId(initialData.categoryId);
      setNote(initialData.note || '');
      setDate(initialData.date ? initialData.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    } else {
      // Set default category
      const currentCats = type === 'expense' ? categories.expense : categories.income;
      if (currentCats && currentCats.length > 0) {
        setCategoryId(currentCats[0].id);
      }
    }
  }, [initialData, categories, type]);

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
      alert('Iltimos, to\'g\'ri summa kiriting');
      return;
    }
    if (!categoryId) {
      triggerHaptic('error');
      alert('Iltimos, kategoriya tanlang');
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
          💸 Xarajat
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`type-btn ${type === 'income' ? 'active income' : ''}`}
        >
          💰 Daromad
        </button>
      </div>

      {/* Amount Input */}
      <div className="form-group">
        <label className="form-label text-center">Summa ({settings.currencySymbol})</label>
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
        <label className="form-label">Kategoriya</label>
        <div className="category-grid">
          {currentCats.map((cat) => (
            <div
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`category-chip ${categoryId === cat.id ? 'selected' : ''}`}
              style={categoryId === cat.id ? { borderColor: cat.color, backgroundColor: `${cat.color}15` } : {}}
            >
              <span className="category-chip-icon">{cat.icon}</span>
              <span className="category-chip-label">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Date Picker */}
      <div className="form-group">
        <label className="form-label">Sana</label>
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
        <label className="form-label">Izoh</label>
        <input
          type="text"
          placeholder="Nima uchun ligini yozing..."
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
        Saqlash
      </button>
    </form>
  );
}
