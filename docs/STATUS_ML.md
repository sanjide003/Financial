# FinTrack Status & Production Roadmap

## ഇപ്പോൾ പൂർത്തിയായത്
- Requested simple PWA folder structure നിലനിർത്തി: `index.html`, `manifest.json`, `sw.js`, `css/`, `icons/`, `js/`.
- Project documentation, local check scripts, and unit-test entry points ചേർത്തു.
- Firebase security rules scaffold ചേർത്തു; user-owned collections only authenticated owner can access.
- Firestore indexes documentation/scaffold ചേർത്തു.
- Transaction form validation ശക്തമാക്കി: positive amount, valid date, required category/person, required account, transfer same-account block, debt reminder range.
- Calculation module Node test-friendly ആക്കി and unit tests ചേർത്തു.

## Production-ready ആകാൻ ഇനി ബാക്കി
1. Firebase Console-ൽ `firestore.rules` and `firestore.indexes.json` deploy ചെയ്യുക.
2. Dev/Staging/Production Firebase projects വേർതിരിക്കുക.
3. Firebase App Check enable ചെയ്യുക.
4. Hosting pipeline/CI setup ചെയ്യുക.
5. Browser E2E tests add ചെയ്യുക.
6. Firestore offline persistence + sync status indicator ചേർക്കുക.
7. Full Malayalam/English i18n strings centralize ചെയ്യുക.
8. CSV/PDF export, backup/restore add ചെയ്യുക.
9. Privacy policy, terms, data retention policy publish ചെയ്യുക.
10. Lighthouse/accessibility/performance audit നടത്തുക.

## Release readiness
- Current level: MVP / beta-ready after Firebase rules deployment.
- Not yet: fully public production-ready financial app.
