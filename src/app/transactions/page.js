// src/app/transactions/page.js
'use client';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import TransactionItem from '../../components/TransactionItem';
import Toast from '../../components/Toast';
import { triggerHaptic } from '../../lib/telegram';
import { getLocale, t } from '../../lib/i18n';

export default function TransactionsPage() {
  const { transactions, deleteTransaction, settings } = useApp();
  const [filter, setFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const language = settings.language || 'uz';

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    triggerHaptic('selection');
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  // Calculate sum of currently filtered transactions
  const filteredSum = filteredTransactions.reduce((sum, tx) => {
    return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
  }, 0);

  // Group filtered transactions by date string
  const groupTransactionsByDate = (txs) => {
    const groups = {};
    txs.forEach(tx => {
      const dateKey = tx.date ? tx.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  };

  const dateGroups = groupTransactionsByDate(filteredTransactions);

  const formatHeaderDate = (dateStr) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      
      if (dateStr === today) return t(language, 'today');
      if (dateStr === yesterday) return t(language, 'yesterday');

      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString(getLocale(language), { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formattedSum = new Intl.NumberFormat(getLocale(language)).format(Math.abs(filteredSum));

  return (
    <>
      <header className="view-header">
        <h1>{t(language, 'transactionsTitle')}</h1>
        <p>{t(language, 'transactionsSubtitle')}</p>
      </header>

      {/* Filter Bar */}
      <section className="filter-bar">
        <div 
          onClick={() => handleFilterChange('all')}
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
        >
          🔍 {t(language, 'all')}
        </div>
        <div 
          onClick={() => handleFilterChange('expense')}
          className={`filter-chip ${filter === 'expense' ? 'active' : ''}`}
        >
          💸 {t(language, 'expenses')}
        </div>
        <div 
          onClick={() => handleFilterChange('income')}
          className={`filter-chip ${filter === 'income' ? 'active' : ''}`}
        >
          💰 {t(language, 'incomes')}
        </div>
      </section>

      {/* Filtered Balance Summary */}
      <section className="card card-sm mb-md" style={{ marginBottom: '16px' }}>
        <div className="flex justify-between items-center">
          <span className="text-secondary" style={{ fontSize: '14px', fontWeight: '500' }}>
            {filter === 'all' ? t(language, 'filteredBalance') : filter === 'expense' ? t(language, 'totalExpense') : t(language, 'totalIncome')}
          </span>
          <span className={`transaction-amount ${filteredSum >= 0 ? 'income' : 'expense'}`} style={{ fontSize: '18px', fontWeight: '700' }}>
            {filteredSum >= 0 ? '' : '-'}{formattedSum} {settings.currencySymbol}
          </span>
        </div>
      </section>

      {/* Transactions List Grouped by Date */}
      <section className="transactions-list-section">
        {dateGroups.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">📂</div>
            <h3 className="empty-state-title">{t(language, 'noData')}</h3>
            <p className="empty-state-text">{t(language, 'noDataDescription')}</p>
          </div>
        ) : (
          dateGroups.map(([date, txs]) => (
            <div key={date} className="date-group">
              <div className="date-group-header">{formatHeaderDate(date)}</div>
              <div className="transaction-list">
                {txs.map((tx) => (
                  <TransactionItem 
                    key={tx.id} 
                    transaction={tx} 
                    onDelete={(id) => {
                      deleteTransaction(id);
                      showToast(t(language, 'transactionDeleted'), 'error');
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />

      <BottomNav />
    </>
  );
}
