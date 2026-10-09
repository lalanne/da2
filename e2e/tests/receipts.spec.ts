import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * Spec 016 Coverage item 5 (spec 003): receipt upload, tagging, and private
 * listing. Reuses the custody fixture's parent A account — single session,
 * since this item deliberately stops short of sharing.
 *
 * Scope note: `ReceiptDetail`'s share button is gated on an agreed split
 * table (`activeSplit(proposals)` — spec 010's machinery) and goes through
 * a native `Alert.alert` confirm besides. Cross-parent visibility of a
 * *shared* receipt belongs with Coverage item 6 (010), which needs a split
 * table set up anyway — this item covers upload through to private listing.
 */
test('uploads a receipt with a tag and sees it privately listed', async ({ page }) => {
  const email = process.env.E2E_CUSTODY_A_EMAIL;
  const password = process.env.E2E_CUSTODY_A_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_CUSTODY_A_EMAIL/PASSWORD not set — did globalSetup run?');
  }
  const fixture = path.join(__dirname, '..', 'fixtures', 'receipt.png');

  await page.goto('/');
  await page.getByTestId('continue-with-email-button').click();
  await page.getByTestId('email-field').fill(email);
  await page.getByTestId('password-field').fill(password);
  await page.getByTestId('email-submit-button').click();

  await expect(page.getByTestId('web-nav-receipts')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('web-nav-receipts').click();

  await page.getByTestId('receipts-add-button').click();
  await expect(page.getByTestId('receipts-dialog')).toBeVisible();

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByTestId('pick-library').click(),
  ]);
  await fileChooser.setFiles(fixture);

  // The picker step is replaced by the metadata form once a file is set.
  await expect(page.getByTestId('receipt-amount')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('receipt-amount').fill('15000');
  await page.getByTestId('receipt-tag-medical').click();
  await page.getByTestId('receipt-submit').click();

  await expect(page.getByTestId('receipts-dialog')).toHaveCount(0, { timeout: 10_000 });

  const row = page.locator('[data-testid^="receipt-row-"]');
  await expect(row).toBeVisible();
  await expect(row.getByText('Privado')).toBeVisible();

  // Filterable by the tag it was uploaded with.
  await page.getByTestId('receipts-tag-filter').getByText('Médico').click();
  await expect(row).toBeVisible();

  // Sharing is correctly blocked until a split table exists (spec 010).
  await row.click();
  await expect(page.getByTestId('receipt-share-button')).toHaveText('Definir reparto');
});
