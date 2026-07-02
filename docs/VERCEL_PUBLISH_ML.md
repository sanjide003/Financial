# FinTrack Vercel Publish Guide — Firebase Free Plan

## ഞാൻ code-ൽ ചെയ്തു വെച്ചത്
- Vercel static hosting config: `vercel.json`.
- Firebase App Check site key and provider runtime config: `index.html`. Screenshot-ൽ Google Cloud Fraud Defense / Website Score key ആണ് കാണുന്നത്, അതിനാൽ current provider `recaptcha-enterprise` ആയി set ചെയ്തിട്ടുണ്ട്.
- Firestore rules/index deploy files: `firestore.rules`, `firestore.indexes.json`, `firebase.json`.
- Local quality command: `npm run check`.

## നിങ്ങൾ account-ൽ ചെയ്യേണ്ടത്
1. Firebase Console → Authentication → Settings → Authorized domains → Vercel domain add ചെയ്യുക.
2. Google Cloud reCAPTCHA/Fraud Defense key → allowed domains-ൽ Vercel domain add ചെയ്യുക.
3. Firebase Console → App Check → Web app → **reCAPTCHA Enterprise** choose ചെയ്യുക. സാധാരണ reCAPTCHA v3 key ആണെങ്കിൽ `index.html`-ൽ `FINTRACK_APP_CHECK_PROVIDER` value `recaptcha-v3` ആക്കണം.
4. Firebase CLI വഴി rules/indexes deploy ചെയ്യുക:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

5. Vercel → Add New Project → GitHub repo import → Framework `Other` → Deploy.
6. Deploy കഴിഞ്ഞ URL Firebase Auth/App Check domains-ൽ വീണ്ടും verify ചെയ്യുക.

## എനിക്ക് ചെയ്യാൻ കഴിയാത്തത്
നിങ്ങളുടെ Google/Firebase/Vercel account-ൽ login ചെയ്യാനും buttons click ചെയ്യാനും എനിക്ക് direct access ഇല്ല. Password അല്ലെങ്കിൽ private service account key chat-ൽ share ചെയ്യരുത്. ആവശ്യമെങ്കിൽ GitHub/Vercel/Firebase collaborator invite വഴി മാത്രം access കൊടുക്കണം.

## Free plan tips
- Cloud Functions ഒഴിവാക്കുക; client-side reminders മതി.
- Firestore usage dashboard നോക്കുക.
- Backup/PDF/CSV browser-side ആയതിനാൽ extra Firebase billing ഇല്ല.
