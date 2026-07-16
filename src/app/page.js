// src/app/page.js
'use client';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { PlusCircle, ArrowUpRight, ArrowDownRight, Plus, Receipt } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import TransactionItem from '../components/TransactionItem';
import Toast from '../components/Toast';
import { triggerHaptic } from '../lib/telegram';

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

  const { user } = useTelegram();
  const [modalOpen, setModalOpen] = useState(false);
  const [formType, setFormType] = useState('expense'); // 'income' | 'expense'
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

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
        ? 'Daromad muvaffaqiyatli qo\'shildi!' 
        : 'Xarajat muvaffaqiyatli qo\'shildi!'
    );
  };

  // Get last 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  const formattedBalance = new Intl.NumberFormat('uz-UZ').format(balance);
  const formattedIncome = new Intl.NumberFormat('uz-UZ').format(totalIncome);
  const formattedExpense = new Intl.NumberFormat('uz-UZ').format(totalExpense);

  const welcomeName = user?.first_name || 'Foydalanuvchi';

  return (
    <>
      {/* Header */}
      <header className="view-header">
        <h1>Salom, {welcomeName}!</h1>
        <p>Moliyaviy hisobotingiz va boshqaruv paneli</p>
      </header>

      {/* Balance Box */}
      <section className="balance-section">
        <div className="balance-label">Joriy Balans</div>
        <div className="balance-amount">
          {balance >= 0 ? '' : '-'}{formattedBalance} 
          <span className="balance-currency">{settings.currencySymbol}</span>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="summary-cards">
        <div className="card summary-card card-gradient-income">
          <div className="summary-icon">📈</div>
          <div className="summary-label">Daromadlar</div>
          <div className="summary-value">+{formattedIncome} {settings.currencySymbol}</div>
        </div>
        
        <div className="card summary-card card-gradient-expense">
          <div className="summary-icon">📉</div>
          <div className="summary-label">Xarajatlar</div>
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
          <span>Xarajat qo'shish</span>
        </button>
        
        <button 
          onClick={() => handleQuickAction('income')}
          className="quick-action-btn income"
        >
          <div className="action-icon text-income"><ArrowUpRight size={20} /></div>
          <span>Daromad qo'shish</span>
        </button>
      </section>

      {/* Recent Transactions List */}
      <section className="transactions-section">
        <div className="section-header">
          <h2 className="section-title">So'nggi amallar</h2>
          {transactions.length > 5 && (
            <a href="/transactions" className="section-link">Barchasi</a>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">💸</div>
            <h3 className="empty-state-title">Amallar topilmadi</h3>
            <p className="empty-state-text">Daromad yoki xarajatlaringizni kiritishni boshlang</p>
          </div>
        ) : (
          <div className="transaction-list">
            {recentTransactions.map((tx) => (
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
        )}
      </section>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => handleQuickAction('expense')}
        className="fab"
        title="Tezkor qo'shish"
      >
        <Plus size={28} />
      </button>

      {/* Modal form for adding transactions */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={formType === 'income' ? 'Daromad qo\'shish' : 'Xarajat qo\'shish'}
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
