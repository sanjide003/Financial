import { initAuth } from './auth.js';
let appState = {
    user: null,
    accounts: [],
    transactions: [],
    notifications: [],
    editingTransactionId: null,
    editingOriginalType: null,
    editingAccountId: null
};

const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

// --- UI Navigation & Setup ---
const switchTab = (tabId) => {
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
    if(tabId === 'transactions') renderTxnList('all');
    if(tabId === 'add') {
        if (!appState.editingTransactionId) resetRecordForm();
        setupAddForm();
    }
};

const showToast = (msg) => {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => toast.classList.add('opacity-0', 'pointer-events-none'), 3000);
};

// --- Data Fetching & Core Logic ---
const initAfterAuth = (user) => {
    appState.user = user;
    
    // Listen to Accounts
    window.db.listenToData(user.uid, 'accounts', (data) => {
        appState.accounts = data;
        updateAccountsUI();
    });

    // Listen to Transactions
    window.db.listenToData(user.uid, 'transactions', (data) => {
        // Sort data locally by date descending
        appState.transactions = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        updateDashboard();
        if(document.getElementById('view-transactions').classList.contains('active')) renderTxnList('all');
    });

    // Listen to Notifications
    window.db.listenToData(user.uid, 'notifications', (data) => {
        appState.notifications = data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        updateNotificationsUI();
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
    updateDashboard();
};

const updateDashboard = () => {
    const stats = window.calc.processTransactions(appState.transactions, appState.accounts);
    
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
                <div class="flex items-center gap-2">
                    <span class="font-bold text-lg text-gray-800">₹${acc.balance.toFixed(2)}</span>
                    <button onclick="window.app.editAccount('${accId}')" class="w-8 h-8 rounded-full bg-blue-50 text-blue-600" title="Edit account"><i class="fa-solid fa-pen text-xs"></i></button>
                    <button onclick="window.app.deleteAccount('${accId}')" class="w-8 h-8 rounded-full bg-red-50 text-red-600" title="Delete account"><i class="fa-solid fa-trash text-xs"></i></button>
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

    // Render Recent Txns
    renderTxnList('recent', 'home-recent-txns', 4);
};

const renderTxnList = (filter = 'all', containerId = 'full-txn-list', limit = null) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    let filtered = appState.transactions;
    if(filter !== 'all' && filter !== 'recent') {
        filtered = filtered.filter(t => filter === 'debt' ? ['loan_given', 'loan_taken', 'debt_received', 'debt_paid'].includes(t.type) : t.type.includes(filter));
    }
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

        // Formatting date
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
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${colorClass}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-gray-800">${escapeHtml(t.category)}</p>
                        <p class="text-[10px] text-gray-400 font-medium">${day} • ${escapeHtml(subtext)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-bold ${signClass}">${amountPrefix}₹${parseFloat(t.amount).toFixed(2)}</p>
                    ${showActions ? `<div class="flex justify-end gap-1 mt-1">
                        <button onclick="window.app.editTransaction('${t.id}')" class="text-[10px] font-bold text-blue-600 px-2 py-1 rounded bg-blue-50">Edit</button>
                        <button onclick="window.app.deleteTransaction('${t.id}')" class="text-[10px] font-bold text-red-600 px-2 py-1 rounded bg-red-50">Delete</button>
                    </div>` : ''}
                </div>
            </div>
        `;
    });
};

// --- Form & Input Handling ---
const setupAddForm = () => {
    const fromSelect = document.getElementById('form-from-account');
    const toSelect = document.getElementById('form-to-account');
    
    const options = appState.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;
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
    const labelCat = document.getElementById('label-category');

    wrapFrom.classList.remove('hidden');
    wrapTo.classList.add('hidden');
    wrapCat.classList.remove('hidden');
    wrapDebt.classList.add('hidden');

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
        labelCat.innerText = "Person's Name";
    } else {
        labelCat.innerText = 'Expense Category';
    }
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

    const data = {
        userId: appState.user.uid,
        type: finalType,
        amount: parseFloat(document.getElementById('form-amount').value),
        category: document.getElementById('form-category').value,
        date: document.getElementById('form-date').value,
        note: document.getElementById('form-note').value,
        timestamp: appState.editingTransactionId
            ? (appState.transactions.find((item) => item.id === appState.editingTransactionId)?.timestamp || new Date().toISOString())
            : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if(rawType === 'expense' || rawType === 'transfer' || finalType === 'loan_given' || finalType === 'debt_paid') {
        data.from_account = document.getElementById('form-from-account').value;
    }
    if(rawType === 'income' || rawType === 'transfer' || finalType === 'loan_taken' || finalType === 'debt_received') {
        data.to_account = document.getElementById('form-to-account').value;
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

const showDebtDetails = (person) => {
    const balance = getDebtBalanceForPerson(person);
    const history = appState.transactions.filter((item) => item.category === person && ['loan_given', 'loan_taken', 'debt_received', 'debt_paid'].includes(item.type));
    const list = document.getElementById('debt-detail-list');
    list.innerHTML = '';

    document.getElementById('debt-detail-name').innerText = person;
    document.getElementById('debt-detail-balance').innerText = `${balance >= 0 ? 'To Receive' : 'To Pay'}: ₹${Math.abs(balance).toFixed(2)}`;
    document.getElementById('debt-detail-person').value = person;
    document.getElementById('debt-settle-amount').value = Math.abs(balance).toFixed(2);
    document.getElementById('debt-settle-account').innerHTML = appState.accounts.map((account) => `<option value="${account.id}">${escapeHtml(account.name)}</option>`).join('');
    document.getElementById('btn-settle-debt').classList.toggle('hidden', Math.abs(balance) < 0.01);

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
            list.innerHTML += `
                <div class="flex justify-between items-center border-b border-gray-100 py-2 last:border-0">
                    <div>
                        <p class="text-xs font-bold text-gray-700">${labelMap[item.type]}</p>
                        <p class="text-[10px] text-gray-400">${item.date}${item.note ? ` • ${escapeHtml(item.note)}` : ''}</p>
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
            <div class="bg-white p-3 rounded-xl border ${n.read ? 'border-gray-100' : 'border-blue-200 bg-blue-50'} shadow-sm">
                <p class="text-sm font-bold text-gray-800">${escapeHtml(n.title)}</p>
                <p class="text-xs text-gray-600 mt-1">${escapeHtml(n.message)}</p>
                <p class="text-[9px] text-gray-400 mt-2">${date}</p>
            </div>
        `;
    });
};

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
    filterTxns: (type) => {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('bg-gray-800', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });
        event.target.classList.remove('bg-gray-200', 'text-gray-700');
        event.target.classList.add('bg-gray-800', 'text-white');
        renderTxnList(type);
    },
    showToast
};

// Boot
window.onload = () => {
    initAuth();
};
