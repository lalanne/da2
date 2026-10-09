import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * Spec 016 Coverage item 6 (spec 010 — expense splitting), plus the
 * cross-parent shared-receipt visibility deferred from item 5 (spec 003):
 * propose/approve a split table, share a receipt under it, see the balance
 * and the shared receipt update live for both parents, record a
 * settlement, and confirm it back to zero. Its own two-parent household
 * fixture (no split table yet) — separate from the custody fixture, since
 * this uploads a receipt and `receipts.spec.ts` already does that under
 * the custody fixture; sharing an account between two receipt-creating
 * specs collides when both run in the same parallel suite.
 */

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByTestId('continue-with-email-button').click();
  await page.getByTestId('email-field').fill(email);
  await page.getByTestId('password-field').fill(password);
  await page.getByTestId('email-submit-button').click();
}

test('propose/approve a split table, share a receipt, settle the balance', async ({ browser }) => {
  const aEmail = process.env.E2E_SPLIT_A_EMAIL;
  const aPassword = process.env.E2E_SPLIT_A_PASSWORD;
  const bEmail = process.env.E2E_SPLIT_B_EMAIL;
  const bPassword = process.env.E2E_SPLIT_B_PASSWORD;
  if (!aEmail || !aPassword || !bEmail || !bPassword) {
    throw new Error('E2E_SPLIT_* not set — did globalSetup run?');
  }
  const fixture = path.join(__dirname, '..', 'fixtures', 'receipt.png');

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();
  // confirmAlert() (the Alert.alert-on-web fix) uses window.confirm for the
  // share/settlement-adjacent confirms this test drives — auto-accept.
  a.on('dialog', (d) => d.accept());
  b.on('dialog', (d) => d.accept());

  try {
    // --- Parent A proposes the split table (defaults: 50/50) ---
    await signIn(a, aEmail, aPassword);
    await expect(a.getByTestId('web-nav-receipts')).toBeVisible({ timeout: 15_000 });
    await a.getByTestId('web-nav-receipts').click();
    await a.getByTestId('receipts-segment-shared').click();

    await expect(a.getByTestId('balance-define')).toBeVisible();
    await a.getByTestId('balance-define').click();
    await expect(a.getByTestId('split-propose')).toBeVisible();
    await a.getByTestId('split-propose').click();
    await expect(a.getByTestId('split-submit')).toBeVisible();
    await a.getByTestId('split-submit').click();
    // Proposing returns to the split-table view inside the same still-open
    // dialog (it live-updates once B approves) — close it via the backdrop
    // before interacting with the list behind it.
    await expect(a.getByTestId('split-cancel')).toBeVisible();
    await a.getByTestId('receipts-dialog-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(a.getByTestId('receipts-dialog')).toHaveCount(0);

    // --- Parent B approves it ---
    await signIn(b, bEmail, bPassword);
    await expect(b.getByTestId('web-nav-receipts')).toBeVisible({ timeout: 15_000 });
    await b.getByTestId('web-nav-receipts').click();
    await b.getByTestId('receipts-segment-shared').click();

    await expect(b.getByTestId('balance-define')).toBeVisible({ timeout: 10_000 });
    await b.getByTestId('balance-define').click();
    await expect(b.getByTestId('split-approve')).toBeVisible({ timeout: 10_000 });
    await b.getByTestId('split-approve').click();
    await expect(b.getByTestId('split-cancel')).toHaveCount(0, { timeout: 10_000 });
    await b.getByTestId('receipts-dialog-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(b.getByTestId('receipts-dialog')).toHaveCount(0);

    // --- Parent A uploads and shares a receipt under the new table ---
    await a.getByTestId('receipts-segment-mine').click();
    await a.getByTestId('receipts-add-button').click();
    const [fileChooser] = await Promise.all([
      a.waitForEvent('filechooser'),
      a.getByTestId('pick-library').click(),
    ]);
    await fileChooser.setFiles(fixture);
    await expect(a.getByTestId('receipt-amount')).toBeVisible({ timeout: 10_000 });
    await a.getByTestId('receipt-amount').fill('20000');
    await a.getByTestId('receipt-tag-medical').click();
    await a.getByTestId('receipt-submit').click();
    await expect(a.getByTestId('receipts-dialog')).toHaveCount(0, { timeout: 10_000 });

    const row = a.locator('[data-testid^="receipt-row-"]');
    await row.click();
    await expect(a.getByTestId('receipt-share-button')).toHaveText('Compartir con la otra persona', {
      timeout: 10_000,
    });
    await a.getByTestId('receipt-share-button').click();

    // --- Balance reflects it for A, and the shared receipt + balance show
    // live for B without a reload (the deferred spec 003 visibility check) ---
    await a.getByTestId('receipts-segment-shared').click();
    await expect(a.getByTestId('balance-line')).not.toHaveText('Están a mano', { timeout: 10_000 });

    await expect(b.locator('[data-testid^="receipt-row-"]')).toBeVisible({ timeout: 10_000 });
    await expect(b.getByTestId('balance-line')).not.toHaveText('Están a mano', { timeout: 10_000 });

    // --- Parent B (who owes) records the settlement, inside BalanceDetail ---
    await b.getByTestId('balance-record').click();
    await expect(b.getByTestId('settlement-open')).toBeVisible({ timeout: 10_000 });
    await b.getByTestId('settlement-open').click();
    await expect(b.getByTestId('settlement-amount')).toBeVisible();
    // Default direction is "I paid", which is correct here — B owes A.
    await b.getByTestId('settlement-amount').fill('10000');
    await b.getByTestId('settlement-submit').click();
    await expect(b.getByTestId('settlement-open')).toBeVisible({ timeout: 10_000 });
    await b.getByTestId('receipts-dialog-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(b.getByTestId('receipts-dialog')).toHaveCount(0);

    // --- Parent A opens BalanceDetail too, and confirms it live ---
    await a.getByTestId('balance-detail').click();
    const confirmButton = a.locator('[data-testid^="settlement-confirm-"]');
    await expect(confirmButton).toBeVisible({ timeout: 10_000 });
    await confirmButton.click();
    await a.getByTestId('receipts-dialog-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(a.getByTestId('receipts-dialog')).toHaveCount(0);

    await expect(a.getByTestId('balance-line')).toHaveText('Están a mano', { timeout: 10_000 });
    await expect(b.getByTestId('balance-line')).toHaveText('Están a mano', { timeout: 10_000 });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
