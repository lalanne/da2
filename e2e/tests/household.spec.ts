import { test, expect, type Page } from '@playwright/test';

/**
 * Spec 016 Coverage item 2 (spec 002): household create + invite-code join,
 * driven through the real UI by two independent parents — two Playwright
 * browser contexts, since this needs two separate signed-in sessions, not
 * two tabs sharing one. Neither seeded account has a household; the whole
 * point is exercising the real onboarding flow, not bypassing it.
 */

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByTestId('continue-with-email-button').click();
  await page.getByTestId('email-field').fill(email);
  await page.getByTestId('password-field').fill(password);
  await page.getByTestId('email-submit-button').click();
}

test('one parent creates a household, the other joins with the invite code', async ({
  browser,
}) => {
  const creatorEmail = process.env.E2E_CREATOR_EMAIL;
  const creatorPassword = process.env.E2E_CREATOR_PASSWORD;
  const joinerEmail = process.env.E2E_JOINER_EMAIL;
  const joinerPassword = process.env.E2E_JOINER_PASSWORD;
  const creatorName = process.env.E2E_CREATOR_NAME;
  const joinerName = process.env.E2E_JOINER_NAME;
  if (!creatorEmail || !creatorPassword || !joinerEmail || !joinerPassword) {
    throw new Error('E2E_CREATOR_*/E2E_JOINER_* not set — did globalSetup run?');
  }

  const creatorContext = await browser.newContext();
  const joinerContext = await browser.newContext();
  const creator = await creatorContext.newPage();
  const joiner = await joinerContext.newPage();

  try {
    // --- Parent A creates the household ---
    await signIn(creator, creatorEmail, creatorPassword);

    await expect(creator.getByTestId('onboarding-create-button')).toBeVisible({
      timeout: 15_000,
    });
    await creator.getByTestId('onboarding-create-button').click();

    await creator.getByTestId('household-name-input').fill('Hogar E2E');
    await creator.getByTestId('child-name-input-0').fill('Sofía E2E');
    await creator.getByTestId('create-household-submit').click();

    // Known slow path (specs/016 progress notes): the app can hold a brief
    // spinner after create/join while the first household snapshot arrives.
    await expect(creator.getByTestId('web-nav-household')).toBeVisible({ timeout: 20_000 });
    await creator.getByTestId('web-nav-household').click();

    const code = (await creator.getByTestId('invite-code-value').innerText()).trim();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);

    // --- Parent B joins with that code ---
    await signIn(joiner, joinerEmail, joinerPassword);

    await expect(joiner.getByTestId('onboarding-join-button')).toBeVisible({ timeout: 15_000 });
    await joiner.getByTestId('onboarding-join-button').click();

    await joiner.getByTestId('invite-code-input').fill(code);
    await joiner.getByTestId('join-household-submit').click();

    await expect(joiner.getByTestId('web-nav-household')).toBeVisible({ timeout: 20_000 });
    await joiner.getByTestId('web-nav-household').click();

    // The joiner sees the creator as a household member...
    await expect(joiner.getByText(creatorName!)).toBeVisible();
    // ...and the invite code is now spent (no longer offered to share).
    await expect(joiner.getByTestId('invite-code-value')).toHaveCount(0);

    // --- Real-time: the creator's still-open session picks up the join
    // without a reload, via the household's onSnapshot listener. ---
    await expect(creator.getByText(joinerName!)).toBeVisible({ timeout: 10_000 });
  } finally {
    await creatorContext.close();
    await joinerContext.close();
  }
});
