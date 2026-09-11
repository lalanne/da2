import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { addDoc, collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const A = 'parent-a';
const B = 'parent-b';
const STRANGER = 'stranger';
const HID = 'household-1';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-da2',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => testEnv.cleanup());
afterEach(async () => testEnv.clearFirestore());

async function seedHousehold() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'households', HID), {
      name: 'Los García',
      parentIds: [A, B],
      children: [],
      pendingInviteCode: null,
      createdBy: A,
    });
  });
}

const db = (uid?: string) =>
  (uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext()).firestore();

const proposalPayload = (over: Record<string, unknown> = {}) => ({
  proposerId: A,
  status: 'pending',
  createdAt: 1,
  resolvedAt: null,
  resolvedBy: null,
  defaultPercentA: 40,
  overrides: { medical: 50 },
  ...over,
});

const settlementPayload = (over: Record<string, unknown> = {}) => ({
  recordedBy: A,
  status: 'pending',
  createdAt: 1,
  resolvedAt: null,
  resolvedBy: null,
  payerUid: A,
  payeeUid: B,
  amount: 5000,
  currency: 'CLP',
  note: null,
  ...over,
});

async function seed(col: string, payload: Record<string, unknown>): Promise<string> {
  let id = '';
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const ref = await addDoc(collection(ctx.firestore(), 'households', HID, col), payload);
    id = ref.id;
  });
  return id;
}

describe('firestore.rules — split proposals (spec 010)', () => {
  const col = (uid: string) => collection(db(uid), 'households', HID, 'splitProposals');

  it('create: member, proposer == me, pending, valid %', async () => {
    await seedHousehold();
    await assertSucceeds(addDoc(col(A), proposalPayload()));
    await assertFails(addDoc(col(A), proposalPayload({ proposerId: B })));
    await assertFails(addDoc(col(A), proposalPayload({ status: 'approved' })));
    await assertFails(addDoc(col(A), proposalPayload({ defaultPercentA: 120 })));
    await assertFails(addDoc(col(A), proposalPayload({ defaultPercentA: -5 })));
    await assertFails(addDoc(col(STRANGER), proposalPayload({ proposerId: STRANGER })));
  });

  it('only the non-proposer approves / rejects; the proposer cancels', async () => {
    await seedHousehold();
    const id = await seed('splitProposals', proposalPayload({ proposerId: A }));
    const ref = (uid: string) => doc(db(uid), 'households', HID, 'splitProposals', id);

    await assertFails(updateDoc(ref(A), { status: 'approved', resolvedAt: 2, resolvedBy: A }));
    await assertFails(updateDoc(ref(B), { status: 'approved', resolvedAt: 2, resolvedBy: A }));
    await assertFails(updateDoc(ref(B), { status: 'approved', resolvedAt: 2, resolvedBy: B, defaultPercentA: 90 }));
    await assertSucceeds(updateDoc(ref(B), { status: 'approved', resolvedAt: 2, resolvedBy: B }));
  });

  it('the proposer cancels while pending; nobody deletes', async () => {
    await seedHousehold();
    const id = await seed('splitProposals', proposalPayload({ proposerId: A }));
    await assertFails(updateDoc(doc(db(B), 'households', HID, 'splitProposals', id), { status: 'cancelled', resolvedAt: 2 }));
    await assertSucceeds(updateDoc(doc(db(A), 'households', HID, 'splitProposals', id), { status: 'cancelled', resolvedAt: 2 }));
    await assertFails(deleteDoc(doc(db(A), 'households', HID, 'splitProposals', id)));
  });
});

describe('firestore.rules — settlements (spec 010)', () => {
  const col = (uid: string) => collection(db(uid), 'households', HID, 'settlements');

  it('create: member, recordedBy == me, pending, both parties are parents, amount > 0', async () => {
    await seedHousehold();
    await assertSucceeds(addDoc(col(A), settlementPayload()));
    await assertFails(addDoc(col(A), settlementPayload({ recordedBy: B })));
    await assertFails(addDoc(col(A), settlementPayload({ payeeUid: STRANGER })));
    await assertFails(addDoc(col(A), settlementPayload({ payerUid: A, payeeUid: A })));
    await assertFails(addDoc(col(A), settlementPayload({ amount: 0 })));
    await assertFails(addDoc(col(STRANGER), settlementPayload({ recordedBy: STRANGER })));
  });

  it('only the non-recorder confirms / rejects; the recorder cancels', async () => {
    await seedHousehold();
    const id = await seed('settlements', settlementPayload({ recordedBy: A }));
    const ref = (uid: string) => doc(db(uid), 'households', HID, 'settlements', id);

    await assertFails(updateDoc(ref(A), { status: 'confirmed', resolvedAt: 2, resolvedBy: A }));
    await assertSucceeds(updateDoc(ref(B), { status: 'confirmed', resolvedAt: 2, resolvedBy: B }));
  });

  it('a non-member sees nothing', async () => {
    await seedHousehold();
    await seed('settlements', settlementPayload());
    await assertFails(addDoc(collection(db(STRANGER), 'households', HID, 'settlements'), settlementPayload({ recordedBy: STRANGER })));
  });
});
