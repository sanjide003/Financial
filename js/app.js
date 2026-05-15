import { initAuth } from './auth.js';
import { orderBy } from './firebase-config.js';

let appState = {
    user: null,
    accounts: [],
    transactions: [],
    notifications: []
};

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
    if(tabId === 'add') setupAddForm();
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

    Object.values(stats.accBalances).forEach(acc => {
        const cardHtml = `
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <span class="text-[10px] text-gray-500 font-bold uppercase truncate">${acc.name}</span>
                <span class="text-sm font-bold text-gray-800 mt-1">₹${acc.balance.toFixed(2)}</span>
            </div>
        `;
        accListHome.innerHTML += cardHtml;

        const fullRowHtml = `
            <div class="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-50 text-secondary flex items-center justify-center"><i class="fa-solid fa-building-columns"></i></div>
                    <span class="font-semibold text-gray-800">${acc.name}</span>
                </div>
                <span class="font-bold text-lg text-gray-800">₹${acc.balance.toFixed(2)}</span>
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
            hasDebts = true;
            const isOwedToMe = amount > 0;
            peopleList.innerHTML += `
                <div class="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <span class="text-sm font-medium text-gray-700">${person}</span>
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
        filtered = filtered.filter(t => t.type.includes(filter));
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
        else if(t.type.includes('loan')) { icon = 'fa-handshake'; colorClass = 'bg-orange-100 text-orange-600'; }

        // Formatting date
        const dateObj = new Date(t.date);
        const day = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        const getAccName = (id) => {
            const acc = appState.accounts.find(a => a.id === id);
            return acc ? acc.name : 'Unknown';
        };

        let subtext = t.type === 'transfer' ? `${getAccName(t.from_account)} → ${getAccName(t.to_account)}` : getAccName(t.type === 'income' || t.type === 'loan_taken' ? t.to_account : t.from_account);

        container.innerHTML += `
            <div class="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${colorClass}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-gray-800">${t.category}</p>
                        <p class="text-[10px] text-gray-400 font-medium">${day} • ${subtext}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-bold ${signClass}">${amountPrefix}₹${parseFloat(t.amount).toFixed(2)}</p>
                </div>
            </div>
        `;
    });
};

// --- Form & Input Handling ---
const setupAddForm = () => {
    const fromSelect = document.getElementById('form-from-account');
    const toSelect = document.getElementById('form-to-account');
    
    const options = appState.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
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

document.getElementById('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-record');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const rawType = document.getElementById('form-type').value;
    let finalType = rawType;
    if(rawType === 'debt') {
        finalType = document.querySelector('input[name="debt_direction"]:checked').value;
    }

    const data = {
        userId: appState.user.uid,
        type: finalType,
        amount: parseFloat(document.getElementById('form-amount').value),
        category: document.getElementById('form-category').value,
        date: document.getElementById('form-date').value,
        note: document.getElementById('form-note').value,
        timestamp: new Date().toISOString()
    };

    if(rawType === 'expense' || rawType === 'transfer' || finalType === 'loan_given') {
        data.from_account = document.getElementById('form-from-account').value;
    }
    if(rawType === 'income' || rawType === 'transfer' || finalType === 'loan_taken') {
        data.to_account = document.getElementById('form-to-account').value;
    }

    try {
        await window.db.addRecord('transactions', data);
        showToast('Record saved successfully!');
        document.getElementById('add-form').reset();
        document.getElementById('form-date').valueAsDate = new Date(); // reset date
        switchTab('home');
    } catch (err) {
        alert("Error saving record");
    } finally {
        btn.innerHTML = 'Save Record';
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
                    <span class="font-bold text-gray-700">${c.name}</span>
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

const saveNewAccount = async () => {
    const nameInput = document.getElementById('new-acc-name');
    const name = nameInput.value.trim();
    if(!name) return alert("Please enter a name");

    try {
        await window.db.addRecord('accounts', {
            userId: appState.user.uid,
            name: name,
            createdAt: new Date().toISOString()
        });
        nameInput.value = '';
        hideModal('modal-new-account');
        showToast("Account added!");
        setupAddForm(); // Refresh dropdowns
    } catch(e) {
        alert("Error adding account");
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
            <div class="bg-white p-3 rounded-xl border ${n.read ? 'border-gray-100' : 'border-blue-200 bg-blue-50'} shadow-sm">
                <p class="text-sm font-bold text-gray-800">${n.title}</p>
                <p class="text-xs text-gray-600 mt-1">${n.message}</p>
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
