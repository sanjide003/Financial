import { initAuth } from './auth.js';
let appState = {
    user: null,
    accounts: [],
    transactions: [],
    notifications: [],
    scheduledEmis: [],
    budgets: [],
    investments: [],
    assets: [],
    liabilities: [],
    goals: [],
    familyMembers: [],
    planningModal: null,
    generatedDebtReminderKeys: new Set(),
    activeTxnFilter: 'all',
    editingTransactionId: null,
    editingOriginalType: null,
    editingAccountId: null,
    editingEmiId: null
};

const t = (key) => window.i18n?.t?.(key) || key;

const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

// --- UI Navigation & Setup ---
const openAddSheet = () => {
    if (!appState.editingTransactionId) resetRecordForm();
    setupAddForm();
    updateSuggestions();
    document.getElementById('view-add').classList.add('active');
};

const closeAddSheet = () => {
    document.getElementById('view-add').classList.remove('active');
    resetRecordForm();
};

const switchTab = (tabId) => {
    if (tabId === 'add') {
        openAddSheet();
        return;
    }

    closeAllActionMenus();
    closeAddSheet();
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${tabId}`).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('active', 'text-primary');
        el.classList.add('text-gray-400');
    });
    
    const activeBtn = document.querySelector(`.nav-btn[data-target="${tabId}"]`);
    if(activeBtn) {
        activeBtn.classList.remove('text-gray-400');
        activeBtn.classList.add('active', 'text-primary');
    }

    // Trigger specific tab renders
    if(tabId === 'reports') renderReports();
    if(tabId === 'transactions') renderTxnList(appState.activeTxnFilter);
    if(tabId === 'accounts') setVaultTab(appState.vaultTab || 'accounts');
};

const showToast = (msg) => {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 3000);
};

const setSyncStatus = (status = 'synced') => {
    const wrapper = document.getElementById('sync-status');
    const dot = document.getElementById('sync-status-dot');
    const text = document.getElementById('sync-status-text');
    if (!wrapper || !dot || !text) return;

    const states = {
        synced: ['Synced', 'bg-green-500', 'text-green-700', 'bg-green-50'],
        offline: ['Offline', 'bg-orange-500', 'text-orange-700', 'bg-orange-50'],
        pending: ['Saving', 'bg-blue-500', 'text-blue-700', 'bg-blue-50'],
        error: ['Sync error', 'bg-red-500', 'text-red-700', 'bg-red-50']
    };
    const [label, dotClass, textClass, bgClass] = states[status] || states.synced;
    wrapper.className = `flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${bgClass} ${textClass}`;
    dot.className = `w-2 h-2 rounded-full ${dotClass}`;
    text.innerText = label;
};

const updateSyncStatusFromSnapshot = (metadata = {}) => {
    if (!navigator.onLine) return setSyncStatus('offline');
    if (metadata.hasPendingWrites) return setSyncStatus('pending');
    setSyncStatus(metadata.fromCache ? 'offline' : 'synced');
};

// --- Data Fetching & Core Logic ---
const initAfterAuth = (user) => {
    appState.user = user;
    if (window.db.upsertUser) {
        window.db.upsertUser(user.uid, {
            name: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            lastLoginAt: new Date().toISOString()
        }).catch((error) => console.error('Error saving user profile', error));
    }
    
    // Listen to Accounts
    window.db.listenToData(user.uid, 'accounts', (data, metadata) => {
        updateSyncStatusFromSnapshot(metadata);
        appState.accounts = data;
        updateAccountsUI();
    });

    // Listen to Transactions
    window.db.listenToData(user.uid, 'transactions', (data, metadata) => {
        updateSyncStatusFromSnapshot(metadata);
        // Sort data locally by date descending
        appState.transactions = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        updateDashboard();
        populateTransactionFilters();
        updateSuggestions();
        if(document.getElementById('view-transactions').classList.contains('active')) renderTxnList(appState.activeTxnFilter);
    });

    // Listen to scheduled EMIs and bills
    window.db.listenToData(user.uid, 'scheduled_emis', (data, metadata) => {
        updateSyncStatusFromSnapshot(metadata);
        appState.scheduledEmis = data.sort((a, b) => Number(a.dueDay || 0) - Number(b.dueDay || 0));
        updateDashboard();
        renderEmis();
    });

    // Listen to Notifications
    window.db.listenToData(user.uid, 'notifications', (data, metadata) => {
        updateSyncStatusFromSnapshot(metadata);
        appState.notifications = data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        updateNotificationsUI();
        updateDashboard();
    });

    ['budgets', 'investments', 'assets', 'liabilities', 'goals', 'family_members'].forEach((collectionName) => {
        window.db.listenToData(user.uid, collectionName, (data, metadata) => {
            updateSyncStatusFromSnapshot(metadata);
            const stateKey = collectionName === 'family_members' ? 'familyMembers' : collectionName;
            appState[stateKey] = data.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
            updateDashboard();
            renderWealthModules();
            if(document.getElementById('view-reports').classList.contains('active')) renderReports();
        });
    });

    // Setup initial dates
    document.getElementById('form-date').valueAsDate = new Date();
    document.getElementById('report-month').value = new Date().toISOString().slice(0, 7);
    
    // Add default account if none exists (setTimeout to wait for first fetch)
    setTimeout(() => {
        if(appState.accounts.length === 0) {
            window.db.addRecord('accounts', { userId: user.uid, name: 'Cash in Hand', createdAt: new Date().toISOString() });
        }
    }, 2000);
};

// --- UI Updaters ---
const updateAccountsUI = () => {
    setupAddForm();
    populateTransactionFilters();
    updateSuggestions();
    updateDashboard();
    renderEmis();
    renderWealthModules();
};

const sumBy = (items, field) => items.reduce((total, item) => total + (parseFloat(item[field]) || 0), 0);

const getWealthStats = () => {
    const investmentValue = sumBy(appState.investments, 'currentValue');
    const investmentCost = sumBy(appState.investments, 'invested');
    const investmentIncome = sumBy(appState.investments, 'income');
    const assetValue = sumBy(appState.assets, 'value');
    const liabilityValue = sumBy(appState.liabilities, 'balance');
    const goalTarget = sumBy(appState.goals, 'target');
    const goalSaved = sumBy(appState.goals, 'saved');
    const cashStats = window.calc.processTransactions(appState.transactions, appState.accounts);
    const trueNetWorth = cashStats.netWorth + investmentValue + assetValue - liabilityValue;

    return {
        investmentValue,
        investmentCost,
        investmentGain: investmentValue - investmentCost,
        investmentIncome,
        assetValue,
        liabilityValue,
        goalTarget,
        goalSaved,
        trueNetWorth
    };
};

const updateWealthDashboard = () => {
    const stats = getWealthStats();
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.innerText = value;
    };

    setText('home-true-net-worth', `₹${stats.trueNetWorth.toFixed(2)}`);
    setText('home-investment-value', `₹${stats.investmentValue.toFixed(2)}`);
    setText('home-liabilities', `₹${stats.liabilityValue.toFixed(2)}`);
    setText('home-goals-progress', stats.goalTarget ? `${((stats.goalSaved / stats.goalTarget) * 100).toFixed(0)}%` : '0%');
    setText('rep-investments', `₹${stats.investmentValue.toFixed(2)}`);
    setText('rep-true-net-worth', `₹${stats.trueNetWorth.toFixed(2)}`);
};

const updateDashboard = () => {
    const stats = window.calc.processTransactions(appState.transactions, appState.accounts);
    updateWealthDashboard();
    
    document.getElementById('home-net-balance').innerText = `₹${stats.netWorth.toFixed(2)}`;
    document.getElementById('home-month-income').innerText = `+ ₹${stats.currentMonthIncome.toFixed(2)}`;
    document.getElementById('home-month-expense').innerText = `- ₹${stats.currentMonthExpense.toFixed(2)}`;

    // Update Accounts UI inside Dashboard & Accounts Tab
    const accListHome = document.getElementById('home-accounts-list');
    const accListFull = document.getElementById('accounts-full-list');
    accListHome.innerHTML = '';
    accListFull.innerHTML = '';

    Object.entries(stats.accBalances).forEach(([accId, acc]) => {
        const cardHtml = `
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <span class="text-[10px] text-gray-500 font-bold uppercase truncate">${escapeHtml(acc.name)}</span>
                <span class="text-sm font-bold text-gray-800 mt-1">₹${acc.balance.toFixed(2)}</span>
            </div>
        `;
        accListHome.innerHTML += cardHtml;

        const fullRowHtml = `
            <div class="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-50 text-secondary flex items-center justify-center"><i class="fa-solid fa-building-columns"></i></div>
                    <span class="font-semibold text-gray-800">${escapeHtml(acc.name)}</span>
                </div>
                <div class="flex items-center gap-2 relative">
                    <span class="font-bold text-lg text-gray-800">₹${acc.balance.toFixed(2)}</span>
                    <button onclick="window.app.toggleActionMenu('account', '${accId}')" class="w-8 h-8 rounded-full bg-gray-50 text-gray-600" title="More account actions"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    <div id="menu-account-${accId}" class="action-menu hidden absolute right-0 top-9 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden text-left">
                        <button onclick="window.app.editAccount('${accId}')" class="block w-full px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50">Edit</button>
                        <button onclick="window.app.deleteAccount('${accId}')" class="block w-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                </div>
            </div>
        `;
        accListFull.innerHTML += fullRowHtml;
    });

    // Update Debts
    document.getElementById('debt-to-pay').innerText = `₹${stats.debts.toPay.toFixed(2)}`;
    document.getElementById('debt-to-receive').innerText = `₹${stats.debts.toReceive.toFixed(2)}`;
    
    const peopleList = document.getElementById('debt-people-list');
    peopleList.innerHTML = '';
    let hasDebts = false;
    for (const [person, amount] of Object.entries(stats.debts.people)) {
        if(amount !== 0) {
            if (Math.abs(amount) < 0.01) continue;
            hasDebts = true;
            const isOwedToMe = amount > 0;
            peopleList.innerHTML += `
                <div class="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <button onclick="window.app.showDebtDetails(decodeURIComponent('${encodeURIComponent(person)}'))" class="text-left text-sm font-medium text-gray-700 underline decoration-dotted">${escapeHtml(person)}</button>
                    <span class="text-sm font-bold ${isOwedToMe ? 'text-teal-600' : 'text-orange-600'}">
                        ${isOwedToMe ? '+' : ''}₹${Math.abs(amount).toFixed(2)}
                    </span>
                </div>
            `;
        }
    }
    if(!hasDebts) peopleList.innerHTML = '<p class="text-xs text-gray-500 text-center">No active debts.</p>';

    renderActionCenter(stats);

    // Render Recent Txns
    renderTxnList('recent', 'home-recent-txns', 4);
};

const transactionMatchesType = (transaction, filter) => {
    if (filter === 'all' || filter === 'recent') return true;
    if (filter === 'debt') return ['loan_given', 'loan_taken', 'debt_received', 'debt_paid'].includes(transaction.type);
    return transaction.type.includes(filter);
};

const transactionMatchesAccount = (transaction, accountId) => {
    if (accountId === 'all') return true;
    return transaction.from_account === accountId || transaction.to_account === accountId;
};

const getTransactionSearchText = (transaction) => [
    transaction.category,
    transaction.note,
    transaction.phone,
    transaction.whatsapp,
    transaction.dueDate,
    transaction.type,
    appState.accounts.find((account) => account.id === transaction.from_account)?.name,
    appState.accounts.find((account) => account.id === transaction.to_account)?.name
].filter(Boolean).join(' ').toLowerCase();

const getFilteredTransactions = (filter = appState.activeTxnFilter) => {
    let filtered = appState.transactions.filter((transaction) => transactionMatchesType(transaction, filter));

    if (filter !== 'recent') {
        const month = document.getElementById('filter-month')?.value || 'all';
        const accountId = document.getElementById('filter-account')?.value || 'all';
        const search = (document.getElementById('txn-search')?.value || '').trim().toLowerCase();

        if (month !== 'all') filtered = filtered.filter((transaction) => transaction.date?.startsWith(month));
        if (accountId !== 'all') filtered = filtered.filter((transaction) => transactionMatchesAccount(transaction, accountId));
        if (search) filtered = filtered.filter((transaction) => getTransactionSearchText(transaction).includes(search));
    }

    return filtered;
};

const renderTxnList = (filter = 'all', containerId = 'full-txn-list', limit = null) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    let filtered = containerId === 'full-txn-list' ? getFilteredTransactions(filter) : appState.transactions.filter((transaction) => transactionMatchesType(transaction, filter));
    if(limit) filtered = filtered.slice(0, limit);

    if(filtered.length === 0) {
        container.innerHTML = '<div class="p-5 text-center text-gray-400 text-sm">No transactions found.</div>';
        return;
    }

    filtered.forEach(t => {
        let icon = 'fa-money-bill-wave';
        let colorClass = 'text-gray-800';
        let amountPrefix = '';
        let signClass = '';

        if(t.type === 'income') { icon = 'fa-arrow-down'; colorClass = 'bg-green-100 text-green-600'; signClass = 'text-green-500'; amountPrefix = '+'; }
        else if(t.type === 'expense') { icon = 'fa-arrow-up'; colorClass = 'bg-red-100 text-red-600'; signClass = 'text-gray-800'; amountPrefix = '-'; }
        else if(t.type === 'transfer') { icon = 'fa-right-left'; colorClass = 'bg-blue-100 text-blue-600'; }
        else if(['loan_given', 'loan_taken', 'debt_received', 'debt_paid'].includes(t.type)) { icon = 'fa-handshake'; colorClass = 'bg-orange-100 text-orange-600'; }

        const dateObj = new Date(t.date);
        const day = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        const getAccName = (id) => {
            const acc = appState.accounts.find(a => a.id === id);
            return acc ? acc.name : 'Unknown';
        };

        let subtext = t.type === 'transfer' ? `${getAccName(t.from_account)} → ${getAccName(t.to_account)}` : getAccName(['income', 'loan_taken', 'debt_received'].includes(t.type) ? t.to_account : t.from_account);
        const showActions = containerId === 'full-txn-list';

        container.innerHTML += `
            <div class="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${colorClass}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-gray-800 truncate">${escapeHtml(t.category)}</p>
                        <p class="text-[10px] text-gray-400 font-medium truncate">${day} • ${escapeHtml(subtext)}${t.note ? ` • ${escapeHtml(t.note)}` : ''}</p>
                    </div>
                </div>
                <div class="text-right flex items-center gap-2 shrink-0 relative">
                    <p class="text-sm font-bold ${signClass}">${amountPrefix}₹${parseFloat(t.amount).toFixed(2)}</p>
                    ${showActions ? `<button onclick="window.app.toggleActionMenu('txn', '${t.id}')" class="w-8 h-8 rounded-full bg-gray-50 text-gray-600" title="More transaction actions"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    <div id="menu-txn-${t.id}" class="action-menu hidden absolute right-0 top-9 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden text-left">
                        <button onclick="window.app.editTransaction('${t.id}')" class="block w-full px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50">Edit</button>
                        <button onclick="window.app.deleteTransaction('${t.id}')" class="block w-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    });
};

const populateTransactionFilters = () => {
    const monthSelect = document.getElementById('filter-month');
    const accountSelect = document.getElementById('filter-account');
    if (!monthSelect || !accountSelect) return;

    const selectedMonth = monthSelect.value || 'all';
    const selectedAccount = accountSelect.value || 'all';
    const months = [...new Set(appState.transactions.map((transaction) => transaction.date?.slice(0, 7)).filter(Boolean))].sort().reverse();

    monthSelect.innerHTML = '<option value="all">All Time</option>' + months.map((month) => `<option value="${month}">${month}</option>`).join('');
    accountSelect.innerHTML = '<option value="all">All Accounts</option>' + appState.accounts.map((account) => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('');

    monthSelect.value = months.includes(selectedMonth) ? selectedMonth : 'all';
    accountSelect.value = appState.accounts.some((account) => account.id === selectedAccount) ? selectedAccount : 'all';
};

const applyTxnFilters = () => renderTxnList(appState.activeTxnFilter);

const csvEscape = (value = '') => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const exportTransactionsCSV = () => {
    const reportMonth = document.getElementById('view-reports')?.classList.contains('active')
        ? document.getElementById('report-month')?.value
        : '';
    const rows = reportMonth
        ? appState.transactions.filter((transaction) => transaction.date?.startsWith(reportMonth))
        : getFilteredTransactions(appState.activeTxnFilter);
    if (!rows.length) return showToast(t('noTransactionsToExport'));

    const accountName = (id) => appState.accounts.find((account) => account.id === id)?.name || '';
    const headers = ['date', 'type', 'amount', 'category', 'from_account', 'to_account', 'note', 'phone', 'whatsapp', 'dueDate'];
    const csv = [
        headers.join(','),
        ...rows.map((transaction) => [
            transaction.date,
            transaction.type,
            transaction.amount,
            transaction.category,
            accountName(transaction.from_account),
            accountName(transaction.to_account),
            transaction.note,
            transaction.phone,
            transaction.whatsapp,
            transaction.dueDate
        ].map(csvEscape).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const month = reportMonth || document.getElementById('filter-month')?.value || 'all';
    link.href = url;
    link.download = `fintrack-transactions-${month}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(t('csvDownloaded'));
};

const exportReportPDF = () => {
    const month = document.getElementById('report-month')?.value || new Date().toISOString().slice(0, 7);
    const report = window.calc.generateMonthlyReport(appState.transactions, month);
    const lines = report.sortedCategories.map((item) => `
        <tr><td>${escapeHtml(item.name)}</td><td style="text-align:right">₹${item.amount.toFixed(2)}</td></tr>
    `).join('');
    const popup = window.open('', '_blank', 'width=720,height=900');
    if (!popup) return showToast(t('popupBlocked'));

    popup.document.write(`
        <!doctype html>
        <html>
        <head>
            <title>FinTrack Report ${month}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
                h1 { margin-bottom: 4px; }
                .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
                .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>
            <button onclick="window.print()">Save as PDF / Print</button>
            <h1>FinTrack Monthly Report</h1>
            <p>Month: ${escapeHtml(month)}</p>
            <div class="cards">
                <div class="card"><strong>Income</strong><br>₹${report.income.toFixed(2)}</div>
                <div class="card"><strong>Expense</strong><br>₹${report.expense.toFixed(2)}</div>
                <div class="card"><strong>Savings</strong><br>₹${report.savings.toFixed(2)}</div>
            </div>
            <h2>Expense Breakdown</h2>
            <table><thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead><tbody>${lines || '<tr><td colspan="2">No data</td></tr>'}</tbody></table>
            <script>window.onload = () => window.print();<\/script>
        </body>
        </html>
    `);
    popup.document.close();
    showToast(t('pdfReady'));
};

const exportYearlyTaxReport = () => {
    const year = (document.getElementById('report-month')?.value || new Date().toISOString().slice(0, 7)).slice(0, 4);
    const yearlyTransactions = appState.transactions.filter((transaction) => transaction.date?.startsWith(year));
    const income = yearlyTransactions.filter((item) => item.type === 'income').reduce((total, item) => total + (parseFloat(item.amount) || 0), 0);
    const expense = yearlyTransactions.filter((item) => item.type === 'expense').reduce((total, item) => total + (parseFloat(item.amount) || 0), 0);
    const passiveIncome = sumBy(appState.investments, 'income');
    const investmentValue = sumBy(appState.investments, 'currentValue');
    const investmentCost = sumBy(appState.investments, 'invested');
    const popup = window.open('', '_blank', 'width=720,height=900');
    if (!popup) return showToast(t('popupBlocked'));

    popup.document.write(`
        <!doctype html>
        <html>
        <head>
            <title>FinTrack Tax Summary ${year}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>
            <button onclick="window.print()">Save as PDF / Print</button>
            <h1>FinTrack Yearly Tax Summary</h1>
            <p>Year: ${escapeHtml(year)}</p>
            <table>
                <tr><th>Total income recorded</th><td>₹${income.toFixed(2)}</td></tr>
                <tr><th>Total expenses recorded</th><td>₹${expense.toFixed(2)}</td></tr>
                <tr><th>Passive income tracked</th><td>₹${passiveIncome.toFixed(2)}</td></tr>
                <tr><th>Investment cost</th><td>₹${investmentCost.toFixed(2)}</td></tr>
                <tr><th>Investment current value</th><td>₹${investmentValue.toFixed(2)}</td></tr>
                <tr><th>Unrealized investment gain/loss</th><td>₹${(investmentValue - investmentCost).toFixed(2)}</td></tr>
            </table>
            <p style="font-size:12px;color:#6b7280;margin-top:24px;">This is a personal summary, not tax advice. Verify with a tax professional.</p>
            <script>window.onload = () => window.print();<\/script>
        </body>
        </html>
    `);
    popup.document.close();
    showToast(t('pdfReady'));
};

const downloadJson = (filename, payload) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const exportBackupJSON = () => {
    downloadJson(`fintrack-backup-${new Date().toISOString().slice(0, 10)}.json`, {
        exportedAt: new Date().toISOString(),
        version: 1,
        accounts: appState.accounts,
        transactions: appState.transactions,
        scheduled_emis: appState.scheduledEmis,
        notifications: appState.notifications,
        budgets: appState.budgets,
        investments: appState.investments,
        assets: appState.assets,
        liabilities: appState.liabilities,
        goals: appState.goals,
        family_members: appState.familyMembers
    });
    showToast(t('backupDownloaded'));
};

const openBackupImport = () => document.getElementById('backup-import-file')?.click();

// --- Form & Input Handling ---
const setupAddForm = () => {
    const fromSelect = document.getElementById('form-from-account');
    const toSelect = document.getElementById('form-to-account');
    
    const options = appState.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;

    const emiAccount = document.getElementById('emi-account');
    if (emiAccount) emiAccount.innerHTML = options;
};

const setAddType = (type) => {
    document.getElementById('form-type').value = type;
    
    // Reset buttons
    ['expense', 'income', 'transfer', 'debt'].forEach(t => {
        const btn = document.getElementById(`btn-type-${t}`);
        btn.className = 'py-2 text-xs font-bold uppercase rounded-md text-gray-500 transition-all';
    });
    
    // Active button styling
    const activeBtn = document.getElementById(`btn-type-${type}`);
    activeBtn.classList.remove('text-gray-500');
    activeBtn.classList.add('bg-white', 'shadow');
    
    if(type === 'expense') activeBtn.classList.add('text-red-600');
    else if(type === 'income') activeBtn.classList.add('text-green-600');
    else if(type === 'transfer') activeBtn.classList.add('text-blue-600');
    else activeBtn.classList.add('text-orange-600');

    // Show/Hide fields based on type
    const wrapFrom = document.getElementById('wrap-from-account');
    const wrapTo = document.getElementById('wrap-to-account');
    const wrapCat = document.getElementById('wrap-category');
    const wrapDebt = document.getElementById('wrap-debt-type');
    const wrapDebtContact = document.getElementById('wrap-debt-contact');
    const labelCat = document.getElementById('label-category');

    wrapFrom.classList.remove('hidden');
    wrapTo.classList.add('hidden');
    wrapCat.classList.remove('hidden');
    wrapDebt.classList.add('hidden');
    wrapDebtContact.classList.add('hidden');

    if(type === 'income') {
        wrapFrom.classList.add('hidden');
        wrapTo.classList.remove('hidden');
        labelCat.innerText = 'Income Source';
    } else if(type === 'transfer') {
        wrapTo.classList.remove('hidden');
        wrapCat.classList.add('hidden');
        document.getElementById('form-category').value = 'Transfer';
    } else if(type === 'debt') {
        wrapDebt.classList.remove('hidden');
        wrapDebtContact.classList.remove('hidden');
        labelCat.innerText = "Person's Name";
    } else {
        labelCat.innerText = 'Expense Category';
    }

    updateSuggestions();
};


const resetRecordForm = () => {
    appState.editingTransactionId = null;
    appState.editingOriginalType = null;
    document.getElementById('add-form').reset();
    document.getElementById('form-date').valueAsDate = new Date();
    document.getElementById('add-form-title').innerText = 'Add Record';
    document.getElementById('btn-save-record').innerText = 'Save Record';
    setAddType('expense');
};

const typeToFormType = (type) => {
    if (['loan_given', 'loan_taken'].includes(type)) return 'debt';
    if (type === 'debt_received') return 'income';
    if (type === 'debt_paid') return 'expense';
    return type;
};

const isValidIsoDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validateRecordForm = ({ rawType, finalType, amount, category, date, fromAccount, toAccount, reminderDays }) => {
    if (!Number.isFinite(amount) || amount <= 0) return 'Please enter an amount greater than zero.';
    if (!isValidIsoDate(date)) return 'Please select a valid date.';
    if (rawType !== 'transfer' && !category.trim()) {
        return rawType === 'debt' ? "Please enter the person's name." : 'Please enter a category/source.';
    }
    if (['expense', 'transfer'].includes(rawType) || ['loan_given', 'debt_paid'].includes(finalType)) {
        if (!fromAccount) return 'Please select the account money is paid from.';
    }
    if (['income', 'transfer'].includes(rawType) || ['loan_taken', 'debt_received'].includes(finalType)) {
        if (!toAccount) return 'Please select the account money is received into.';
    }
    if (rawType === 'transfer' && fromAccount === toAccount) return 'Transfer accounts must be different.';
    if (rawType === 'debt' && (reminderDays < 0 || reminderDays > 365)) return 'Reminder days must be between 0 and 365.';
    return '';
};

const editTransaction = (transactionId) => {
    const transaction = appState.transactions.find((item) => item.id === transactionId);
    if (!transaction) return showToast('Transaction not found');

    appState.editingTransactionId = transactionId;
    appState.editingOriginalType = transaction.type;
    setupAddForm();
    switchTab('add');
    document.getElementById('add-form-title').innerText = 'Edit Record';
    document.getElementById('btn-save-record').innerText = 'Update Record';

    const formType = typeToFormType(transaction.type);
    setAddType(formType);

    document.getElementById('form-amount').value = transaction.amount;
    document.getElementById('form-category').value = transaction.category || '';
    document.getElementById('form-date').value = transaction.date;
    document.getElementById('form-note').value = transaction.note || '';

    if (transaction.from_account) document.getElementById('form-from-account').value = transaction.from_account;
    if (transaction.to_account) document.getElementById('form-to-account').value = transaction.to_account;
    if (['loan_given', 'loan_taken'].includes(transaction.type)) {
        document.querySelector(`input[name="debt_direction"][value="${transaction.type}"]`).checked = true;
        document.getElementById('form-debt-phone').value = transaction.phone || '';
        document.getElementById('form-debt-whatsapp').value = transaction.whatsapp || '';
        document.getElementById('form-debt-due-date').value = transaction.dueDate || '';
        document.getElementById('form-debt-reminder-days').value = String(transaction.reminderDays ?? 3);
    }
};

const deleteTransaction = async (transactionId) => {
    const transaction = appState.transactions.find((item) => item.id === transactionId);
    if (!transaction) return showToast('Transaction not found');
    if (!confirm(`Delete ${transaction.category || 'this transaction'} for ₹${parseFloat(transaction.amount).toFixed(2)}?`)) return;

    try {
        await window.db.deleteRecord('transactions', transactionId);
        showToast('Transaction deleted. Balances recalculated.');
    } catch (error) {
        console.error(error);
        alert('Error deleting transaction');
    }
};

document.getElementById('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-record');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const rawType = document.getElementById('form-type').value;
    let finalType = rawType;
    if(rawType === 'debt') {
        finalType = document.querySelector('input[name="debt_direction"]:checked').value;
    }
    if(appState.editingTransactionId && ['debt_received', 'debt_paid'].includes(appState.editingOriginalType)) {
        finalType = appState.editingOriginalType;
    }

    const amount = parseFloat(document.getElementById('form-amount').value);
    const category = document.getElementById('form-category').value.trim();
    const date = document.getElementById('form-date').value;
    const fromAccount = document.getElementById('form-from-account').value;
    const toAccount = document.getElementById('form-to-account').value;
    const reminderDays = parseInt(document.getElementById('form-debt-reminder-days').value, 10) || 0;
    const validationError = validateRecordForm({ rawType, finalType, amount, category, date, fromAccount, toAccount, reminderDays });

    if (validationError) {
        showToast(validationError);
        btn.innerHTML = appState.editingTransactionId ? 'Update Record' : 'Save Record';
        return;
    }

    const data = {
        userId: appState.user.uid,
        type: finalType,
        amount,
        category: rawType === 'transfer' ? 'Transfer' : category,
        date,
        note: document.getElementById('form-note').value,
        timestamp: appState.editingTransactionId
            ? (appState.transactions.find((item) => item.id === appState.editingTransactionId)?.timestamp || new Date().toISOString())
            : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if(rawType === 'expense' || rawType === 'transfer' || finalType === 'loan_given' || finalType === 'debt_paid') {
        data.from_account = fromAccount;
    }
    if(rawType === 'income' || rawType === 'transfer' || finalType === 'loan_taken' || finalType === 'debt_received') {
        data.to_account = toAccount;
    }
    if (rawType === 'debt') {
        data.phone = document.getElementById('form-debt-phone').value.trim();
        data.whatsapp = document.getElementById('form-debt-whatsapp').value.trim();
        data.dueDate = document.getElementById('form-debt-due-date').value;
        data.reminderDays = reminderDays;
    }

    try {
        if (appState.editingTransactionId) {
            await window.db.updateRecord('transactions', appState.editingTransactionId, data);
            showToast('Record updated. Balances recalculated.');
        } else {
            await window.db.addRecord('transactions', data);
            showToast('Record saved successfully!');
        }
        resetRecordForm();
        switchTab('home');
    } catch (err) {
        console.error(err);
        alert("Error saving record");
    } finally {
        btn.innerHTML = appState.editingTransactionId ? 'Update Record' : 'Save Record';
    }
});

