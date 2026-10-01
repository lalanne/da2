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
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
