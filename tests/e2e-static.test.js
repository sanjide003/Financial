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
  assert.match(html, /email-auth-form/);
  assert.match(html, /btn-reset-password/);
  assert.match(html, /btn-vault-budgets/);
  assert.match(html, /btn-vault-wealth/);
  assert.match(html, /btn-vault-goals/);
});

test('app exposes handlers required by inline UI actions', () => {
  assert.match(app, /exportTransactionsCSV/);
  assert.match(app, /exportReportPDF/);
  assert.match(app, /exportBackupJSON/);
  assert.match(app, /openBackupImport/);
  assert.match(app, /setSyncStatus/);
  assert.match(app, /addInvestment/);
  assert.match(app, /addGoal/);
});
