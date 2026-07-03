# FinTrack Full Product Plan — ജീവിതത്തിലെ മുഴുവൻ finance tracking

## ലക്ഷ്യം
ഒരു സാധാരണ മനുഷ്യന്റെ ദിനംപ്രതി ചെലവ്, വരവ്, കടം, EMI, savings, investments, insurance, assets, liabilities, goals, reports എല്ലാം ഒരിടത്ത് കാണാൻ കഴിയുന്ന personal finance system ആക്കുക.

## Phase 1 — Stable Daily Money Tracking
- Email/password + Google login.
- Cash/bank/wallet accounts.
- Income, expense, transfer, debt.
- EMI/bill reminders.
- CSV/PDF/backup export.
- Monthly reports.

## Phase 2 — Budget & Categories
- Fixed expense: rent, EMI, insurance, school fee.
- Variable expense: food, travel, fuel, shopping, medical.
- Category budgets with alerts.
- Daily/weekly/monthly spending limits.
- Family/person tags.

## Phase 3 — Investments
- Investment account types: Mutual Fund, Stock, Gold, FD/RD, Chitty, Crypto, Real Estate, PF/NPS.
- Investment transaction types: buy, sell, dividend, interest, SIP, redemption.
- Capital invested, current value, profit/loss, XIRR-ready history.
- Passive income report: dividend, interest, rent, capital gains.

## Phase 4 — Assets & Liabilities
- Assets: cash, bank, gold, property, vehicle, investments.
- Liabilities: loans, credit card, borrowed money, pending bills.
- True net worth = assets - liabilities.
- Cash balance vs net worth separate display.

## Phase 5 — Goals & Planning
- Emergency fund goal.
- House/car/education/travel goals.
- Debt payoff planner.
- Savings rate and runway calculation.

## Phase 6 — Advanced Reports
- Monthly cashflow.
- Category trend.
- Account-wise flow.
- Investment performance.
- Debt aging.
- Yearly tax-ready summary.

## Implemented in current repo
- Budget records with monthly/category limit.
- Investment records with invested amount, current value, and passive income.
- Asset records and liability records.
- Goal records with target/saved progress.
- Dashboard true net worth, investment value, liabilities, and goal progress cards.
- Reports investment and true net worth summary cards.
- Modal-based add/edit entry for budget, investment, asset, liability, goal, and family member records.
- Budget usage progress bars based on matching monthly expense category.
- Report charts for budget usage and investment gain/loss.
- Recurring SIP/contribution tracking and user-confirmed SIP transaction generation.
- Yearly tax summary print/PDF report with tax category grouping.
- Family member role tracking and sharedWith read-rule support for planning records.

## Next implementation order
1. Add richer historical charts with a charting library if needed.
2. Add automatic recurring transaction generation only after explicit schedule consent.
3. Add accountant-ready export formats per local tax rules.
4. Add collaborative UI for shared records received from family members.

## Phase 8 — Optional Advanced Polish Completed
- Rich historical charts: Chart.js line/bar charts for budget history, expenses, and investment performance.
- Automatic recurring schedule engine: opt-in investment SIP auto-generation with monthly guard to avoid duplicate entries.
- Accountant export: local India-oriented tax bucket CSV for accountant review and filing preparation.
- Collaborative UI: family-shared planning records now appear in a read-only “Shared With Me” panel.
