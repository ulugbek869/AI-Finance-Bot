// src/components/TransactionItem.js
'use client';
import { findCategoryById } from '../lib/categories';
import { useApp } from '../context/AppContext';
import { Trash2 } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';
import { getCategoryName, getLocale, t } from '../lib/i18n';

export default function TransactionItem({ transaction, onDelete }) {
  const { settings } = useApp();
  const category = findCategoryById(transaction.categoryId);
  const language = settings.language || 'uz';

  const formattedAmount = new Intl.NumberFormat(getLocale(language)).format(transaction.amount);
  const isIncome = transaction.type === 'income';

  const pad = (n) => String(n).padStart(2, '0');

  // Har bir amal uchun YYYY-MM-DD-HH:mm formatidagi sana va vaqtni hosil qiladi
  const formatDate = (tx) => {
    try {
      const source = tx.createdAt || tx.date;
      if (!source) return '';

      if (!tx.createdAt && typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
        return `${tx.date}-00:00`;
      }

      const d = new Date(source);
      if (Number.isNaN(d.getTime())) return String(source);

      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());

      return `${year}-${month}-${day}-${hours}:${minutes}`;
    } catch (e) {
      return String(tx.date || tx.createdAt || '');
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // Avoid triggering parent click
    if (confirm(t(language, 'deleteTransactionConfirm'))) {
      triggerHaptic('warning');
      onDelete(transaction.id);
    }
  };

  return (
    <div className="transaction-item">
      {/* Icon */}
      <div 
        className={`transaction-icon ${isIncome ? 'income' : 'expense'}`}
        style={{ color: category?.color, backgroundColor: `${category?.color}15` }}
      >
        {category?.icon || '📌'}
      </div>

      {/* Details */}
      <div className="transaction-details">
        <div className="transaction-category">{getCategoryName(category, language)}</div>
        <div className="transaction-note">{transaction.note || getCategoryName(category, language) || t(language, 'noNote')}</div>
      </div>

      {/* Amount and Action */}
      <div className="flex items-center gap-sm">
        <div className="flex flex-col items-end">
          <span className={`transaction-amount ${isIncome ? 'income' : 'expense'}`}>
            {isIncome ? '+' : '-'}{formattedAmount} {settings.currencySymbol}
          </span>
          <span className="transaction-date">
            {formatDate(transaction)}
          </span>
        </div>
        
        {/* Delete button */}
        <button 
          onClick={handleDelete}
          className="text-secondary" 
          style={{ padding: '4px', borderRadius: '4px' }}
        >
          <Trash2 size={16} className="text-expense" style={{ opacity: 0.7 }} />
        </button>
      </div>
    </div>
  );
}
