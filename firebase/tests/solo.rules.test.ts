import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

/**
 * Spec 015 — solo parent. Covers exactly the behaviour spec 004/010's own
 * rules test files don't: everything gated on `parentIds.size() == 1`, the
 * append-only guarantee the whole self-approval design leans on, and the
 * post-join acknowledge/name-setting paths.
 */

let testEnv: RulesTestEnvironment;

const A = 'parent-a'; // the solo parent
const B = 'parent-b'; // joins later
const HID = 'household-1';
const CODE = 'ABCD2345';
const ABSENT = '__coparent__';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-da2',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => testEnv.cleanup());
afterEach(async () => testEnv.clearFirestore());

const db = (uid?: string) =>
  (uid ? testEnv.authenticatedContext(uid, { email_verified: true }) : testEnv.unauthenticatedContext()).firestore();

async function seedSoloHousehold() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'households', HID), {
      name: 'Los García',
      parentIds: [A],
      children: [{ id: 'c1', name: 'Sofía', birthdate: null }],
      pendingInviteCode: CODE,
      coParentName: null,
      coParentJoinedAt: null,
      createdBy: A,
    });
    await setDoc(doc(ctx.firestore(), 'inviteCodes', CODE), {
      householdId: HID,
      createdBy: A,
      redeemedBy: null,
    });
  });
}

/** Seeds a solo household then joins B, exactly as linkJoin() writes it. */
async function seedTwoParentHouseholdViaJoin() {
  await seedSoloHousehold();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), 'inviteCodes', CODE), { redeemedBy: B });
  });
  await assertSucceeds(
    updateDoc(doc(db(B), 'households', HID), {
      parentIds: [A, B],
      pendingInviteCode: null,
      coParentJoinedAt: serverTimestamp(),
    }),
  );
}

const patternPayload = (over: Record<string, unknown> = {}) => ({
  type: 'pattern',
  proposerId: A,
  status: 'pending',
  createdAt: 1,
  resolvedAt: null,
  resolvedBy: null,
  acknowledgedBy: null,
  cycle: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
  anchorDate: '2026-09-07',
  changeoverTime: '18:00',
  effectiveFrom: '2026-09-07',
  presetLabel: 'alternating-weeks',
  ...over,
});

const splitPayload = (over: Record<string, unknown> = {}) => ({
  proposerId: A,
  status: 'pending',
  createdAt: 1,
  resolvedAt: null,
  resolvedBy: null,
  acknowledgedBy: null,
  defaultPercentA: 60,
  overrides: {},
  ...over,
});

async function seedRaw(path: string, data: Record<string, unknown>): Promise<string> {
  let id = '';
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const ref = await addDoc(collection(ctx.firestore(), path), data);
    id = ref.id;
  });
  return id;
}

describe('firestore.rules — solo self-approval at create (spec 015)', () => {
  it('a solo parent creates an already-approved custody pattern', async () => {
    await seedSoloHousehold();
    await assertSucceeds(
      addDoc(
        collection(db(A), 'households', HID, 'proposals'),
        patternPayload({ status: 'approved', resolvedBy: A }),
      ),
    );
  });

  it('a solo parent creates an already-approved split table', async () => {
    await seedSoloHousehold();
    await assertSucceeds(
      addDoc(
        collection(db(A), 'households', HID, 'splitProposals'),
        splitPayload({ status: 'approved', resolvedBy: A }),
      ),
    );
  });

  it('a solo parent creates an already-confirmed settlement against the absent-co-parent sentinel', async () => {
    await seedSoloHousehold();
    await assertSucceeds(
      addDoc(collection(db(A), 'households', HID, 'settlements'), {
        recordedBy: A,
        status: 'confirmed',
        resolvedAt: 2,
        resolvedBy: A,
        payerUid: A,
        payeeUid: ABSENT,
        amount: 5000,
        currency: 'CLP',
        note: null,
        createdAt: 1,
      }),
    );
    await assertSucceeds(
      addDoc(collection(db(A), 'households', HID, 'settlements'), {
        recordedBy: A,
        status: 'confirmed',
        resolvedAt: 2,
        resolvedBy: A,
        payerUid: ABSENT,
        payeeUid: A,
        amount: 1000,
        currency: 'CLP',
        note: null,
        createdAt: 1,
      }),
    );
  });

  it('rejects self-approval for someone other than the sole parent', async () => {
    await seedSoloHousehold();
    await assertFails(
      addDoc(
        collection(db(A), 'households', HID, 'proposals'),
        patternPayload({ status: 'approved', resolvedBy: 'someone-else' }),
      ),
    );
  });

  it('rejects a settlement whose sentinel side does not pair with the sole parent', async () => {
    await seedSoloHousehold();
    await assertFails(
      addDoc(collection(db(A), 'households', HID, 'settlements'), {
        recordedBy: A,
        status: 'confirmed',
        resolvedAt: 2,
        resolvedBy: A,
        payerUid: ABSENT,
        payeeUid: ABSENT,
        amount: 1000,
        currency: 'CLP',
        note: null,
        createdAt: 1,
      }),
    );
  });
});

describe('firestore.rules — self-approval is impossible with two parents (regression)', () => {
  it('rejects an already-approved-at-create proposal, split, or settlement', async () => {
    await seedTwoParentHouseholdViaJoin();
    await assertFails(
      addDoc(
        collection(db(A), 'households', HID, 'proposals'),
        patternPayload({ status: 'approved', resolvedBy: A }),
      ),
    );
    await assertFails(
      addDoc(
        collection(db(A), 'households', HID, 'splitProposals'),
        splitPayload({ status: 'approved', resolvedBy: A }),
      ),
    );
    await assertFails(
      addDoc(collection(db(A), 'households', HID, 'settlements'), {
        recordedBy: A,
        status: 'confirmed',
        resolvedAt: 2,
        resolvedBy: A,
        payerUid: A,
        payeeUid: B,
        amount: 5000,
        currency: 'CLP',
        note: null,
        createdAt: 1,
      }),
    );
  });
});

