# Privacy & Security Notes

## Data handled
FinTrack stores personal finance records such as accounts, transactions, debt contacts, EMI schedules, and notifications.

## Security controls added in repo
- Firestore rules restrict user-owned collections to authenticated owners.
- Client-side validation blocks common invalid financial records.
- Firestore local persistence is enabled for offline cached usage.
- CSV export stays local to the user's browser download flow.

## Production controls still required outside this repo
- Firebase App Check enforcement.
- Firebase Authentication authorized-domain review.
- Privacy policy and terms.
- Support process for data deletion/export requests.
- Monitoring for failed auth/rules requests.
