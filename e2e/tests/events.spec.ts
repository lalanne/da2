import { test, expect, type Page } from '@playwright/test';

/**
 * Spec 016 Coverage item 4 (spec 005): kid events, no propose/approve —
 * either parent creates/edits and both see it in real time. Reuses the
 * two-parent household fixture custody.spec.ts seeds (events don't depend
 * on a custody pattern existing).
 */

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByTestId('continue-with-email-button').click();
  await page.getByTestId('email-field').fill(email);
  await page.getByTestId('password-field').fill(password);
  await page.getByTestId('email-submit-button').click();
}

test('one parent creates an event, the other sees it live and edits it', async ({ browser }) => {
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
  const title = `Dentista E2E ${Date.now()}`;
  const editedTitle = `${title} (editado)`;

  try {
    // --- Parent A creates the event ---
    await signIn(a, aEmail, aPassword);
    await expect(a.getByTestId('web-nav-events')).toBeVisible({ timeout: 15_000 });
    await a.getByTestId('web-nav-events').click();

    await a.getByTestId('events-add-button').click();
    await expect(a.getByTestId('events-dialog')).toBeVisible();
    await a.getByTestId('event-title').fill(title);
    // Defaults (type doctor, date today) are a valid event as-is.
    await a.getByTestId('event-submit').click();

    await expect(a.getByTestId('events-dialog')).toHaveCount(0);
    await expect(a.getByText(title)).toBeVisible();

    // --- Parent B sees it without creating anything, and edits it ---
    await signIn(b, bEmail, bPassword);
    await expect(b.getByTestId('web-nav-events')).toBeVisible({ timeout: 15_000 });
    await b.getByTestId('web-nav-events').click();

    await expect(b.getByText(title)).toBeVisible({ timeout: 10_000 });
    await b.getByText(title).click();
    await expect(b.getByTestId('event-edit-button')).toBeVisible();
    await b.getByTestId('event-edit-button').click();

    await expect(b.getByTestId('events-dialog')).toBeVisible();
    await b.getByTestId('event-title').fill(editedTitle);
    await b.getByTestId('event-submit').click();
    await expect(b.getByTestId('events-dialog')).toHaveCount(0);
    // Wide-web master-detail shows the title in both the list row and the
    // still-open detail pane at once — scope to the pane to avoid a
    // strict-mode "matched 2 elements" failure.
    await expect(b.getByTestId('events-detail-pane').getByText(editedTitle)).toBeVisible();

    // --- Real-time: parent A's still-open session picks up the edit
    // without a reload. ---
    await expect(a.getByText(editedTitle)).toBeVisible({ timeout: 10_000 });
    await expect(a.getByText(title, { exact: true })).toHaveCount(0);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
