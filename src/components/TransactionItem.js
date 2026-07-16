// src/components/TransactionItem.js
'use client';
import { findCategoryById } from '../lib/categories';
import { useApp } from '../context/AppContext';
import { Trash2 } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

export default function TransactionItem({ transaction, onDelete }) {
  const { settings } = useApp();
  const category = findCategoryById(transaction.categoryId);

  const formattedAmount = new Intl.NumberFormat('uz-UZ').format(transaction.amount);
  const isIncome = transaction.type === 'income';

  // Format Date to local readable string (e.g., 16-Iyul, 2026)
  const formatDate = (dateStr) => {
    try {
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // Avoid triggering parent click
    if (confirm('Ushbu tranzaksiyani o\'chirib tashlamoqchimisiz?')) {
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
        <div className="transaction-category">{category?.name || 'Boshqa'}</div>
        <div className="transaction-note">{transaction.note || category?.name || 'Izohsiz'}</div>
      </div>

      {/* Amount and Action */}
      <div className="flex items-center gap-sm">
        <div className="flex flex-col items-end">
          <span className={`transaction-amount ${isIncome ? 'income' : 'expense'}`}>
            {isIncome ? '+' : '-'}{formattedAmount} {settings.currencySymbol}
          </span>
          <span className="transaction-date">{formatDate(transaction.date)}</span>
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
