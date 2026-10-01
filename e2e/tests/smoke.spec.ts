import { test, expect } from '@playwright/test';

/**
 * Spec 016, acceptance criteria 1–3: the harness's own smoke test. Drives
 * the real UI, not a repository function — proves the whole pipeline
 * (emulator-aware build, seeded account, Playwright, CI) works end to end
 * on one real flow before any later spec's coverage is added on top.
 */
test('signs in with email/password, reaches the main screen, and signs out', async ({ page }) => {
  const email = process.env.E2E_SMOKE_EMAIL;
  const password = process.env.E2E_SMOKE_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_SMOKE_EMAIL/PASSWORD not set — did globalSetup run?');
  }

  await page.goto('/');

  await page.getByTestId('continue-with-email-button').click();
  await page.getByTestId('email-field').fill(email);
  await page.getByTestId('password-field').fill(password);
  await page.getByTestId('email-submit-button').click();

  // Reaching the main screen. Playwright's default viewport is desktop-sized,
  // so spec 012's wide-web layout applies: a `WebShell` sidebar
  // (`web-nav-*` testIDs), not the phone-width floating `TabBar`
  // (`tab-*`) — both are the real app, this is just which one a plain
  // desktop browser gets by default.
  await expect(page.getByTestId('web-nav-calendar')).toBeVisible({ timeout: 15_000 });

  // Google's popup path must never be exercised by this flow — the bug this
  // whole suite exists to catch (specs/011's 2026-09-30 amendment) only ever
  // showed up there.
  await expect(page.getByTestId('sign-in-error')).toHaveCount(0);

  await page.getByTestId('web-nav-sign-out').click();

  await expect(page.getByTestId('continue-with-email-button')).toBeVisible();
});
