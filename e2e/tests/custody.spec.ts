import { test, expect, type Page } from '@playwright/test';

/**
 * Spec 016 Coverage item 3 (spec 004): custody pattern propose + approve,
 * driven through the real UI by two parents already sharing a household
 * (household linking has its own coverage in household.spec.ts) — two
 * independent Playwright browser contexts, since this needs two separate
 * signed-in sessions.
 */

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByTestId('continue-with-email-button').click();
  await page.getByTestId('email-field').fill(email);
  await page.getByTestId('password-field').fill(password);
  await page.getByTestId('email-submit-button').click();
}

test('one parent proposes a custody pattern, the other approves it, and both calendars update', async ({
  browser,
}) => {
  const aEmail = process.env.E2E_CUSTODY_A_EMAIL;
  const aPassword = process.env.E2E_CUSTODY_A_PASSWORD;
  const bEmail = process.env.E2E_CUSTODY_B_EMAIL;
  const bPassword = process.env.E2E_CUSTODY_B_PASSWORD;
  if (!aEmail || !aPassword || !bEmail || !bPassword) {
    throw new Error('E2E_CUSTODY_* not set — did globalSetup run?');
  }

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  try {
    // --- Parent A proposes the pattern ---
    await signIn(a, aEmail, aPassword);
    await expect(a.getByTestId('web-nav-calendar')).toBeVisible({ timeout: 15_000 });

    await expect(a.getByTestId('calendar-setup-pattern')).toBeVisible();
    await a.getByTestId('calendar-setup-pattern').click();

    // Wide web opens this as a WebDialog over the still-visible calendar.
    await expect(a.getByTestId('calendar-dialog')).toBeVisible();
    // Defaults (alternating weeks, anchor/effective-from today, 18:00
    // changeover, residential parent = A) are a valid proposal as-is.
    await a.getByTestId('pattern-submit').click();

    // The dialog closes and the empty-state CTA is gone — a pattern is now
    // pending (not yet approved, so "Configurar patrón" must not return).
    await expect(a.getByTestId('calendar-dialog')).toHaveCount(0);
    await expect(a.getByTestId('calendar-setup-pattern')).toHaveCount(0, { timeout: 10_000 });

    // --- Parent B approves it from the wide-web rail ---
    await signIn(b, bEmail, bPassword);
    await expect(b.getByTestId('calendar-rail-pending')).toBeVisible({ timeout: 15_000 });

    const approveButton = b.locator('[data-testid^="calendar-rail-approve-"]');
    await expect(approveButton).toBeVisible();
    await approveButton.click();

    await expect(b.getByTestId('calendar-rail-pending')).toHaveCount(0, { timeout: 10_000 });
    // hasPattern flips true once the approved proposal lands.
    await expect(b.getByTestId('calendar-change-pattern')).toBeVisible();

    // --- Real-time: parent A's still-open session picks up the approval
    // without a reload. ---
    await expect(a.getByTestId('calendar-change-pattern')).toBeVisible({ timeout: 10_000 });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
