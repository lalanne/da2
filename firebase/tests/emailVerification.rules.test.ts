import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Spec 014: `signedIn()` — the single gate behind every collection — now
 * also requires `request.auth.token.email_verified == true`. This is the
 * regression check that an authenticated-but-unverified request is denied
 * everywhere the same way a signed-out one already is, across one
 * representative collection from each spec built so far. Per-collection
 * field validation is already covered by each spec's own rules test file;
 * this file only exercises the new verification gate itself.
 */

let testEnv: RulesTestEnvironment;
const ALICE = 'alice';
const HID = 'h1';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-da2',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `households/${HID}`), {
      createdBy: ALICE,
      parentIds: [ALICE],
      children: [{ id: 'c1', name: 'Kid', birthdate: null }],
      pendingInviteCode: 'ABCD1234',
      timezone: 'America/Santiago',
    });
    await setDoc(doc(db, `users/${ALICE}`), {
      displayName: 'Alice',
      email: 'alice@example.com',
      photoUrl: null,
      householdId: HID,
      joinedVia: null,
    });
    await setDoc(doc(db, `households/${HID}/proposals/p1`), {
      type: 'pattern',
      proposerId: ALICE,
      status: 'pending',
      resolvedBy: null,
    });
    await setDoc(doc(db, `households/${HID}/events/e1`), {
      title: 'Dentista',
      type: 'doctor',
    });
    await setDoc(doc(db, `households/${HID}/receipts/r1`), {
      uploaderId: ALICE,
      visibility: 'private',
    });
    await setDoc(doc(db, `households/${HID}/splitProposals/sp1`), {
      proposerId: ALICE,
      status: 'pending',
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

function unverifiedDb() {
  return testEnv.authenticatedContext(ALICE, { email_verified: false }).firestore();
}

function verifiedDb() {
  return testEnv.authenticatedContext(ALICE, { email_verified: true }).firestore();
}

describe('firestore.rules — email verification gate (spec 014)', () => {
  it.each([
    ['users/{uid}', `users/${ALICE}`],
    ['households/{hid}', `households/${HID}`],
    ['custody proposals', `households/${HID}/proposals/p1`],
    ['events', `households/${HID}/events/e1`],
    ['receipts', `households/${HID}/receipts/r1`],
    ['split proposals', `households/${HID}/splitProposals/sp1`],
  ])('%s: an unverified account is denied, a verified one is not', async (_label, path) => {
    await assertFails(getDoc(doc(unverifiedDb(), path)));
    await assertSucceeds(getDoc(doc(verifiedDb(), path)));
  });
});
