import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const newProfile = (displayName: string) => ({
  displayName,
  email: `${displayName.toLowerCase()}@example.com`,
  photoUrl: null,
  householdId: null,
  joinedVia: null,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-da2',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe('firestore.rules — users/{uid}', () => {
  it('denies all reads/writes from an unauthenticated client', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, 'users/alice')));
    await assertFails(setDoc(doc(db, 'users/alice'), newProfile('Alice')));
  });

  it('lets a user read and write only their own profile', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice'), newProfile('Alice')));
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice')));
  });

  it("denies a user reading or writing someone else's profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/bob'), newProfile('Bob'));
    });

    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    await assertFails(getDoc(doc(aliceDb, 'users/bob')));
    await assertFails(setDoc(doc(aliceDb, 'users/bob'), newProfile('Hacked')));
  });
});