// --- Reports ---
const renderReports = () => {
    const month = document.getElementById('report-month').value;
    const report = window.calc.generateMonthlyReport(appState.transactions, month);
    updateWealthDashboard();

    document.getElementById('rep-income').innerText = `₹${report.income.toFixed(2)}`;
    document.getElementById('rep-expense').innerText = `₹${report.expense.toFixed(2)}`;
    document.getElementById('rep-savings').innerText = `₹${report.savings.toFixed(2)}`;

    const catContainer = document.getElementById('report-categories');
    catContainer.innerHTML = '';

    if(report.sortedCategories.length === 0) {
        catContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No data for selected month</p>';
        return;
    }

    // Find max expense to calculate progress bar width
    const maxAmount = report.sortedCategories[0].amount;

    report.sortedCategories.forEach(c => {
        const percent = (c.amount / maxAmount) * 100;
        catContainer.innerHTML += `
            <div>
                <div class="flex justify-between text-xs mb-1">
                    <span class="font-bold text-gray-700">${escapeHtml(c.name)}</span>
                    <span class="text-gray-500 font-semibold">₹${c.amount.toFixed(2)}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="bg-red-400 h-1.5 rounded-full" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    });
};

document.getElementById('report-month').addEventListener('change', renderReports);

// --- Accounts Modal ---
const showModal = (id) => {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    // slight delay for animation
    setTimeout(() => {
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
};

const hideModal = (id) => {
    const modal = document.getElementById(id);
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
};

const editAccount = (accountId) => {
    const account = appState.accounts.find((item) => item.id === accountId);
    if (!account) return showToast('Account not found');

    appState.editingAccountId = accountId;
    document.getElementById('modal-account-title').innerText = 'Edit Wallet/Bank';
    document.getElementById('new-acc-name').value = account.name;
    document.getElementById('btn-save-account').innerText = 'Update';
    showModal('modal-new-account');
};

const resetAccountModal = () => {
    appState.editingAccountId = null;
    document.getElementById('modal-account-title').innerText = 'Add Wallet/Bank';
    document.getElementById('new-acc-name').value = '';
    document.getElementById('btn-save-account').innerText = 'Save';
};

const deleteAccount = async (accountId) => {
    const account = appState.accounts.find((item) => item.id === accountId);
    if (!account) return showToast('Account not found');

    const isUsed = appState.transactions.some((item) => item.from_account === accountId || item.to_account === accountId);
    if (isUsed) {
        alert('This account has transactions. Edit or delete those transactions before deleting the account.');
        return;
    }

    if (!confirm(`Delete account ${account.name}?`)) return;

    try {
        await window.db.deleteRecord('accounts', accountId);
        showToast('Account deleted');
        setupAddForm();
    } catch (error) {
        console.error(error);
        alert('Error deleting account');
    }
};

const saveNewAccount = async () => {
    const nameInput = document.getElementById('new-acc-name');
    const name = nameInput.value.trim();
    if(!name) return alert("Please enter a name");

    try {
        if (appState.editingAccountId) {
            await window.db.updateRecord('accounts', appState.editingAccountId, {
                name,
                updatedAt: new Date().toISOString()
            });
            showToast('Account updated!');
        } else {
            await window.db.addRecord('accounts', {
                userId: appState.user.uid,
                name: name,
                createdAt: new Date().toISOString()
            });
            showToast('Account added!');
        }
        hideModal('modal-new-account');
        resetAccountModal();
        setupAddForm(); // Refresh dropdowns
    } catch(e) {
        console.error(e);
        alert("Error saving account");
    }
};

const getDebtBalanceForPerson = (person) => {
    const stats = window.calc.processTransactions(appState.transactions, appState.accounts);
    return stats.debts.people[person] || 0;
};


const isDebtType = (type) => ['loan_given', 'loan_taken', 'debt_received', 'debt_paid'].includes(type);

const normalizePhoneNumber = (value = '') => value.replace(/[^\d+]/g, '');

const getWhatsAppLink = (value = '') => {
    const cleaned = normalizePhoneNumber(value).replace(/^\+/, '');
    return cleaned ? `https://wa.me/${cleaned}` : '';
};

const getPrimaryDebtContact = (history = []) => history.find((item) => item.phone || item.whatsapp || item.dueDate || item.reminderDays !== undefined) || {};

const getOpenDebtTransactions = () => {
    const stats = window.calc.processTransactions(appState.transactions, appState.accounts);
    return appState.transactions.filter((transaction) => {
        if (!['loan_given', 'loan_taken'].includes(transaction.type) || !transaction.dueDate) return false;
        return Math.abs(stats.debts.people[transaction.category] || 0) >= 0.01;
    });
};

const getDueDebtAlerts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return getOpenDebtTransactions().filter((transaction) => {
        const dueDate = new Date(`${transaction.dueDate}T00:00:00`);
        if (Number.isNaN(dueDate.getTime())) return false;
        const reminderStart = new Date(dueDate);
        reminderStart.setDate(dueDate.getDate() - (parseInt(transaction.reminderDays, 10) || 0));
        return today >= reminderStart;
    });
};

const ensureDebtReminderNotifications = async (debtAlerts = []) => {
    if (!appState.user || !window.db?.addNotification) return;
    const todayKey = new Date().toISOString().slice(0, 10);

    for (const debt of debtAlerts) {
        const key = `debt-reminder:${debt.id}:${todayKey}`;
        if (appState.generatedDebtReminderKeys.has(key)) continue;
        const alreadyExists = appState.notifications.some((notification) => notification.reminderKey === key || notification.message?.includes(key));
        if (alreadyExists) {
            appState.generatedDebtReminderKeys.add(key);
            continue;
        }

        appState.generatedDebtReminderKeys.add(key);
        await window.db.addNotification(
            appState.user.uid,
            'Debt Reminder',
            `${debt.category} debt due date: ${debt.dueDate}.`,
            { reminderKey: key, transactionId: debt.id, dueDate: debt.dueDate, type: 'debt_reminder' }
        );
    }
};

const showDebtDetails = (person) => {
    const balance = getDebtBalanceForPerson(person);
    const history = appState.transactions.filter((item) => item.category === person && isDebtType(item.type));
    const contact = getPrimaryDebtContact(history);
    const list = document.getElementById('debt-detail-list');
    const contactCard = document.getElementById('debt-contact-card');
    list.innerHTML = '';
    contactCard.innerHTML = '';

    document.getElementById('debt-detail-name').innerText = person;
    document.getElementById('debt-detail-balance').innerText = `${balance >= 0 ? 'To Receive' : 'To Pay'}: ₹${Math.abs(balance).toFixed(2)}`;
    document.getElementById('debt-detail-person').value = person;
    document.getElementById('debt-settle-amount').value = Math.abs(balance).toFixed(2);
    document.getElementById('debt-settle-account').innerHTML = appState.accounts.map((account) => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('');
    document.getElementById('btn-settle-debt').classList.toggle('hidden', Math.abs(balance) < 0.01);

    const phone = normalizePhoneNumber(contact.phone || '');
    const whatsappLink = getWhatsAppLink(contact.whatsapp || contact.phone || '');
    const hasContactInfo = phone || whatsappLink || contact.dueDate;
    contactCard.classList.toggle('hidden', !hasContactInfo);
    if (hasContactInfo) {
        contactCard.innerHTML = `
            <div class="space-y-2">
                <div>
                    <p class="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Contact & Reminder</p>
                    <p class="text-xs text-gray-600">${contact.dueDate ? `Due: ${escapeHtml(contact.dueDate)} • Alert ${parseInt(contact.reminderDays, 10) || 0} day(s) before` : 'No due date set'}</p>
                </div>
                <div class="flex gap-2 flex-wrap">
                    ${phone ? `<a href="tel:${phone}" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold"><i class="fa-solid fa-phone"></i> Call</a>` : ''}
                    ${whatsappLink ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ''}
                </div>
            </div>
        `;
    }

    if (history.length === 0) {
        list.innerHTML = '<p class="text-xs text-gray-500 text-center py-3">No debt history.</p>';
    } else {
        history.forEach((item) => {
            const labelMap = {
                loan_given: 'Money given',
                loan_taken: 'Loan taken',
                debt_received: 'Repayment received',
                debt_paid: 'Repayment paid'
            };
            const itemPhone = normalizePhoneNumber(item.phone || '');
            const itemWhatsapp = getWhatsAppLink(item.whatsapp || item.phone || '');
            list.innerHTML += `
                <div class="flex justify-between items-start border-b border-gray-100 py-2 last:border-0 gap-3">
                    <div>
                        <p class="text-xs font-bold text-gray-700">${labelMap[item.type]}</p>
                        <p class="text-[10px] text-gray-400">${item.date}${item.dueDate ? ` • Due ${escapeHtml(item.dueDate)}` : ''}${item.note ? ` • ${escapeHtml(item.note)}` : ''}</p>
                        ${(itemPhone || itemWhatsapp) ? `<div class="flex gap-2 mt-1">
                            ${itemPhone ? `<a href="tel:${itemPhone}" class="text-[10px] font-bold text-blue-600">Call</a>` : ''}
                            ${itemWhatsapp ? `<a href="${itemWhatsapp}" target="_blank" rel="noopener" class="text-[10px] font-bold text-green-600">WhatsApp</a>` : ''}
                        </div>` : ''}
                    </div>
                    <span class="text-xs font-bold text-gray-800">₹${parseFloat(item.amount).toFixed(2)}</span>
                </div>
            `;
        });
    }

    showModal('modal-debt-detail');
};

const settleDebt = async () => {
    const person = document.getElementById('debt-detail-person').value;
    const amount = parseFloat(document.getElementById('debt-settle-amount').value);
    const accountId = document.getElementById('debt-settle-account').value;
    const balance = getDebtBalanceForPerson(person);

    if (!person || !amount || amount <= 0) return alert('Enter a valid settlement amount');
    if (!accountId) return alert('Select an account');
    if (Math.abs(balance) < 0.01) return showToast('Debt already settled');

    const type = balance > 0 ? 'debt_received' : 'debt_paid';
    const data = {
        userId: appState.user.uid,
        type,
        amount,
        category: person,
        date: new Date().toISOString().slice(0, 10),
        note: 'Debt settlement',
        timestamp: new Date().toISOString()
    };

    if (type === 'debt_received') data.to_account = accountId;
    if (type === 'debt_paid') data.from_account = accountId;

    try {
        await window.db.addRecord('transactions', data);
        hideModal('modal-debt-detail');
        showToast('Debt settlement saved.');
    } catch (error) {
        console.error(error);
        alert('Error settling debt');
    }
};

const clearNotifications = async () => {
    if (!confirm('Clear all notifications?')) return;
    await window.db.clearNotifications(appState.user.uid);
};

const markAllNotificationsRead = async () => {
    await window.db.markAllNotificationsRead(appState.user.uid);
};

const openNotificationTarget = (notification) => {
    if (notification.transactionId && notification.type === 'debt_reminder') {
        const transaction = appState.transactions.find((item) => item.id === notification.transactionId);
        if (transaction?.category) {
            showDebtDetails(transaction.category);
            return;
        }
    }
    switchTab('notifications');
};

const closeAllActionMenus = () => {
    document.querySelectorAll('.action-menu').forEach((menu) => menu.classList.add('hidden'));
};

const toggleActionMenu = (kind, id) => {
    const menuId = `menu-${kind}-${id}`;
    const menu = document.getElementById(menuId);
    if (!menu) return;
    const wasHidden = menu.classList.contains('hidden');
    closeAllActionMenus();
    if (wasHidden) menu.classList.remove('hidden');
};

document.addEventListener('click', (event) => {
    if (!event.target.closest('.action-menu') && !event.target.closest('[title^="More"]')) {
        closeAllActionMenus();
    }
});

window.addEventListener('online', () => setSyncStatus('synced'));
window.addEventListener('offline', () => setSyncStatus('offline'));

const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7);

const getEmiDueDate = (emi) => {
    const now = new Date();
    const dueDay = Math.min(Math.max(Number(emi.dueDay || 1), 1), 31);
    const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (dueDate.getMonth() !== now.getMonth()) dueDate.setDate(0);
    return dueDate;
};

const getPendingEmis = () => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    const currentMonth = getCurrentMonthKey();

    return appState.scheduledEmis.filter((emi) => {
        if (emi.active === false || emi.lastPaidMonth === currentMonth) return false;
        const dueDate = getEmiDueDate(emi);
        return dueDate <= sevenDaysFromNow;
    });
};

const renderActionCenter = (stats) => {
    const wrapper = document.getElementById('home-alerts');
    const list = document.getElementById('home-alerts-list');
    if (!wrapper || !list) return;

    const pendingEmis = getPendingEmis();
    const dueDebtAlerts = getDueDebtAlerts();
    const debtAlerts = Object.entries(stats.debts.people)
        .filter(([, amount]) => Math.abs(amount) >= 0.01)
        .slice(0, 3);

    ensureDebtReminderNotifications(dueDebtAlerts).catch((error) => console.error('Debt reminder notification error', error));
    list.innerHTML = '';

    pendingEmis.forEach((emi) => {
        const dueDate = getEmiDueDate(emi);
        const accountName = appState.accounts.find((account) => account.id === emi.accountId)?.name || 'Account';
        list.innerHTML += `
            <div class="bg-red-50 border border-red-100 rounded-xl p-3 flex justify-between items-center gap-3">
                <div>
                    <p class="text-sm font-bold text-red-700">${escapeHtml(emi.name)}</p>
                    <p class="text-[10px] text-red-500 font-semibold">Due ${dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • ${escapeHtml(accountName)}</p>
                </div>
                <button onclick="window.app.markEmiPaid('${emi.id}')" class="bg-red-600 text-white rounded-lg px-3 py-2 text-[10px] font-bold uppercase">Pay ₹${parseFloat(emi.amount).toFixed(0)}</button>
            </div>
        `;
    });

    dueDebtAlerts.forEach((debt) => {
        const encoded = encodeURIComponent(debt.category);
        const phone = normalizePhoneNumber(debt.phone || '');
        const whatsappLink = getWhatsAppLink(debt.whatsapp || debt.phone || '');
        list.innerHTML += `
            <div class="bg-orange-50 border border-orange-100 rounded-xl p-3 flex justify-between items-center gap-3">
                <div>
                    <p class="text-sm font-bold text-orange-700">${escapeHtml(debt.category)}</p>
                    <p class="text-[10px] text-orange-500 font-semibold">Debt due ${escapeHtml(debt.dueDate)} • Alert ${parseInt(debt.reminderDays, 10) || 0} day(s) before</p>
                    <div class="flex gap-3 mt-1">
                        ${phone ? `<a href="tel:${phone}" class="text-[10px] font-bold text-blue-600">Call</a>` : ''}
                        ${whatsappLink ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="text-[10px] font-bold text-green-600">WhatsApp</a>` : ''}
                    </div>
                </div>
                <button onclick="window.app.showDebtDetails(decodeURIComponent('${encoded}'))" class="bg-orange-600 text-white rounded-lg px-3 py-2 text-[10px] font-bold uppercase">Open</button>
            </div>
        `;
    });

    debtAlerts.forEach(([person, amount]) => {
        if (dueDebtAlerts.some((debt) => debt.category === person)) return;
        const encoded = encodeURIComponent(person);
        list.innerHTML += `
            <div class="bg-orange-50 border border-orange-100 rounded-xl p-3 flex justify-between items-center gap-3">
                <div>
                    <p class="text-sm font-bold text-orange-700">${escapeHtml(person)}</p>
                    <p class="text-[10px] text-orange-500 font-semibold">${amount > 0 ? 'Receivable' : 'Payable'} debt pending</p>
                </div>
                <button onclick="window.app.showDebtDetails(decodeURIComponent('${encoded}'))" class="bg-orange-600 text-white rounded-lg px-3 py-2 text-[10px] font-bold uppercase">Open</button>
            </div>
        `;
    });

    wrapper.classList.toggle('hidden', !pendingEmis.length && !debtAlerts.length && !dueDebtAlerts.length);
};

const renderSimpleRows = (containerId, rows, emptyText, renderer) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = rows.length ? rows.map(renderer).join('') : `<p class="text-xs text-gray-500 text-center bg-white rounded-xl border border-gray-100 p-4">${emptyText}</p>`;
};

const getBudgetSpent = (budget) => {
    const month = /^\d{4}-\d{2}$/.test(budget.month || '') ? budget.month : new Date().toISOString().slice(0, 7);
    return appState.transactions
        .filter((transaction) => transaction.type === 'expense' && transaction.date?.startsWith(month) && transaction.category?.toLowerCase() === budget.category?.toLowerCase())
        .reduce((total, transaction) => total + (parseFloat(transaction.amount) || 0), 0);
};

const renderWealthModules = () => {
    renderSimpleRows('budget-list', appState.budgets, 'No budgets added.', (item) => {
        const limit = parseFloat(item.limit) || 0;
        const spent = getBudgetSpent(item);
        const percent = limit ? Math.min((spent / limit) * 100, 100) : 0;
        return `
            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <p class="text-sm font-bold text-gray-800">${escapeHtml(item.category)}</p>
                        <p class="text-[10px] text-gray-400 font-semibold">${escapeHtml(item.month || 'Monthly')} • Spent ₹${spent.toFixed(2)} / ₹${limit.toFixed(2)}</p>
                    </div>
                    <button onclick="window.app.deletePlanningRecord('budgets', '${item.id}')" class="text-[10px] font-bold text-red-500">Delete</button>
                </div>
                <div class="h-2 bg-gray-100 rounded-full"><div class="h-2 ${spent > limit ? 'bg-red-500' : 'bg-primary'} rounded-full" style="width:${percent}%"></div></div>
            </div>
        `;
    });

    const wealthRows = [
        ...appState.investments.map((item) => ({ ...item, collection: 'investments', label: item.type || 'Investment', amount: item.currentValue, color: 'text-purple-700' })),
        ...appState.assets.map((item) => ({ ...item, collection: 'assets', label: item.type || 'Asset', amount: item.value, color: 'text-blue-700' })),
        ...appState.liabilities.map((item) => ({ ...item, collection: 'liabilities', label: item.type || 'Liability', amount: item.balance, color: 'text-red-600' }))
    ];
    renderSimpleRows('wealth-list', wealthRows, 'No investments, assets, or liabilities added.', (item) => `
        <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
            <div>
                <p class="text-sm font-bold text-gray-800">${escapeHtml(item.name)}</p>
                <p class="text-[10px] text-gray-400 font-semibold">${escapeHtml(item.label)}${item.income ? ` • Income ₹${(parseFloat(item.income) || 0).toFixed(2)}` : ''}${item.sipAmount ? ` • SIP ₹${(parseFloat(item.sipAmount) || 0).toFixed(2)} ${escapeHtml(item.frequency || 'Monthly')}` : ''}</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold ${item.color}">₹${(parseFloat(item.amount) || 0).toFixed(2)}</p>
                <button onclick="window.app.deletePlanningRecord('${item.collection}', '${item.id}')" class="text-[10px] font-bold text-red-500">Delete</button>
            </div>
        </div>
    `);

    renderSimpleRows('goal-list', appState.goals, 'No goals added.', (item) => {
        const target = parseFloat(item.target) || 0;
        const saved = parseFloat(item.saved) || 0;
        const percent = target ? Math.min((saved / target) * 100, 100) : 0;
        return `
            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <p class="text-sm font-bold text-gray-800">${escapeHtml(item.name)}</p>
                        <p class="text-[10px] text-gray-400 font-semibold">₹${saved.toFixed(2)} / ₹${target.toFixed(2)}</p>
                    </div>
                    <button onclick="window.app.deletePlanningRecord('goals', '${item.id}')" class="text-[10px] font-bold text-red-500">Delete</button>
                </div>
                <div class="h-2 bg-gray-100 rounded-full"><div class="h-2 bg-primary rounded-full" style="width:${percent}%"></div></div>
            </div>
        `;
    });

    renderSimpleRows('family-list', appState.familyMembers, 'No family members added.', (item) => `
        <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
            <div>
                <p class="text-sm font-bold text-gray-800">${escapeHtml(item.name)}</p>
                <p class="text-[10px] text-gray-400 font-semibold">${escapeHtml(item.email)} • ${escapeHtml(item.role || 'Viewer')}</p>
            </div>
            <button onclick="window.app.deletePlanningRecord('family_members', '${item.id}')" class="text-[10px] font-bold text-red-500">Delete</button>
        </div>
    `);
};

const openPlanningModal = (collectionName, title, fields) => {
    appState.planningModal = { collectionName, fields };
    document.getElementById('planning-modal-title').innerText = title;
    document.getElementById('planning-form').innerHTML = fields.map((field) => `
        <label class="block">
            <span class="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">${escapeHtml(field.label)}</span>
            <input
                type="${field.type === 'number' ? 'number' : 'text'}"
                step="${field.type === 'number' ? '0.01' : ''}"
                data-planning-field="${field.key}"
                ${field.required ? 'required' : ''}
                value="${escapeHtml(field.defaultValue || '')}"
                class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-primary text-sm font-medium"
            >
        </label>
    `).join('');
    showModal('modal-planning');
};

const savePlanningRecord = async () => {
    if (!appState.user || !appState.planningModal) return;
    const { collectionName, fields } = appState.planningModal;
    const data = { userId: appState.user.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

    for (const field of fields) {
        const input = document.querySelector(`[data-planning-field="${field.key}"]`);
        const value = input?.value || '';
        data[field.key] = field.type === 'number' ? parseFloat(value) || 0 : value.trim();
        if (field.required && !data[field.key]) return showToast(`${field.label} is required`);
    }

    await window.db.addRecord(collectionName, data);
    hideModal('modal-planning');
    showToast('Saved successfully');
};

const addBudget = () => openPlanningModal('budgets', 'Add Budget', [
    { key: 'category', label: 'Budget category', defaultValue: 'Food', required: true },
    { key: 'month', label: 'Month (YYYY-MM or Monthly)', defaultValue: new Date().toISOString().slice(0, 7) },
    { key: 'limit', label: 'Budget limit amount', type: 'number', required: true }
]);

const addInvestment = () => openPlanningModal('investments', 'Add Investment', [
    { key: 'name', label: 'Investment name', defaultValue: 'Mutual Fund', required: true },
    { key: 'type', label: 'Type', defaultValue: 'Mutual Fund' },
    { key: 'invested', label: 'Total invested amount', type: 'number' },
    { key: 'currentValue', label: 'Current value', type: 'number', required: true },
    { key: 'income', label: 'Dividend/interest/rent income', type: 'number' },
    { key: 'sipAmount', label: 'Recurring SIP/contribution amount', type: 'number' },
    { key: 'frequency', label: 'Frequency', defaultValue: 'Monthly' }
]);

const addAsset = () => openPlanningModal('assets', 'Add Asset', [
    { key: 'name', label: 'Asset name', defaultValue: 'Gold', required: true },
    { key: 'type', label: 'Type', defaultValue: 'Gold' },
    { key: 'value', label: 'Current value', type: 'number', required: true }
]);

const addLiability = () => openPlanningModal('liabilities', 'Add Liability', [
    { key: 'name', label: 'Liability name', defaultValue: 'Credit Card', required: true },
    { key: 'type', label: 'Type', defaultValue: 'Loan' },
    { key: 'balance', label: 'Outstanding balance', type: 'number', required: true }
]);

const addGoal = () => openPlanningModal('goals', 'Add Goal', [
    { key: 'name', label: 'Goal name', defaultValue: 'Emergency Fund', required: true },
    { key: 'target', label: 'Target amount', type: 'number', required: true },
    { key: 'saved', label: 'Saved amount', type: 'number' }
]);

const addFamilyMember = () => openPlanningModal('family_members', 'Add Family Member', [
    { key: 'name', label: 'Member name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'role', label: 'Role', defaultValue: 'Viewer' }
]);

const deletePlanningRecord = async (collectionName, docId) => {
    if (!confirm('Delete this item?')) return;
    await window.db.deleteRecord(collectionName, docId);
    showToast('Deleted');
};

const setVaultTab = (tab) => {
    appState.vaultTab = tab;
    ['accounts', 'debts', 'emis', 'budgets', 'wealth', 'goals', 'family'].forEach((item) => {
        document.getElementById(`vault-${item}-panel`)?.classList.toggle('hidden', item !== tab);
        const btn = document.getElementById(`btn-vault-${item}`);
        if (!btn) return;
        btn.className = item === tab
            ? 'vault-tab py-2 text-xs font-bold uppercase rounded-md bg-white shadow text-primary'
            : 'vault-tab py-2 text-xs font-bold uppercase rounded-md text-gray-500';
    });
};

const defaultSuggestions = {
    expense: ['Food', 'Groceries', 'Rent', 'Travel', 'Fuel', 'Shopping', 'Medical', 'EMI', 'Bills'],
    income: ['Salary', 'Business', 'Rent', 'Interest', 'Gift'],
    debt: ['Loan Given', 'Loan Taken'],
    transfer: ['Transfer']
};

const updateSuggestions = () => {
    const categoryList = document.getElementById('category-suggestions');
    const noteList = document.getElementById('note-suggestions');
    if (!categoryList || !noteList) return;

    const type = document.getElementById('form-type')?.value || 'expense';
    const transactionTypes = type === 'debt' ? ['loan_given', 'loan_taken', 'debt_received', 'debt_paid'] : [type];
    const historicalCategories = appState.transactions
        .filter((transaction) => transactionTypes.includes(transaction.type))
        .map((transaction) => transaction.category)
        .filter(Boolean);
    const categories = [...new Set([...(defaultSuggestions[type] || []), ...historicalCategories])];
    const notes = [...new Set(appState.transactions.map((transaction) => transaction.note).filter(Boolean))];

    categoryList.innerHTML = categories.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
    noteList.innerHTML = notes.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
};

const resetEmiModal = () => {
    appState.editingEmiId = null;
    document.getElementById('emi-id').value = '';
    document.getElementById('emi-name').value = '';
    document.getElementById('emi-amount').value = '';
    document.getElementById('emi-due-day').value = '';
    document.getElementById('emi-category').value = 'EMI';
    document.getElementById('modal-emi-title').innerText = 'Add EMI/Bill';
    document.getElementById('btn-save-emi').innerText = 'Save';
    setupAddForm();
};

const renderEmis = () => {
    const list = document.getElementById('emi-list');
    if (!list) return;
    list.innerHTML = '';

    if (!appState.scheduledEmis.length) {
        list.innerHTML = '<p class="text-xs text-gray-500 text-center bg-white rounded-xl border border-gray-100 p-4">No EMIs or bills added.</p>';
        return;
    }

    appState.scheduledEmis.forEach((emi) => {
        const accountName = appState.accounts.find((account) => account.id === emi.accountId)?.name || 'Unknown';
        const statusText = emi.lastPaidMonth === getCurrentMonthKey() ? 'Paid this month' : `Due day ${emi.dueDay}`;
        list.innerHTML += `
            <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                    <p class="text-sm font-bold text-gray-800">${escapeHtml(emi.name)}</p>
                    <p class="text-[10px] text-gray-400 font-semibold">${escapeHtml(accountName)} • ${escapeHtml(statusText)}</p>
                    <p class="text-sm font-bold text-red-600 mt-1">₹${parseFloat(emi.amount).toFixed(2)}</p>
                </div>
                <div class="relative">
                    <button onclick="window.app.toggleActionMenu('emi', '${emi.id}')" class="w-8 h-8 rounded-full bg-gray-50 text-gray-600" title="More EMI actions"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    <div id="menu-emi-${emi.id}" class="action-menu hidden absolute right-0 top-9 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden text-left">
                        <button onclick="window.app.markEmiPaid('${emi.id}')" class="block w-full px-4 py-2 text-xs font-bold text-green-600 hover:bg-green-50">Mark paid</button>
                        <button onclick="window.app.editEmi('${emi.id}')" class="block w-full px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50">Edit</button>
                        <button onclick="window.app.deleteEmi('${emi.id}')" class="block w-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                </div>
            </div>
        `;
    });
};

const saveEmi = async () => {
    const name = document.getElementById('emi-name').value.trim();
    const amount = parseFloat(document.getElementById('emi-amount').value);
    const dueDay = parseInt(document.getElementById('emi-due-day').value, 10);
    const accountId = document.getElementById('emi-account').value;
    const category = document.getElementById('emi-category').value.trim() || 'EMI';

    if (!name) return alert('Enter EMI/Bill name');
    if (!amount || amount <= 0) return alert('Enter a valid EMI amount');
    if (!dueDay || dueDay < 1 || dueDay > 31) return alert('Due day must be between 1 and 31');
    if (!accountId) return alert('Select payment account');

    const data = {
        userId: appState.user.uid,
        name,
        amount,
        dueDay,
        accountId,
        category,
        active: true,
        updatedAt: new Date().toISOString()
    };

    try {
        if (appState.editingEmiId) {
            await window.db.updateRecord('scheduled_emis', appState.editingEmiId, data);
            showToast('EMI/Bill updated');
        } else {
            await window.db.addRecord('scheduled_emis', { ...data, createdAt: new Date().toISOString() });
            showToast('EMI/Bill added');
        }
        hideModal('modal-emi');
        resetEmiModal();
    } catch (error) {
        console.error(error);
        alert('Error saving EMI/Bill');
    }
};

const editEmi = (emiId) => {
    const emi = appState.scheduledEmis.find((item) => item.id === emiId);
    if (!emi) return showToast('EMI not found');

    appState.editingEmiId = emiId;
    setupAddForm();
    document.getElementById('emi-id').value = emi.id;
    document.getElementById('emi-name').value = emi.name || '';
    document.getElementById('emi-amount').value = emi.amount || '';
    document.getElementById('emi-due-day').value = emi.dueDay || '';
    document.getElementById('emi-account').value = emi.accountId || '';
    document.getElementById('emi-category').value = emi.category || 'EMI';
    document.getElementById('modal-emi-title').innerText = 'Edit EMI/Bill';
    document.getElementById('btn-save-emi').innerText = 'Update';
    showModal('modal-emi');
};

const deleteEmi = async (emiId) => {
    const emi = appState.scheduledEmis.find((item) => item.id === emiId);
    if (!emi) return showToast('EMI not found');
    if (!confirm(`Delete ${emi.name}?`)) return;

    try {
        await window.db.deleteRecord('scheduled_emis', emiId);
        showToast('EMI/Bill deleted');
    } catch (error) {
        console.error(error);
        alert('Error deleting EMI/Bill');
    }
};

const markEmiPaid = async (emiId) => {
    const emi = appState.scheduledEmis.find((item) => item.id === emiId);
    if (!emi) return showToast('EMI not found');

    const currentMonth = getCurrentMonthKey();
    if (emi.lastPaidMonth === currentMonth && !confirm('This EMI is already marked paid this month. Add another payment?')) return;

    try {
        await window.db.addRecord('transactions', {
            userId: appState.user.uid,
            type: 'expense',
            amount: parseFloat(emi.amount),
            category: emi.category || emi.name,
            from_account: emi.accountId,
            date: new Date().toISOString().slice(0, 10),
            note: `${emi.name} paid`,
            emiId,
            timestamp: new Date().toISOString()
        });
        await window.db.updateRecord('scheduled_emis', emiId, {
            lastPaidMonth: currentMonth,
            lastPaidAt: new Date().toISOString()
        });
        await window.db.addNotification(appState.user.uid, 'EMI Paid', `${emi.name} marked as paid for ${currentMonth}.`);
        showToast('EMI marked as paid');
    } catch (error) {
        console.error(error);
        alert('Error marking EMI paid');
    }
};

// --- Notifications ---
const updateNotificationsUI = () => {
    const unreadCount = appState.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('unread-badge');
    
    if(unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    const list = document.getElementById('notifications-list');
    list.innerHTML = '';
    
    if(appState.notifications.length === 0) {
        list.innerHTML = '<p class="text-sm text-gray-500 text-center mt-10">No notifications.</p>';
        return;
    }

    appState.notifications.forEach(n => {
        const date = new Date(n.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        list.innerHTML += `
            <div onclick="window.app.openNotification('${n.id}')" class="bg-white p-3 rounded-xl border ${n.read ? 'border-gray-100' : 'border-blue-200 bg-blue-50'} shadow-sm cursor-pointer">
                <p class="text-sm font-bold text-gray-800">${escapeHtml(n.title)}</p>
                <p class="text-xs text-gray-600 mt-1">${escapeHtml(n.message)}</p>
                <p class="text-[9px] text-gray-400 mt-2">${date}</p>
            </div>
        `;
    });
};


const markNotificationRead = async (notificationId) => {
    const notification = appState.notifications.find((item) => item.id === notificationId);
    if (!notification || notification.read) return;

    try {
        await window.db.updateRecord('notifications', notificationId, { read: true, readAt: new Date().toISOString() });
    } catch (error) {
        console.error('Error marking notification read', error);
    }
};

const openNotification = async (notificationId) => {
    const notification = appState.notifications.find((item) => item.id === notificationId);
    if (!notification) return;
    await markNotificationRead(notificationId);
    openNotificationTarget(notification);
};

document.getElementById('backup-import-file')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !appState.user) return;

    try {
        const backup = JSON.parse(await file.text());
        const collections = ['accounts', 'transactions', 'scheduled_emis', 'budgets', 'investments', 'assets', 'liabilities', 'goals', 'family_members'];
        let imported = 0;

        for (const collectionName of collections) {
            const rows = Array.isArray(backup[collectionName]) ? backup[collectionName] : [];
            for (const row of rows) {
                const { id, ...data } = row;
                await window.db.addRecord(collectionName, {
                    ...data,
                    userId: appState.user.uid,
                    importedAt: new Date().toISOString()
                });
                imported += 1;
            }
        }

        showToast(imported ? t('backupImportDone') : t('backupImportEmpty'));
    } catch (error) {
        console.error('Backup import error', error);
        showToast('Backup import failed.');
    }
});

// Global Exports for HTML inline handlers
window.app = { 
    initAfterAuth, 
    switchTab, 
    setAddType, 
    showModal, 
    hideModal, 
    saveNewAccount,
    editAccount,
    deleteAccount,
    resetAccountModal,
    editTransaction,
    deleteTransaction,
    resetRecordForm,
    showDebtDetails,
    settleDebt,
    clearNotifications,
    markAllNotificationsRead,
    exportBackupJSON,
    openBackupImport,
    closeAddSheet,
    toggleActionMenu,
    applyTxnFilters,
    exportTransactionsCSV,
    exportReportPDF,
    exportYearlyTaxReport,
    setVaultTab,
    addBudget,
    addInvestment,
    addAsset,
    addLiability,
    addGoal,
    addFamilyMember,
    savePlanningRecord,
    deletePlanningRecord,
    resetEmiModal,
    saveEmi,
    editEmi,
    deleteEmi,
    markEmiPaid,
    markNotificationRead,
    openNotification,
    setSyncStatus,
    filterTxns: (type) => {
        appState.activeTxnFilter = type;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const isActive = btn.textContent.trim().toLowerCase() === type || (type === 'all' && btn.textContent.trim().toLowerCase() === 'all');
            btn.classList.toggle('bg-gray-800', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('bg-gray-200', !isActive);
            btn.classList.toggle('text-gray-700', !isActive);
        });
        renderTxnList(type);
    },
    showToast
};

// Boot
window.onload = () => {
    initAuth();
};
