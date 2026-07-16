// src/app/transactions/page.js
'use client';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import TransactionItem from '../../components/TransactionItem';
import Toast from '../../components/Toast';
import { triggerHaptic } from '../../lib/telegram';

export default function TransactionsPage() {
  const { transactions, deleteTransaction, settings } = useApp();
  const [filter, setFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

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
      
      if (dateStr === today) return 'Bugun';
      if (dateStr === yesterday) return 'Kecha';

      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formattedSum = new Intl.NumberFormat('uz-UZ').format(Math.abs(filteredSum));

  return (
    <>
      <header className="view-header">
        <h1>Amallar tarixi</h1>
        <p>Barcha daromad va xarajatlaringiz ro'yxati</p>
      </header>

      {/* Filter Bar */}
      <section className="filter-bar">
        <div 
          onClick={() => handleFilterChange('all')}
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
        >
          🔍 Barchasi
        </div>
        <div 
          onClick={() => handleFilterChange('expense')}
          className={`filter-chip ${filter === 'expense' ? 'active' : ''}`}
        >
          💸 Xarajatlar
        </div>
        <div 
          onClick={() => handleFilterChange('income')}
          className={`filter-chip ${filter === 'income' ? 'active' : ''}`}
        >
          💰 Daromadlar
        </div>
      </section>

      {/* Filtered Balance Summary */}
      <section className="card card-sm mb-md" style={{ marginBottom: '16px' }}>
        <div className="flex justify-between items-center">
          <span className="text-secondary" style={{ fontSize: '14px', fontWeight: '500' }}>
            {filter === 'all' ? 'Filtrlangan balans' : filter === 'expense' ? 'Jami xarajat' : 'Jami daromad'}
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
            <h3 className="empty-state-title">Ma'lumotlar mavjud emas</h3>
            <p className="empty-state-text">Tanlangan filtr bo'yicha hech qanday amal topilmadi</p>
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
                      showToast('Tranzaksiya o\'chirildi', 'error');
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
