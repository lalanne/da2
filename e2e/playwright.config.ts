import { defineConfig } from '@playwright/test';

/**
 * Spec 016 — e2e config. Runs inside `firebase emulators:exec` (see
 * `npm run test:e2e`), which starts Auth/Firestore/Storage/Hosting and sets
 * `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST` for us —
 * `globalSetup` below uses those to seed test data straight into the
 * emulator before any test runs.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./support/globalSetup.ts'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5050',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    // Issue #54: the one real sign-in bug this app has shipped
    // (`auth/popup-blocked`, specs/011's 2026-09-30 amendment) was
    // Safari-specific and doesn't reproduce on Chromium's defaults —
    // confirmed directly while building `googleSignIn.spec.ts` (re-ran it
    // with the bug reintroduced; it still passed). Scoped to the
    // auth-shaped specs via `testMatch`, not every file: engine-specific
    // breakage in this app has only ever been popup/gesture/storage
    // territory, not Firestore listeners, and running everything twice
    // would double the suite into #51's worker-starvation problem instead
    // of waiting on it.
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
      testMatch: ['smoke.spec.ts', 'googleSignIn.spec.ts'],
    },
  ],
});
