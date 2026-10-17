import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { test, expect } from '@playwright/test';

/**
 * Spec 011 (web platform) criterion 1 + spec 001 (auth) criterion 1, on web.
 *
 * Every other e2e spec signs in via spec 014's email/password form —
 * `smoke.spec.ts` says so explicitly, because the Google popup path is
 * exactly where `auth/popup-blocked` broke production on 2026-09-30 (spec
 * 011's amendment). This test drives the real popup instead of routing
 * around it.
 *
 * The Firebase Auth emulator substitutes its own fake IDP widget for
 * `signInWithPopup` — a real popup window, with an "Add new account" form
 * (email/display-name only, no password/account-picker) rather than
 * Google's actual UI. That widget's DOM is Firebase-owned, not this app's;
 * the selectors below (`#add-account-button`, `#email-input`, etc.) come
 * from inspecting it directly against the emulator, not from app code.
 */
test('signs in via the Google popup, reaches onboarding, creates a household, and a users/{uid} profile exists', async ({
  page,
  context,
}) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `google-e2e-${runId}@example.com`;
  const displayName = 'Google E2E';

  await page.goto('/');

  const popupPromise = context.waitForEvent('page');
  await page.getByTestId('google-sign-in-button').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');

  await popup.click('#add-account-button');
  await popup.fill('#email-input', email);
  await popup.fill('#display-name-input', displayName);
  await popup.click('#sign-in');

  // The bug this test exists to catch: `auth/popup-blocked` (or any other
  // popup-path failure) surfaces as this banner, not a thrown exception —
  // `signIn()` maps it to a friendly `AuthError` the Welcome screen renders.
  await expect(page.getByTestId('sign-in-error')).toHaveCount(0);

  // A brand-new account has no household yet, so spec 002's routing sends
  // it to onboarding, not criterion 1's literal "main screen" — that
  // wording predates spec 002 (see spec 001's 2026-10-17 amendment).
  // Reaching here already proves the full chain: popup credential ->
  // Firebase session -> `ensureUserProfile` -> household-aware routing.
  await expect(page.getByTestId('onboarding-create-button')).toBeVisible({ timeout: 15_000 });

  // Finish the flow through the real "main screen" the criterion names,
  // via the real Google provider rather than the email/password one every
  // other spec uses.
  await page.getByTestId('onboarding-create-button').click();
  await page.getByTestId('household-name-input').fill('Hogar Google E2E');
  await page.getByTestId('child-name-input-0').fill('Sofía Google E2E');
  await page.getByTestId('create-household-submit').click();

  // Known slow path (specs/016 progress notes): a brief spinner can follow
  // create/join while the first household snapshot arrives.
  await expect(page.getByTestId('web-nav-calendar')).toBeVisible({ timeout: 20_000 });

  // The other half of criterion 1: a `users/{uid}` profile document exists,
  // created on first sign-in by `ensureUserProfile` — asserted host-side
  // against the same Firestore emulator the page just wrote to.
  const db = getFirestore(initializeApp({ projectId: 'demo-da2' }, `verify-${runId}`));
  const matches = await db.collection('users').where('email', '==', email).get();
  expect(matches.size).toBe(1);
  const profile = matches.docs[0].data();
  expect(profile.displayName).toBe(displayName);
  expect(profile.householdId).toBeTruthy();
});
