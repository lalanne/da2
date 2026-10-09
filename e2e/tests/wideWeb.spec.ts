import { test, expect } from '@playwright/test';

/**
 * Spec 016 Coverage item 8 (spec 012 — responsive web layout). Every other
 * e2e spec already runs at Playwright's default desktop viewport, so the
 * wide-web path (WebShell sidebar, WebDialog push views) is implicitly
 * covered many times over. What's genuinely untested elsewhere is the
 * *narrow* fallback and that the breakpoint itself is reactive — spec
 * 012's own Verification plan listed "resize across the breakpoint" as a
 * manual step; this automates it. Reuses the smoke fixture's account
 * (already a solo household, no pattern yet) — smoke.spec.ts never
 * touches custody data.
 *
 * Note: resizing across the breakpoint mid-flow swaps `MainScreen`'s
 * top-level JSX between two structurally different trees (`WebShell` vs.
 * `TabBar` wrapping), so React unmounts/remounts the active tab and any
 * in-progress local view state (an open form) resets. Spec 012 never
 * claims otherwise — only that the breakpoint *detection* is reactive
 * (`useWindowDimensions`), not that mid-form state survives a resize — so
 * this test verifies each viewport's behavior independently rather than
 * expecting one open dialog to carry across the resize.
 */
test('the layout switches live between narrow (TabBar/full-screen) and wide (sidebar/dialog)', async ({
  browser,
}) => {
  const email = process.env.E2E_SMOKE_EMAIL;
  const password = process.env.E2E_SMOKE_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_SMOKE_EMAIL/PASSWORD not set — did globalSetup run?');
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    await page.goto('/');
    await page.getByTestId('continue-with-email-button').click();
    await page.getByTestId('email-field').fill(email);
    await page.getByTestId('password-field').fill(password);
    await page.getByTestId('email-submit-button').click();

    // --- Narrow: bottom TabBar, full-screen push (spec 011, unchanged) ---
    await expect(page.getByTestId('tab-calendar')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('web-nav-calendar')).toHaveCount(0);

    await expect(page.getByTestId('calendar-setup-pattern')).toBeVisible();
    await page.getByTestId('calendar-setup-pattern').click();
    // A full navigation, not a dialog — no WebDialog wrapper at all.
    await expect(page.getByTestId('pattern-submit')).toBeVisible();
    await expect(page.getByTestId('calendar-dialog')).toHaveCount(0);

    // --- Resize live, crossing the breakpoint: the nav chrome itself
    // reacts immediately (useWindowDimensions), independent of whatever
    // view was open (which resets — see the file-level note above). ---
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByTestId('web-nav-calendar')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('tab-calendar')).toHaveCount(0);

    // --- Wide: the same action now opens as a centered dialog, not a
    // full navigation, and submitting (self-approves — solo household,
    // same mechanics coverage item 7 already proved) closes it. ---
    await expect(page.getByTestId('calendar-setup-pattern')).toBeVisible();
    await page.getByTestId('calendar-setup-pattern').click();
    await expect(page.getByTestId('calendar-dialog')).toBeVisible();
    await expect(page.getByTestId('pattern-submit')).toBeVisible();
    await page.getByTestId('pattern-submit').click();
    await expect(page.getByTestId('calendar-dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId('calendar-change-pattern')).toBeVisible();

    // --- Resize back down: nav chrome reverts live, and the now-active
    // pattern (real Firestore state, unaffected by any UI remount) still
    // shows — `calendar-change-pattern` is in the shared `base` JSX, not
    // a wide-only branch. ---
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('tab-calendar')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('web-nav-calendar')).toHaveCount(0);
    await expect(page.getByTestId('calendar-change-pattern')).toBeVisible();
  } finally {
    await context.close();
  }
});
