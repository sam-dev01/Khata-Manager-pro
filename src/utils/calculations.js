import dayjs from 'dayjs';

export const calculateBalance = (customerId, transactions) => {
  const customerTxns = transactions.filter(t => t.customerId === customerId);
  let balance = 0;
  
  customerTxns.forEach(txn => {
    if (txn.type === 'credit') {
      balance += txn.amount || 0;
    } else if (txn.type === 'debit') {
      balance -= txn.amount || 0;
    }
  });
  
  return balance;
};

export const getTodayTransactions = (transactions) => {
  const today = dayjs().format('YYYY-MM-DD');
  return transactions.filter(t => t.date === today);
};

export const getTotalOutstanding = (customers, transactions) => {
  let total = 0;
  customers.forEach(customer => {
    const balance = calculateBalance(customer.id, transactions);
    if (balance > 0) {
      total += balance;
    }
  });
  return total;
};

export const getTopDebtors = (customers, transactions, limit = 10) => {
  const debtors = customers.map(customer => ({
    ...customer,
    balance: calculateBalance(customer.id, transactions)
  })).filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  
  return debtors.slice(0, limit);
};

export const getOverduePromises = (promises) => {
  const today = dayjs();
  return promises.filter(p => 
    p.status === 'pending' && 
    dayjs(p.dueDate).isBefore(today)
  );
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const getVillageStats = (customers, transactions) => {
  const villages = {};
  
  customers.forEach(customer => {
    const village = customer.village || 'Unknown';
    if (!villages[village]) {
      villages[village] = {
        customerCount: 0,
        totalOutstanding: 0
      };
    }
    villages[village].customerCount++;
    villages[village].totalOutstanding += calculateBalance(customer.id, transactions);
  });
  
  return Object.entries(villages).map(([name, stats]) => ({
    village: name,
    ...stats
  })).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
};

export const getMonthlyStats = (transactions) => {
  const months = {};
  
  transactions.forEach(txn => {
    const month = dayjs(txn.date).format('YYYY-MM');
    if (!months[month]) {
      months[month] = { credit: 0, debit: 0 };
    }
    if (txn.type === 'credit') {
      months[month].credit += txn.amount;
    } else {
      months[month].debit += txn.amount;
    }
  });
  
  return months;
};
