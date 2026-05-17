# FinTrack ആപ്ലിക്കേഷന്റെ പൂർണ്ണ രൂപരേഖ (Malayalam Product Blueprint)

## 1) ആപ്പ് Vision & ലക്ഷ്യം
FinTrack വ്യക്തിഗത ധനകാര്യ നിയന്ത്രണത്തിനായുള്ള മൊബൈൽ-ഫസ്റ്റ് PWA ആണ്. ഇപ്പോഴുള്ള ഘടന (Auth, Dashboard, Transactions, Add Sheet, Reports, Accounts, Notifications) അടിസ്ഥാനമാക്കി ഇത് **daily money tracking + debt reminders + account-wise visibility** എന്ന മൂന്ന് പ്രധാന പ്രശ്നങ്ങൾ പരിഹരിക്കണം.

### പ്രധാന ലക്ഷ്യങ്ങൾ
- ദിനംപ്രതി വരുമാനവും ചെലവും വേഗത്തിൽ രേഖപ്പെടുത്തുക.
- ബാങ്ക്/കാഷ്/വാലറ്റ് ബാലൻസുകൾ ഏകോപിതമായി കാണിക്കുക.
- കടം കൊടുക്കൽ/എടുക്കൽ ട്രാക്ക് ചെയ്ത് റിമൈൻഡറുകൾ നൽകുക.
- മാസാന്ത വിശകലനം വഴി ചെലവ് നിയന്ത്രണ തീരുമാനങ്ങൾ എടുക്കാൻ സഹായിക്കുക.

---

## 2) ആപ്പിന്റെ സാധ്യതകൾ (Opportunities)

### A. Personal Finance Core
- Income/Expense/Transfer/Debt ഒരു flow-ൽ capture ചെയ്യൽ.
- Multi-account net-worth computation.
- Real-time monthly cash-flow snapshot.

### B. Debt & Reminder Differentiator
- Loan given / loan taken entries-ന് due date & reminder days.
- Notification center + unread badge ഉപയോഗിച്ച് action-first UX.
- "Action Required" cards വഴി dashboard alerting.

### C. PWA Utility
- Installable app (home screen add).
- Offline-tolerant data entry (future enhancement).
- Push notifications (future enhancement).

### D. Scalable Modules (Future-ready)
- Budget planning
- Goal tracking (emergency fund, vacation fund)
- Recurring subscriptions detection
- CSV export / import for migration

---

## 3) Roles & User Scenarios

### പ്രധാന user types
1. **Daily tracker user** — ദിവസവും ചെറിയ ചെലവുകൾ രേഖപ്പെടുത്തുന്നവർ.
2. **Family finance user** — വിവിധ അക്കൗണ്ടുകൾക്കിടയിൽ ട്രാൻസ്ഫർ നടത്തുന്നവർ.
3. **Debt-heavy user** — കടം തിരികെ വാങ്ങൽ/തിരിച്ചടവ് management ആവശ്യമായവർ.

### Top scenarios
- "ഇന്ന് ചെലവാക്കിയവ"
- "ഈ മാസം എത്ര ബാക്കി"
- "ആർക്കാണ് ഞാൻ കൊടുത്തത് / എനിക്ക് കൊടുക്കാനുള്ളത്"
- "എപ്പോൾ reminder വരണം"

---

## 4) Information Architecture (Tabs)

Bottom navigation + utility entries പരിഗണിച്ച് app-ൽ പ്രവർത്തന തട്ടുകൾ:
- **Home**
- **Transactions**
- **Add (Bottom Sheet)**
- **Reports**
- **Accounts**
- **Notifications** (header bell/profile menu വഴി)

---

## 5) ഓരോ Tab-ിന്റെയും കൃത്യമായ പ്രവർത്തന നിർവചനം

## 5.1 Home Tab (Dashboard)
**ഉദ്ദേശ്യം:** ഒരു സ്ക്രീനിൽ quick financial health.

**ഇപ്പോഴുള്ള core elements**
- Total Net Worth card
- This month Income / Expense
- Action Required alerts
- My Accounts quick grid
- Recent Transactions

**കൃത്യമാക്കേണ്ട functions**
- `loadDashboardSummary()` → നെറ്റ്‌വർത്ത്, മാസപ്രവാഹം.
- `renderActionAlerts()` → due EMI/debt reminders.
- `renderAccountsQuickView(limit=4)`.
- `renderRecentTransactions(limit=4)`.
- `navigateToDeepLink(section)` (Accounts/Transactions).

**Acceptance criteria**
- Summary values real-time data updates-ന് 1–2 sec-ൽ refresh.
- Alerts click ചെയ്‌താൽ ബന്ധപ്പെട്ട entry-യിലേക്ക് navigate ചെയ്യണം.
- Empty state: "ഇപ്പോൾ data ഇല്ല" എന്ന user-friendly message.

---

## 5.2 Transactions Tab
**ഉദ്ദേശ്യം:** പൂർണ്ണ history + filter/search.

**ഇപ്പോഴുള്ള elements**
- Month filter
- Account filter
- Search box
- Type chips: All/Income/Expense/Transfer/Debt
- Full transaction list

**കൃത്യമാക്കേണ്ട functions**
- `applyTxnFilters({month, account, search, type})`.
- `renderTransactionList({page, pageSize, sort})`.
- `openTransactionActions(txnId)` → edit/delete.
- `getTransactionMeta(txn)` → icon, color, sign, subtitle mapping.
- `exportTransactionsCSV(range)` (new).

