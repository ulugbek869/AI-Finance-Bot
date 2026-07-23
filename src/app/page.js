// src/app/page.js
'use client';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import TransactionItem from '../components/TransactionItem';
import Toast from '../components/Toast';
import VoiceTransactionButton from '../components/VoiceTransactionButton';
import { triggerHaptic } from '../lib/telegram';
import { getLocale, t } from '../lib/i18n';

export default function Dashboard() {
  const { 
    transactions, 
    balance, 
    totalIncome, 
    totalExpense, 
    addTransaction, 
    deleteTransaction,
    settings 
  } = useApp();

  const { userName } = useTelegram();
  const [modalOpen, setModalOpen] = useState(false);
  const [formType, setFormType] = useState('expense'); // 'income' | 'expense'
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const language = settings.language || 'uz';

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleQuickAction = (type) => {
    setFormType(type);
    setModalOpen(true);
    triggerHaptic('light');
  };

  const handleFormSubmit = (data) => {
    addTransaction(data);
    setModalOpen(false);
    showToast(
      data.type === 'income' 
        ? t(language, 'incomeAdded')
        : t(language, 'expenseAdded')
    );
  };

  // Get last 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  const formattedBalance = new Intl.NumberFormat(getLocale(language)).format(Math.abs(balance));
  const formattedIncome = new Intl.NumberFormat(getLocale(language)).format(totalIncome);
  const formattedExpense = new Intl.NumberFormat(getLocale(language)).format(totalExpense);

  return (
    <>
      {/* Header */}
      <header className="view-header">
        <h1>{userName ? t(language, 'welcome', { name: userName }) : t(language, 'welcomeGuest')}</h1>
        <p>{t(language, 'dashboardSubtitle')}</p>
      </header>

      {/* Balance Box */}
      <section className="balance-section">
        <div className="balance-label">{t(language, 'currentBalance')}</div>
        <div className="balance-amount">
          {balance >= 0 ? '' : '-'}{formattedBalance} 
          <span className="balance-currency">{settings.currencySymbol}</span>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="summary-cards">
        <div className="card summary-card card-gradient-income">
          <div className="summary-icon">📈</div>
          <div className="summary-label">{t(language, 'incomes')}</div>
          <div className="summary-value">+{formattedIncome} {settings.currencySymbol}</div>
        </div>
        
        <div className="card summary-card card-gradient-expense">
          <div className="summary-icon">📉</div>
          <div className="summary-label">{t(language, 'expenses')}</div>
          <div className="summary-value">-{formattedExpense} {settings.currencySymbol}</div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <button 
          onClick={() => handleQuickAction('expense')}
          className="quick-action-btn expense"
        >
          <div className="action-icon text-expense"><ArrowDownRight size={20} /></div>
          <span>{t(language, 'addExpense')}</span>
        </button>
        
        <button 
          onClick={() => handleQuickAction('income')}
          className="quick-action-btn income"
        >
          <div className="action-icon text-income"><ArrowUpRight size={20} /></div>
          <span>{t(language, 'addIncome')}</span>
        </button>
      </section>

      {/* Recent Transactions List */}
      <section className="transactions-section">
        <div className="section-header">
          <h2 className="section-title">{t(language, 'recentTransactions')}</h2>
          {transactions.length > 5 && (
            <a href="/transactions" className="section-link">{t(language, 'viewAll')}</a>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">💸</div>
            <h3 className="empty-state-title">{t(language, 'noTransactions')}</h3>
            <p className="empty-state-text">{t(language, 'noTransactionsDescription')}</p>
          </div>
        ) : (
          <div className="transaction-list">
            {recentTransactions.map((tx) => (
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
        )}
      </section>

      <VoiceTransactionButton onNotify={showToast} />

      {/* Modal form for adding transactions */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={formType === 'income' ? t(language, 'addIncome') : t(language, 'addExpense')}
      >
        <TransactionForm 
          onSubmit={handleFormSubmit} 
          initialData={{ type: formType, amount: '', categoryId: '', note: '' }} 
        />
      </Modal>

      {/* Toast notifications */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />

      {/* Navigation */}
      <BottomNav />
    </>
  );
}
