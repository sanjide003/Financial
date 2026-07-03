# FinTrack Production Deployment Checklist

## 1) Firebase setup
- Dev, staging, production എന്നീ മൂന്ന് Firebase projects വേർതിരിക്കുക.
- Google Authentication enable ചെയ്യുക.
- Hosting domain Firebase Authentication authorized domains-ൽ ചേർക്കുക.
- Firebase App Check production-ൽ enforce ചെയ്യുക.

## 2) Firestore rules/indexes deploy
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 3) Quality gate
```bash
npm run check
```

## 4) Release verification
- New user login.
- Account create/edit/delete.
- Income/expense/transfer/debt create/edit/delete.
- Debt reminder notification click opens the related debt detail.
- EMI mark paid creates expense transaction.
- Reports month switch and CSV export.
- PWA install prompt and service worker cache.
- Offline reload shows the app shell and Firestore cached data where available.

## 5) Go-live policy
- Real financial data allow ചെയ്യുന്നതിന് മുമ്പ് Firestore rules deployed ആണെന്ന് verify ചെയ്യണം.
- Privacy policy and data export path publish ചെയ്യണം.
- Backup/restore policy communicate ചെയ്യണം.