**Acceptance criteria**
- Search category, note, phone, whatsapp, account പേരുകളിൽ match ആകണം.
- Filter combinations deterministic ആകണം.
- Delete-ന് confirm dialog നിർബന്ധം.

---

## 5.3 Add Tab (Bottom Sheet Form)
**ഉദ്ദേശ്യം:** friction കുറഞ്ഞ data entry.

**Modes**
- Expense
- Income
- Transfer
- Debt

**കൃത്യമാക്കേണ്ട functions**
- `setAddType(type)` → UI sections show/hide.
- `validateFormByType(type, formData)`.
- `saveRecord(formData)` with normalized payload.
- `resetRecordForm()` & `prefillForEdit(txnId)`.
- `categorySuggestionsByType(type)` + quick chips.

**Debt-specific**
- Direction: loan_given / loan_taken
- Contact fields: phone/whatsapp
- Due date + reminder offset
- Notification key generation for duplicates ഒഴിവാക്കാൻ

**Acceptance criteria**
- Required fields mode-specific ആകണം.
- Transfer-ൽ from/to same account അനുവദിക്കരുത്.
- Amount <=0 reject ചെയ്യണം.

---

## 5.4 Reports Tab
**ഉദ്ദേശ്യം:** വിശകലനവും തീരുമാന സഹായവും.

**കൃത്യമാക്കേണ്ട sections**
- Month selector
- Income vs Expense summary
- Category-wise expense breakdown
- Account-wise flow
- Trend: last 6 months net movement

**കൃത്യമാക്കേണ്ട functions**
- `computeMonthlyReport(month)`.
- `groupExpensesByCategory(month)`.
- `buildTrendSeries(months=6)`.
- `renderReportCards(reportData)`.
- `downloadReportPDF(month)` (future/new).

**Acceptance criteria**
- Month change-ൽ റിപ്പോർട്ട് മുഴുവൻ recalc.
- Zero-data month-ൽ meaningful placeholder.

---

## 5.5 Accounts Tab
**ഉദ്ദേശ്യം:** account lifecycle management + debt overview.

**ഇപ്പോഴുള്ള scope**
- Accounts full list
- Edit/Delete actions
- Debt summary: to pay / to receive / people list

**കൃത്യമാക്കേണ്ട functions**
- `createAccount(name, openingBalance?)`.
- `editAccount(accountId, fields)`.
- `deleteAccount(accountId, strategy)` where strategy=block|migrate.
- `computeAccountBalances(transactions)`.
- `showDebtDetails(personName)` timeline view.

**Acceptance criteria**
- Account delete ചെയ്യുമ്പോൾ linked txns handle policy വ്യക്തം.
- Duplicate account name warning.

---

## 5.6 Notifications Tab
**ഉദ്ദേശ്യം:** reminders/action center.

**കൃത്യമാക്കേണ്ട functions**
- `renderNotifications(order='desc')`.
- `markAsRead(notificationId)` / `markAllAsRead()`.
- `computeUnreadBadge()`.
- `openNotificationTarget(payload)`.

**Acceptance criteria**
- Unread badge header bell + list consistency.
- Reminder notification tap → ബന്ധപ്പെട്ട debt/EMI വിശദാംശം.

---

## 6) Cross-cutting Functional Requirements

### Data & Integrity
- Firestore collections: users, accounts, transactions, scheduled_emis, notifications.
- Timestamps ISO format standardize ചെയ്യുക.
- Soft-delete strategy പരിഗണിക്കുക (audit ആവശ്യത്തിനായി).

### Security & Privacy
- User-scoped queries മാത്രം.
- Phone/WhatsApp fields masked display option.
- Export files local-device only.

### UX
- Malayalam + English labels (bilingual microcopy).
- Form errors inline ആയി കാണിക്കുക.
- Toast success/failure unified style.

### Performance
- Large transaction lists pagination/virtualization.
- Derived stats memoization.
- Debounced search (200–300ms).

---

## 7) Implementation Roadmap (Phased)

### Phase 1 (Stabilize existing)
- CRUD reliability
- Filter correctness
- Debt reminder consistency
- Empty/error states polishing

### Phase 2 (Insights)
- Advanced reports
- Category intelligence
- CSV export

### Phase 3 (Growth)
- Budgeting
- Recurring detection
- Push notifications
- Multi-device sync improvements

---

## 8) Definition of Done (DoD)
- എല്ലാ tabs-ക്കും explicit function contracts docs-ൽ രേഖപ്പെടുത്തിയിരിക്കണം.
- Critical paths (login, add txn, filter, debt reminder, mark read) test pass.
- UI states: loading/empty/error/success എല്ലാം cover ചെയ്യണം.
- Mobile viewport 360px മുതൽ 430px വരെ visually stable.

---

## 9) Suggested Next Engineering Tasks
1. `docs/functions-matrix.md` സൃഷ്ടിച്ച് ഓരോ tab-ഉം function-to-file mapping നിർവചിക്കുക.
2. Transactions filter logic-ന് unit tests ചേർക്കുക.
3. Debt reminder scheduling rules ഏകീകരിക്കുക.
4. Reports tab-ൽ category breakdown + 6 month trend finalize ചെയ്യുക.
5. Notifications deep-link actions implement/test ചെയ്യുക.
