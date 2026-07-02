# FinTrack Status & Production Roadmap

## ഇപ്പോൾ പൂർത്തിയായത്
- Requested simple PWA folder structure നിലനിർത്തി: `index.html`, `manifest.json`, `sw.js`, `css/`, `icons/`, `js/`.
- Project documentation, local check scripts, and unit-test entry points ചേർത്തു.
- Firebase security rules scaffold ചേർത്തു; user-owned collections only authenticated owner can access.
- Firestore indexes documentation/scaffold ചേർത്തു.
- Transaction form validation ശക്തമാക്കി: positive amount, valid date, required category/person, required account, transfer same-account block, debt reminder range.
- Calculation module Node test-friendly ആക്കി and unit tests ചേർത്തു.
- Firestore offline local cache enable ചെയ്തു.
- Monthly/filtered transactions CSV export ചേർത്തു.
- Notification Read All and debt reminder deep-link behavior ചേർത്തു.
- GitHub Actions quality-check workflow ചേർത്തു.
- Deployment and privacy/security Malayalam docs ചേർത്തു.
- Firebase Hosting config and GitHub deploy workflow scaffold ചേർത്തു.
- Vercel static hosting config and Malayalam publish guide ചേർത്തു.
- Captcha/App Check runtime dependency ഒഴിവാക്കി; free-plan friendly ആയി Firebase Auth + Firestore rules മാത്രം ഉപയോഗിക്കുന്നു.
- Email/password signup, login, password reset support ചേർത്തു.
- India timezone പോലുള്ള UTC+ timezones-ൽ record save/update തടഞ്ഞ date validation bug fix ചെയ്തു.
- Sync status indicator ചേർത്തു.
- PDF print/export, JSON backup export/import ചേർത്തു.
- Draft privacy policy, terms, data retention, audit checklist, and full product roadmap ചേർത്തു.
- Static E2E smoke checks ചേർത്തു.

## Production-ready ആകാൻ ഇനി ബാക്കി
1. Firebase Console-ൽ `firestore.rules` and `firestore.indexes.json` deploy ചെയ്യുക.
2. Dev/Staging/Production Firebase projects വേർതിരിക്കുക.
3. Firebase Authentication Sign-in method-ൽ Email/Password enable ചെയ്യുക.
4. Vercel project deploy ചെയ്യുക.
5. Real browser Playwright/Cypress E2E suite add ചെയ്യുക.
6. Sync conflict resolution UX polish ചെയ്യുക.
7. Remaining UI labels full Malayalam/English i18n dictionary-ലേക്ക് migrate ചെയ്യുക.
8. Server-side scheduled/push notifications പരിഗണിക്കുക.
9. Draft privacy policy/terms/data retention legal review ചെയ്ത് publish ചെയ്യുക.
10. Lighthouse/accessibility/performance audit execute ചെയ്ത് findings fix ചെയ്യുക.

## Release readiness
- Current level: MVP / beta-ready after Firebase rules deployment.
- Not yet: fully public production-ready financial app.
