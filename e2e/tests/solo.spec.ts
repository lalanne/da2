import { test, expect } from '@playwright/test';

/**
 * Spec 016 Coverage item 7 (spec 015 — solo parent): in a one-parent
 * household, a custody pattern and a split table self-approve immediately
 * on creation, by the proposer — no waiting for an approval that will
 * never come. Single session, since the whole point is that nobody else
 * is in the household yet.
 */
test('a solo parent self-approves a custody pattern and a split table', async ({ page }) => {
  const email = process.env.E2E_SOLO_EMAIL;
  const password = process.env.E2E_SOLO_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_SOLO_EMAIL/PASSWORD not set — did globalSetup run?');
  }

  await page.goto('/');
  await page.getByTestId('continue-with-email-button').click();
  await page.getByTestId('email-field').fill(email);
  await page.getByTestId('password-field').fill(password);
  await page.getByTestId('email-submit-button').click();
  await expect(page.getByTestId('web-nav-calendar')).toBeVisible({ timeout: 15_000 });

  // --- Custody pattern: proposing it is enough, immediately ---
  await expect(page.getByTestId('calendar-setup-pattern')).toBeVisible();
  await page.getByTestId('calendar-setup-pattern').click();
  await expect(page.getByTestId('calendar-dialog')).toBeVisible();
  await page.getByTestId('pattern-submit').click();
  await expect(page.getByTestId('calendar-dialog')).toHaveCount(0, { timeout: 10_000 });

  // Active immediately — no "esperando a tu co-madre o co-padre" wait.
  await expect(page.getByTestId('calendar-change-pattern')).toBeVisible();
  // Flagged as a unilateral decision, visible even to the proposer...
  await expect(page.getByTestId('calendar-provisional-badge')).toBeVisible();
  // ...but with no review action, since the only parent is the one who
  // made it (`needsReview` is proposer-exclusive by definition).
  await expect(page.getByTestId('calendar-acknowledge-pattern')).toHaveCount(0);

  // --- Split table: same self-approval, in Recibos ---
  await page.getByTestId('web-nav-receipts').click();
  await page.getByTestId('receipts-segment-shared').click();
  await expect(page.getByTestId('balance-define')).toBeVisible();
  await page.getByTestId('balance-define').click();
  await expect(page.getByTestId('split-propose')).toBeVisible();
  await page.getByTestId('split-propose').click();
  await expect(page.getByTestId('split-submit')).toBeVisible();
  await page.getByTestId('split-submit').click();

  // Active immediately — no pending banner, no "cancelar propuesta".
  await expect(page.getByTestId('split-cancel')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByTestId('split-provisional-badge')).toBeVisible();
  await expect(page.getByTestId('split-acknowledge')).toHaveCount(0);
});
