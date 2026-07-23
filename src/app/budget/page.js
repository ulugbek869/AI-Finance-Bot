// src/app/budget/page.js
'use client';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import { triggerHaptic } from '../../lib/telegram';
import { getCategoryName, getLocale, t } from '../../lib/i18n';

export default function BudgetPage() {
  const { transactions, budgets, updateBudget, categories, settings } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const language = settings.language || 'uz';

  const showToast = (message) => {
    setToastMessage(message);
  };

  // Get current month's transactions
  const now = new Date();
  const currentMonthTx = transactions.filter(tx => {
    if (tx.type !== 'expense') return false;
    try {
      const d = new Date(tx.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    } catch (e) {
      return false;
    }
  });

  // Calculate total spent per category in current month
  const categorySpent = {};
  categories.expense.forEach(cat => {
    categorySpent[cat.id] = currentMonthTx
      .filter(tx => tx.categoryId === cat.id)
      .reduce((sum, tx) => sum + tx.amount, 0);
  });

  const handleEditBudget = (cat) => {
    setSelectedCat(cat);
    const existingBudget = budgets.find(b => b.categoryId === cat.id);
    setBudgetAmount(existingBudget ? existingBudget.amount.toString() : '');
    setModalOpen(true);
    triggerHaptic('light');
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    if (!selectedCat) return;

    const amount = budgetAmount === '' ? 0 : parseFloat(budgetAmount);
    updateBudget(selectedCat.id, amount);
    setModalOpen(false);
    triggerHaptic('success');
    showToast(
      amount > 0 
        ? t(language, 'budgetSet', { category: getCategoryName(selectedCat, language) })
        : t(language, 'budgetRemoved', { category: getCategoryName(selectedCat, language) })
    );
  };

  return (
    <>
      <header className="view-header">
        <h1>{t(language, 'budgetTitle')}</h1>
        <p>{t(language, 'budgetSubtitle')}</p>
      </header>

      {/* Budget List */}
      <section className="budget-list-section">
        <div className="budget-list">
          {categories.expense.map(cat => {
            const budget = budgets.find(b => b.categoryId === cat.id);
            const spent = categorySpent[cat.id] || 0;
            const limit = budget ? budget.amount : 0;
            
            let percentage = 0;
            if (limit > 0) {
              percentage = Math.min(Math.round((spent / limit) * 100), 100);
            }

            // Determine color class based on progress percentage
            let progressClass = 'safe';
            if (percentage >= 100) {
              progressClass = 'danger';
            } else if (percentage >= 80) {
              progressClass = 'warning';
            }

            return (
              <div 
                key={cat.id} 
                className="budget-item"
                onClick={() => handleEditBudget(cat)}
                style={{ cursor: 'pointer' }}
              >
                <div className="budget-header">
                  <div className="budget-category">
                    <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                    <span>{getCategoryName(cat, language)}</span>
                  </div>
                  <div className="budget-amounts">
                    <span className="text-expense" style={{ fontWeight: '600' }}>
                      {new Intl.NumberFormat(getLocale(language)).format(spent)}
                    </span>
                    <span className="text-secondary">
                      {' '} / {limit > 0 ? `${new Intl.NumberFormat(getLocale(language)).format(limit)} ${settings.currencySymbol}` : t(language, 'noLimit')}
                    </span>
                  </div>
                </div>

                {limit > 0 ? (
                  <>
                    <div className="budget-progress-bar">
                      <div 
                        className={`budget-progress-fill ${progressClass}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="budget-percentage" style={{ 
                      color: percentage >= 100 ? 'var(--expense)' : percentage >= 80 ? 'var(--warning-dark)' : 'var(--income)'
                    }}>
                      {percentage}% {t(language, 'spent')}
                    </div>
                  </>
                ) : (
                  <div className="text-secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                    {t(language, 'setLimit')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Edit Budget Modal Sheet */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedCat ? `${selectedCat.icon} ${t(language, 'setLimitTitle', { category: getCategoryName(selectedCat, language) })}` : ''}
      >
        <form onSubmit={handleSaveBudget} className="flex flex-col gap-md">
          <div className="form-group">
            <label className="form-label text-center">{t(language, 'monthlyLimit', { currency: settings.currencySymbol })}</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder={t(language, 'limitPlaceholder')}
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              className="form-input form-input-amount"
              autoFocus
            />
          </div>
          
          <button type="submit" className="btn btn-primary">
            {t(language, 'save')}
          </button>
        </form>
      </Modal>

      <Toast 
        message={toastMessage} 
        onClose={() => setToastMessage('')} 
      />

      <BottomNav />
    </>
  );
}