describe('firestore.rules — parentIds append-only (safety argument for requirement 1)', () => {
  it('never lets a two-parent household shrink back to one', async () => {
    await seedTwoParentHouseholdViaJoin();
    await assertFails(updateDoc(doc(db(A), 'households', HID), { parentIds: [A] }));
    await assertFails(updateDoc(doc(db(B), 'households', HID), { parentIds: [A] }));
  });

  it('rejects the absent-co-parent sentinel ever entering parentIds', async () => {
    await seedSoloHousehold();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'inviteCodes', CODE), { redeemedBy: ABSENT });
    });
    await assertFails(
      updateDoc(doc(db(A), 'households', HID), {
        parentIds: [A, ABSENT],
        pendingInviteCode: null,
        coParentJoinedAt: serverTimestamp(),
      }),
    );
  });
});

describe('firestore.rules — setCoParentName (spec 015)', () => {
  it('the sole parent names the absent side, only while solo', async () => {
    await seedSoloHousehold();
    await assertSucceeds(updateDoc(doc(db(A), 'households', HID), { coParentName: 'Cristián' }));
  });

  it('rejects it once a second parent has joined', async () => {
    await seedTwoParentHouseholdViaJoin();
    await assertFails(updateDoc(doc(db(A), 'households', HID), { coParentName: 'Cristián' }));
  });

  it('rejects a non-parent, and a write bundling other fields', async () => {
    await seedSoloHousehold();
    await assertFails(updateDoc(doc(db('stranger'), 'households', HID), { coParentName: 'X' }));
    await assertFails(
      updateDoc(doc(db(A), 'households', HID), { coParentName: 'X', name: 'Hacked' }),
    );
  });
});

describe('firestore.rules — acknowledging a unilateral decision (spec 015)', () => {
  it('the newcomer accepts a unilaterally-approved pattern; touching only acknowledgedBy', async () => {
    await seedTwoParentHouseholdViaJoin();
    const id = await seedRaw(
      `households/${HID}/proposals`,
      patternPayload({ status: 'approved', resolvedBy: A, acknowledgedBy: null }),
    );
    const ref = doc(db(B), 'households', HID, 'proposals', id);

    await assertSucceeds(updateDoc(ref, { acknowledgedBy: B }));
    const snap = await getDoc(doc(db(A), 'households', HID, 'proposals', id));
    expect(snap.data()?.acknowledgedBy).toBe(B);
  });

  it('the newcomer accepts a unilaterally-approved split table', async () => {
    await seedTwoParentHouseholdViaJoin();
    const id = await seedRaw(
      `households/${HID}/splitProposals`,
      splitPayload({ status: 'approved', resolvedBy: A, acknowledgedBy: null }),
    );
    await assertSucceeds(
      updateDoc(doc(db(B), 'households', HID, 'splitProposals', id), { acknowledgedBy: B }),
    );
  });

  it('rejects the proposer acknowledging their own unilateral decision', async () => {
    await seedTwoParentHouseholdViaJoin();
    const id = await seedRaw(
      `households/${HID}/proposals`,
      patternPayload({ status: 'approved', resolvedBy: A, acknowledgedBy: null }),
    );
    await assertFails(
      updateDoc(doc(db(A), 'households', HID, 'proposals', id), { acknowledgedBy: A }),
    );
  });

  it('rejects acknowledging an ordinary bilaterally-approved decision', async () => {
    await seedTwoParentHouseholdViaJoin();
    const id = await seedRaw(
      `households/${HID}/proposals`,
      patternPayload({ status: 'approved', resolvedBy: B, acknowledgedBy: null }),
    );
    await assertFails(
      updateDoc(doc(db(B), 'households', HID, 'proposals', id), { acknowledgedBy: B }),
    );
  });

  it('rejects acknowledging twice, and bundling other field changes', async () => {
    await seedTwoParentHouseholdViaJoin();
    const id = await seedRaw(
      `households/${HID}/proposals`,
      patternPayload({ status: 'approved', resolvedBy: A, acknowledgedBy: B }),
    );
    await assertFails(
      updateDoc(doc(db(B), 'households', HID, 'proposals', id), { acknowledgedBy: B }),
    );

    const id2 = await seedRaw(
      `households/${HID}/proposals`,
      patternPayload({ status: 'approved', resolvedBy: A, acknowledgedBy: null }),
    );
    await assertFails(
      updateDoc(doc(db(B), 'households', HID, 'proposals', id2), {
        acknowledgedBy: B,
        status: 'rejected',
      }),
    );
  });

  it('a settlement carries no acknowledgedBy path — historical, stays read-only', async () => {
    await seedTwoParentHouseholdViaJoin();
    const id = await seedRaw(`households/${HID}/settlements`, {
      recordedBy: A,
      status: 'confirmed',
      resolvedAt: 2,
      resolvedBy: A,
      payerUid: A,
      payeeUid: ABSENT,
      amount: 5000,
      currency: 'CLP',
      note: null,
      createdAt: 1,
    });
    await assertFails(
      updateDoc(doc(db(B), 'households', HID, 'settlements', id), { amount: 1 }),
    );
    await assertFails(
      updateDoc(doc(db(B), 'households', HID, 'settlements', id), { status: 'rejected' }),
    );
  });
});
