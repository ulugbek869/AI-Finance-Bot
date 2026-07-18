// src/app/stats/page.js
'use client';
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import { findCategoryById } from '../../lib/categories';
import { triggerHaptic } from '../../lib/telegram';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatsPage() {
  const { transactions, settings } = useApp();
  const [period, setPeriod] = useState('month'); // 'week' | 'month' | 'year'
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' | 'income'

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    triggerHaptic('selection');
  };

  // Filter transactions by selected period
  const getFilteredTx = () => {
    const now = new Date();
    return transactions.filter(tx => {
      try {
        const txDate = new Date(tx.date);
        if (period === 'week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return txDate >= oneWeekAgo;
        } else if (period === 'month') {
          return txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth();
        } else if (period === 'year') {
          return txDate.getFullYear() === now.getFullYear();
        }
        return true;
      } catch (e) {
        return false;
      }
    });
  };

  const periodTx = getFilteredTx();

  // Calculations for selected period
  const periodIncome = periodTx
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodExpense = periodTx
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodBalance = periodIncome - periodExpense;

  // Group by category (depending on active tab)
  const groupedByCategory = {};
  periodTx
    .filter(t => t.type === activeTab)
    .forEach(t => {
      if (!groupedByCategory[t.categoryId]) {
        groupedByCategory[t.categoryId] = 0;
      }
      groupedByCategory[t.categoryId] += t.amount;
    });

  // Prepare data array for charts and lists
  const chartDataList = Object.entries(groupedByCategory)
    .map(([catId, amount]) => {
      const category = findCategoryById(catId);
      return {
        id: catId,
        amount,
        name: category?.name || 'Boshqa',
        icon: category?.icon || '📌',
        color: category?.color || '#8b8b9e'
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const totalValue = chartDataList.reduce((sum, item) => sum + item.amount, 0);

  // Setup Doughnut chart data
  const doughnutData = {
    labels: chartDataList.map(item => `${item.icon} ${item.name}`),
    datasets: [
      {
        data: chartDataList.map(item => item.amount),
        backgroundColor: chartDataList.map(item => item.color),
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#a0a0b8',
          font: {
            family: 'Inter',
            size: 11
          },
          padding: 12
        }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;
            const formattedVal = new Intl.NumberFormat('uz-UZ').format(value);
            return ` ${label}: ${formattedVal} ${settings.currencySymbol} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%'
  };

  return (
    <>
      <header className="view-header">
        <h1>Moliya tahlili</h1>
        <p>Daromad va xarajatlaringiz dinamik tahlili</p>
      </header>

      {/* Period Selection */}
      <section className="stats-period-selector">
        <button 
          onClick={() => handlePeriodChange('week')}
          className={`stats-period-btn ${period === 'week' ? 'active' : ''}`}
        >
          Hafta
        </button>
        <button 
          onClick={() => handlePeriodChange('month')}
          className={`stats-period-btn ${period === 'month' ? 'active' : ''}`}
        >
          Oy
        </button>
        <button 
          onClick={() => handlePeriodChange('year')}
          className={`stats-period-btn ${period === 'year' ? 'active' : ''}`}
        >
          Yil
        </button>
      </section>

      {/* Type Selection (Xarajatlar / Daromadlar) */}
      <div className="type-selector" style={{ marginBottom: '16px' }}>
        <button 
          onClick={() => { setActiveTab('expense'); triggerHaptic('selection'); }}
          className={`type-btn ${activeTab === 'expense' ? 'active expense' : ''}`}
        >
          💸 Xarajatlar
        </button>
        <button 
          onClick={() => { setActiveTab('income'); triggerHaptic('selection'); }}
          className={`type-btn ${activeTab === 'income' ? 'active income' : ''}`}
        >
          💰 Daromadlar
        </button>
      </div>

      {/* Period Summary Cards */}
      <section className="stats-summary">
        <div className="stats-summary-item">
          <div className="stats-summary-value text-income">
            +{new Intl.NumberFormat('uz-UZ').format(periodIncome)}
          </div>
          <div className="stats-summary-label">Daromad</div>
        </div>
        <div className="stats-summary-item">
          <div className="stats-summary-value text-expense">
            -{new Intl.NumberFormat('uz-UZ').format(periodExpense)}
          </div>
          <div className="stats-summary-label">Xarajat</div>
        </div>
        <div className="stats-summary-item">
          <div className="stats-summary-value" style={{ color: periodBalance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {periodBalance >= 0 ? '+' : ''}{new Intl.NumberFormat('uz-UZ').format(periodBalance)}
          </div>
          <div className="stats-summary-label">Balans</div>
        </div>
      </section>

      {/* Chart container */}
      <section className="chart-container">
        <div className="chart-title">{activeTab === 'expense' ? 'Xarajatlar taqsimoti' : 'Daromadlar taqsimoti'}</div>
        <div className="chart-canvas-wrap">
          {chartDataList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-secondary" style={{ fontSize: '14px', fontStyle: 'italic' }}>
              Ushbu davrda {activeTab === 'expense' ? 'xarajatlar' : 'daromadlar'} mavjud emas
            </div>
          ) : (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          )}
        </div>
      </section>

      {/* Top Categories Ranking List */}
      <section className="top-categories-section">
        <div className="section-header">
          <h2 className="section-title">Top {activeTab === 'expense' ? 'xarajatlar' : 'daromadlar'}</h2>
        </div>

        {chartDataList.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-icon">📊</div>
            <h3 className="empty-state-title">Tahlil qilish uchun yetarli ma'lumot yo'q</h3>
            <p className="empty-state-text">Ushbu davr uchun {activeTab === 'expense' ? 'xarajatlar' : 'daromadlar'} kiritilmagan</p>
          </div>
        ) : (
          <div className="top-categories">
            {chartDataList.map((item, idx) => {
              const percentage = totalValue > 0 ? Math.round((item.amount / totalValue) * 100) : 0;
              return (
                <div key={item.id} className="top-category-item">
                  <div className="top-category-rank">{idx + 1}</div>
                  <div className="top-category-info">
                    <div className="flex justify-between items-center">
                      <span className="top-category-name">{item.icon} {item.name}</span>
                      <span 
                        className="top-category-amount"
                        style={{ color: activeTab === 'expense' ? 'var(--expense)' : 'var(--income)' }}
                      >
                        {new Intl.NumberFormat('uz-UZ').format(item.amount)} {settings.currencySymbol} ({percentage}%)
                      </span>
                    </div>
                    <div className="top-category-bar">
                      <div 
                        className="top-category-bar-fill"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BottomNav />
    </>
  );
}
