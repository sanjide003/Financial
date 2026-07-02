import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMonthlyReport, processTransactions } from '../js/calc.js';

const accounts = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank' }
];

test('processTransactions computes balances, monthly totals, transfers, and debts', () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const transactions = [
    { type: 'income', amount: 1000, to_account: 'bank', date: `${currentMonth}-01`, category: 'Salary' },
    { type: 'expense', amount: 200, from_account: 'bank', date: `${currentMonth}-02`, category: 'Food' },
    { type: 'transfer', amount: 100, from_account: 'bank', to_account: 'cash', date: `${currentMonth}-03`, category: 'Transfer' },
    { type: 'loan_given', amount: 50, from_account: 'cash', date: `${currentMonth}-04`, category: 'Alex' },
    { type: 'debt_received', amount: 20, to_account: 'cash', date: `${currentMonth}-05`, category: 'Alex' }
  ];

  const result = processTransactions(transactions, accounts);

  assert.equal(result.currentMonthIncome, 1000);
  assert.equal(result.currentMonthExpense, 200);
  assert.equal(result.accBalances.bank.balance, 700);
  assert.equal(result.accBalances.cash.balance, 70);
  assert.equal(result.debts.toReceive, 30);
  assert.equal(result.debts.people.Alex, 30);
});

test('generateMonthlyReport summarizes only the requested month', () => {
  const transactions = [
    { type: 'income', amount: 1200, date: '2026-07-01', category: 'Salary' },
    { type: 'expense', amount: 300, date: '2026-07-02', category: 'Food' },
    { type: 'expense', amount: 100, date: '2026-07-03', category: 'Travel' },
    { type: 'expense', amount: 999, date: '2026-06-01', category: 'Ignore' }
  ];

  const report = generateMonthlyReport(transactions, '2026-07');

  assert.equal(report.income, 1200);
  assert.equal(report.expense, 400);
  assert.equal(report.savings, 800);
  assert.deepEqual(report.sortedCategories, [
    { name: 'Food', amount: 300 },
    { name: 'Travel', amount: 100 }
  ]);
});

test('calculation functions ignore malformed optional dates and amounts safely', () => {
  assert.doesNotThrow(() => processTransactions([{ type: 'income', amount: 'not-a-number' }], accounts));
  assert.deepEqual(generateMonthlyReport([{ type: 'expense', amount: 10 }], '2026-07').sortedCategories, []);
});
