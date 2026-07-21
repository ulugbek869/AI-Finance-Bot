export function buildFinancialContext({
  transactions,
  balance,
  totalIncome,
  totalExpense,
  budgets,
  settings,
  categories,
}) {
  const findCat = (id) =>
    categories.expense.find((c) => c.id === id) ||
    categories.income.find((c) => c.id === id);

  const expenseByCategory = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
    });

  const topCategories = Object.entries(expenseByCategory)
    .map(([catId, amount]) => {
      const cat = findCat(catId);
      return { name: cat?.name || 'Boshqa', amount, icon: cat?.icon || '📌' };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const budgetStatus = budgets.map((b) => {
    const cat = findCat(b.categoryId);
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
      .reduce((s, t) => s + t.amount, 0);
    return {
      category: cat?.name || "Noma'lum",
      icon: cat?.icon || '📌',
      limit: b.amount,
      spent,
      percent: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
    };
  });

  const recentTransactions = transactions.slice(0, 10).map((t) => {
    const cat = findCat(t.categoryId);
    return {
      type: t.type,
      amount: t.amount,
      category: cat?.name || 'Boshqa',
      date: t.date,
      note: t.note || '',
    };
  });

  return {
    currency: settings.currencySymbol,
    balance,
    totalIncome,
    totalExpense,
    transactionCount: transactions.length,
    topCategories,
    budgetStatus,
    recentTransactions,
  };
}
