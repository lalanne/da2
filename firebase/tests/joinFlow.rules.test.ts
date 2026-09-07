import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { arrayUnion, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const CREATOR = 'creator-uid';
const JOINER = 'joiner-uid';
const HID = 'household-1';
const CODE = 'ABCD2345';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-da2',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => testEnv.cleanup());
afterEach(async () => testEnv.clearFirestore());

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', CREATOR), {
      displayName: 'Javiera', email: 'j@x.com', photoUrl: null, householdId: HID, joinedVia: null,
    });
    // A spec-001-era profile: householdId may be null, and there is NO
    // joinedVia key at all (added in spec 002).
    await setDoc(doc(db, 'users', JOINER), {
      displayName: 'Cristián', email: 'c@x.com', photoUrl: null, householdId: null,
    });
    await setDoc(doc(db, 'households', HID), {
      name: 'Los García', parentIds: [CREATOR],
      children: [{ id: 'c1', name: 'Sofía', birthdate: null }],
      pendingInviteCode: CODE, createdBy: CREATOR,
    });
    await setDoc(doc(db, 'inviteCodes', CODE), {
      householdId: HID, createdBy: CREATOR, redeemedBy: null,
    });
  });
}

describe('the join flow, write by write (mirrors householdRepository)', () => {
  it('step 1 — redeem the code', async () => {
    await seed();
    const db = testEnv.authenticatedContext(JOINER).firestore();
    await assertSucceeds(updateDoc(doc(db, 'inviteCodes', CODE), { redeemedBy: JOINER }));
  });

  it('step 2 — record joinedVia on the joiner profile (householdId still null)', async () => {
    await seed();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'inviteCodes', CODE), { redeemedBy: JOINER });
    });
    const db = testEnv.authenticatedContext(JOINER).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', JOINER), { joinedVia: CODE }));
  });

  it('step 2 — still works when an abandoned earlier attempt left a stale joinedVia', async () => {
    await seed();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'users', JOINER), { joinedVia: 'OLDCODE1' });
      await updateDoc(doc(ctx.firestore(), 'inviteCodes', CODE), { redeemedBy: JOINER });
    });
    const db = testEnv.authenticatedContext(JOINER).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', JOINER), { joinedVia: CODE }));
  });

  it('step 1 also works when the household still points parentIds at the creator', async () => {
    await seed();
    const db = testEnv.authenticatedContext(JOINER).firestore();
    await assertSucceeds(updateDoc(doc(db, 'inviteCodes', CODE), { redeemedBy: JOINER }));
  });

  it('creator can still link their own household (spec-001 profile, no joinedVia key)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', CREATOR), {
        displayName: 'Javiera', email: 'j@x.com', photoUrl: null, householdId: null,
      });
      await setDoc(doc(db, 'households', HID), {
        name: 'Los García', parentIds: [CREATOR],
        children: [{ id: 'c1', name: 'Sofía', birthdate: null }],
        pendingInviteCode: CODE, createdBy: CREATOR,
      });
    });
    const db = testEnv.authenticatedContext(CREATOR).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', CREATOR), { householdId: HID }));
  });

  it('step 3 — batch: append to parentIds + set householdId', async () => {
    await seed();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'inviteCodes', CODE), { redeemedBy: JOINER });
      await updateDoc(doc(ctx.firestore(), 'users', JOINER), { joinedVia: CODE });
    });
    const db = testEnv.authenticatedContext(JOINER).firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, 'households', HID), {
      parentIds: arrayUnion(JOINER),
      pendingInviteCode: null,
    });
    batch.update(doc(db, 'users', JOINER), { householdId: HID });
    await assertSucceeds(batch.commit());
  });
});
