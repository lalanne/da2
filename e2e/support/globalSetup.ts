import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Spec 016 — seeds a pre-verified parent account + a one-parent household
 * directly against the Firebase emulators (Admin SDK, bypasses rules by
 * design), before any Playwright test runs. Keeps every e2e test focused on
 * the flow it's actually testing instead of re-walking sign-up + email
 * verification + household creation every time — those already have their
 * own coverage (specs 014, 002).
 *
 * Relies on `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST`, which
 * `firebase emulators:exec` sets on this process automatically — no
 * credentials needed, Admin SDK talks to the emulator directly.
 */
export default async function globalSetup(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error(
      'Firebase emulator env vars are not set. Run e2e tests via `npm run test:e2e` ' +
        '(firebase emulators:exec), never `playwright test` directly.',
    );
  }

  const app = initializeApp({ projectId: 'demo-da2' });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `smoke-${runId}@example.com`;
  const password = 'E2eSmokeTest123!';
  const displayName = 'Ana E2E';

  const user = await auth.createUser({ email, password, emailVerified: true, displayName });

  const householdRef = db.collection('households').doc();
  await householdRef.set({
    name: 'Hogar de prueba',
    parentIds: [user.uid],
    children: [],
    pendingInviteCode: null,
    timezone: 'America/Santiago',
    coParentName: null,
    coParentJoinedAt: null,
    createdBy: user.uid,
    createdAt: Date.now(),
  });

  await db.collection('users').doc(user.uid).set({
    displayName,
    email,
    photoUrl: null,
    householdId: householdRef.id,
    joinedVia: 'created',
    createdAt: Date.now(),
  });

  // Picked up by test files via process.env — set here, before Playwright
  // forks worker processes, so every worker inherits it.
  process.env.E2E_SMOKE_EMAIL = email;
  process.env.E2E_SMOKE_PASSWORD = password;

  // Phase 2 (spec 016 Coverage item 2, spec 002): two accounts with NO
  // household yet — unlike the smoke account above, nothing is pre-seeded
  // in Firestore for these. The whole point of this coverage item is
  // driving the real create/join UI, not bypassing it.
  const creator = await auth.createUser({
    email: `household-creator-${runId}@example.com`,
    password: 'E2eHouseholdTest123!',
    emailVerified: true,
    displayName: 'Javiera E2E',
  });
  const joiner = await auth.createUser({
    email: `household-joiner-${runId}@example.com`,
    password: 'E2eHouseholdTest123!',
    emailVerified: true,
    displayName: 'Cristián E2E',
  });
  process.env.E2E_CREATOR_EMAIL = creator.email!;
  process.env.E2E_CREATOR_PASSWORD = 'E2eHouseholdTest123!';
  process.env.E2E_CREATOR_NAME = 'Javiera E2E';
  process.env.E2E_JOINER_EMAIL = joiner.email!;
  process.env.E2E_JOINER_PASSWORD = 'E2eHouseholdTest123!';
  process.env.E2E_JOINER_NAME = 'Cristián E2E';
}
