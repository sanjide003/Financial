import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');
const app = await readFile('js/app.js', 'utf8');

test('critical production UI actions are wired in the app shell', () => {
  assert.match(html, /exportTransactionsCSV\(\)/);
  assert.match(html, /exportReportPDF\(\)/);
  assert.match(html, /markAllNotificationsRead\(\)/);
  assert.match(html, /backup-import-file/);
  assert.match(html, /sync-status/);
  assert.match(html, /notification-drawer/);
  assert.match(html, /shared-with-me-list/);
  assert.match(html, /email-auth-form/);
  assert.match(html, /btn-reset-password/);
  assert.match(html, /btn-vault-budgets/);
  assert.match(html, /btn-vault-wealth/);
  assert.match(html, /btn-vault-goals/);
  assert.match(html, /btn-vault-family/);
  assert.match(html, /modal-planning/);
  assert.match(html, /exportYearlyTaxReport/);
  assert.match(html, /exportAccountantTaxCSV/);
  assert.match(html, /shared-with-me-list/);
  assert.match(html, /Chart\.js/);
  assert.match(html, /vault-sidebar/);
  assert.match(html, /btn-vault-settings/);
  assert.match(html, /data-lang-option="ar"/);
  assert.match(html, /modal-confirm/);
  assert.match(html, />More<|More<\/span>/);
  assert.match(html, /applyFamilySharing/);
});

test('app exposes handlers required by inline UI actions', () => {
  assert.match(app, /exportTransactionsCSV/);
  assert.match(app, /exportReportPDF/);
  assert.match(app, /exportBackupJSON/);
  assert.match(app, /openBackupImport/);
  assert.match(app, /setSyncStatus/);
  assert.match(app, /openNotificationDrawer/);
  assert.match(app, /closeNotificationDrawer/);
  assert.match(app, /toggleTheme/);
  assert.match(app, /setAppLanguage/);
  assert.match(app, /showConfirmDialog/);
  assert.match(app, /addInvestment/);
  assert.match(app, /addGoal/);
  assert.match(app, /addFamilyMember/);
  assert.match(app, /savePlanningRecord/);
  assert.match(app, /editPlanningRecord/);
  assert.match(app, /generateRecurringInvestment/);
  assert.match(app, /processAutomaticRecurringInvestments/);
  assert.match(app, /renderAdvancedCharts/);
  assert.match(app, /getIndianTaxSection/);
  assert.match(app, /popstate/);
});


test('shared family listener is available for collaborative records', async () => {
  const db = await readFile('js/db.js', 'utf8');
  assert.match(db, /listenToSharedData/);
  assert.match(db, /array-contains/);
});


test('manifest uses root start URL for installed PWA launch', async () => {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.id, '/');
});


test('native blocking dialogs are not used in app actions', () => {
  assert.doesNotMatch(app, /alert\(/);
  assert.doesNotMatch(app, /confirm\(/);
});
