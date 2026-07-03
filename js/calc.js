const processTransactions = (transactions, accounts) => {
    let netWorth = 0;
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    
    // Dynamic account balances
    let accBalances = {};
    accounts.forEach(a => accBalances[a.id] = { name: a.name, balance: 0 });

    // Dynamic debt tracking
    let debts = { toPay: 0, toReceive: 0, people: {} };

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    transactions.forEach(t => {
        const amount = parseFloat(t.amount);
        if (!Number.isFinite(amount)) return;
        const isCurrentMonth = Boolean(t.date?.startsWith(currentMonth));

        if (t.type === 'income') {
            if(accBalances[t.to_account]) accBalances[t.to_account].balance += amount;
            netWorth += amount;
            if(isCurrentMonth) currentMonthIncome += amount;
        } 
        else if (t.type === 'expense') {
            if(accBalances[t.from_account]) accBalances[t.from_account].balance -= amount;
            netWorth -= amount;
            if(isCurrentMonth) currentMonthExpense += amount;
        }
        else if (t.type === 'transfer') {
            if(accBalances[t.from_account]) accBalances[t.from_account].balance -= amount;
            if(accBalances[t.to_account]) accBalances[t.to_account].balance += amount;
        }
        else if (t.type === 'loan_given') {
            // Money left your account
            if(accBalances[t.from_account]) accBalances[t.from_account].balance -= amount;
            netWorth -= amount; // temporarily reduces net worth
            
            debts.toReceive += amount;
            if(!debts.people[t.category]) debts.people[t.category] = 0;
            debts.people[t.category] += amount;
        }
        else if (t.type === 'loan_taken') {
            // Money entered your account
            if(accBalances[t.to_account]) accBalances[t.to_account].balance += amount;
            netWorth += amount; 
            
            debts.toPay += amount;
            if(!debts.people[t.category]) debts.people[t.category] = 0;
            debts.people[t.category] -= amount; // negative means we owe them
        }
        else if (t.type === 'debt_received') {
            // Repayment received from someone you had lent to
            if(accBalances[t.to_account]) accBalances[t.to_account].balance += amount;
            netWorth += amount;

            debts.toReceive -= amount;
            if(!debts.people[t.category]) debts.people[t.category] = 0;
            debts.people[t.category] -= amount;
        }
        else if (t.type === 'debt_paid') {
            // Repayment paid to someone you borrowed from
            if(accBalances[t.from_account]) accBalances[t.from_account].balance -= amount;
            netWorth -= amount;

            debts.toPay -= amount;
            if(!debts.people[t.category]) debts.people[t.category] = 0;
            debts.people[t.category] += amount;
        }
    });

    return { netWorth, currentMonthIncome, currentMonthExpense, accBalances, debts };
};

const generateMonthlyReport = (transactions, monthStr) => { // monthStr: "YYYY-MM"
    const filtered = transactions.filter(t => t.date?.startsWith(monthStr));
    
    let income = 0;
    let expense = 0;
    let categories = {};

    filtered.forEach(t => {
        const amount = parseFloat(t.amount);
        if(t.type === 'income') income += amount;
        if(t.type === 'expense') {
            expense += amount;
            categories[t.category] = (categories[t.category] || 0) + amount;
        }
    });

    // Sort categories by highest expense
    const sortedCategories = Object.keys(categories)
        .map(name => ({ name, amount: categories[name] }))
        .sort((a, b) => b.amount - a.amount);

    return { income, expense, savings: income - expense, sortedCategories };
}

if (typeof window !== 'undefined') {
    window.calc = { processTransactions, generateMonthlyReport };
}
export { processTransactions, generateMonthlyReport };
