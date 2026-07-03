# FinTrack Vercel Publish Guide — Firebase Free Plan

## ഞാൻ code-ൽ ചെയ്തു വെച്ചത്
- Vercel static hosting config: `vercel.json`.
- Vercel publish clean-up: `.vercelignore` വഴി docs/tests/GitHub workflows/Firebase deploy files hosted app bundle-ൽ നിന്ന് ഒഴിവാക്കി.
- Captcha/App Check code ഒഴിവാക്കി; Firebase Auth + Firestore rules ആണ് ഇപ്പോൾ primary protection.
- Firestore rules/index deploy files: `firestore.rules`, `firestore.indexes.json`, `firebase.json`.
- Local quality command: `npm run check`.

## നിങ്ങൾ account-ൽ ചെയ്യേണ്ടത്
1. Firebase Console → Authentication → Settings → Authorized domains → Vercel domain add ചെയ്യുക.
2. Firebase Console → Authentication → Sign-in method → Email/Password enable ചെയ്യുക.
3. Firebase CLI വഴി rules/indexes deploy ചെയ്യുക:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

4. Vercel → Add New Project → GitHub repo import → Framework `Other` → Deploy.
5. Deploy കഴിഞ്ഞ URL Firebase Auth Authorized domains-ൽ വീണ്ടും verify ചെയ്യുക.

## എനിക്ക് ചെയ്യാൻ കഴിയാത്തത്
നിങ്ങളുടെ Google/Firebase/Vercel account-ൽ login ചെയ്യാനും buttons click ചെയ്യാനും എനിക്ക് direct access ഇല്ല. Password അല്ലെങ്കിൽ private service account key chat-ൽ share ചെയ്യരുത്. ആവശ്യമെങ്കിൽ GitHub/Vercel/Firebase collaborator invite വഴി മാത്രം access കൊടുക്കണം.

## Free plan tips
- Cloud Functions ഒഴിവാക്കുക; client-side reminders മതി.
- Firestore usage dashboard നോക്കുക.
- Backup/PDF/CSV browser-side ആയതിനാൽ extra Firebase billing ഇല്ല.


## Vercel-ൽ publish ആകേണ്ട runtime files മാത്രം
Vercel deployment-ൽ പ്രധാനമായി വേണ്ടത് `index.html`, `manifest.json`, `sw.js`, `css/`, `icons/`, `js/`, `vercel.json` എന്നിവയാണ്. Firebase rules/indexes repo-ൽ നിലനിർത്തിയിട്ടുണ്ട്, പക്ഷേ അവ Vercel static bundle-ൽ publish ചെയ്യേണ്ടതില്ല; Firebase CLI ഉപയോഗിച്ച് deploy ചെയ്യാനുള്ള backend config മാത്രമാണ്.
