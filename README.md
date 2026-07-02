# FinTrack - Personal Finance PWA

FinTrack is a mobile-first personal finance PWA for tracking accounts, income, expenses, transfers, debts, EMIs/bills, reports, and notifications.

## Folder structure

```text
/
├── index.html
├── manifest.json
├── sw.js
├── PRODUCT_BLUEPRINT_ML.md
├── README.md
├── docs/
│   ├── STATUS_ML.md
│   ├── DEPLOYMENT_ML.md
│   ├── VERCEL_PUBLISH_ML.md
│   ├── PRIVACY_SECURITY_ML.md
│   ├── PRIVACY_POLICY_ML.md
│   ├── TERMS_ML.md
│   ├── DATA_RETENTION_ML.md
│   └── AUDIT_CHECKLIST_ML.md
├── css/
│   └── style.css
├── icons/
│   ├── icon-192.svg
│   └── icon-512.svg
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── calc.js
│   ├── db.js
│   ├── i18n.js
│   └── firebase-config.js
├── tests/
│   └── calc.test.js
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── vercel.json
├── .firebaserc.example
├── package.json
└── .env.example
```

## Local checks

```bash
npm run check
```

This runs JavaScript syntax checks, JSON validation, unit tests, and static E2E smoke checks.

## Firebase deployment checklist

1. Create separate Firebase projects for development, staging, and production.
2. Enable Google Authentication and add the deployed domain to authorized domains.
3. Deploy `firestore.rules` and `firestore.indexes.json` before using real data.
4. Enable Firebase App Check for production.
5. Keep `js/firebase-config.js` aligned with the intended Firebase project for the deployment target.

## Current status

See `docs/STATUS_ML.md` for completed work and the remaining production-readiness roadmap. Use `docs/DEPLOYMENT_ML.md` and `docs/VERCEL_PUBLISH_ML.md` for release steps, `docs/PRIVACY_SECURITY_ML.md` for security/privacy notes, and the policy/audit docs for launch readiness.
