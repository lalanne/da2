import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

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
      children: [{ id: 'c1', name: 'Sofía', birthdate: null }],
      pendingInviteCode: null,
      createdBy: A,
    });
  });
}

const receiptPayload = (over: Record<string, unknown> = {}) => ({
  uploaderId: A,
  storagePath: `households/${HID}/receipts/${A}/r1.jpg`,
  fileType: 'image',
  amount: 12500,
  currency: 'CLP',
  tags: ['medical'],
  expenseDate: '2026-09-01',
  note: null,
  childId: null,
  visibility: 'private',
  sharedAt: null,
  splitPercentA: null,
  createdAt: 1,
  ...over,
});

async function seedReceipt(over: Record<string, unknown> = {}): Promise<string> {
  let id = '';
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const ref = await addDoc(collection(ctx.firestore(), 'households', HID, 'receipts'), receiptPayload(over));
    id = ref.id;
  });
  return id;
}

function db(uid?: string) {
  return uid
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

describe('firestore.rules — receipts metadata (spec 003)', () => {
  it('the uploader reads own receipts; a scoped "mine" query works; a stranger is denied (criterion 1)', async () => {
    await seedHousehold();
    await seedReceipt({ uploaderId: A });
    const mineQ = (uid: string) =>
      getDocs(query(collection(db(uid), 'households', HID, 'receipts'), where('uploaderId', '==', uid)));
    await assertSucceeds(mineQ(A));
    // B's "mine" query returns nothing but is allowed; an unscoped read is denied.
    await assertSucceeds(mineQ(B));
    await assertFails(getDocs(collection(db(B), 'households', HID, 'receipts')));
    await assertFails(getDocs(collection(db(STRANGER), 'households', HID, 'receipts')));
  });

  it('the co-parent cannot read a private receipt but can once shared', async () => {
    await seedHousehold();
    const id = await seedReceipt({ uploaderId: A, visibility: 'private' });
    const sharedQ = getDocs(
      query(collection(db(B), 'households', HID, 'receipts'), where('visibility', '==', 'shared')),
    );
    await assertSucceeds(sharedQ); // returns nothing while private
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'households', HID, 'receipts', id), {
        visibility: 'shared',
        sharedAt: 2,
      });
    });
    const after = await getDocs(
      query(collection(db(B), 'households', HID, 'receipts'), where('visibility', '==', 'shared')),
    );
    expect(after.size).toBe(1);
  });

  it('create requires uploaderId == me, private, and valid fields', async () => {
    await seedHousehold();
    const col = (uid: string) => collection(db(uid), 'households', HID, 'receipts');
    await assertSucceeds(addDoc(col(A), receiptPayload()));
    await assertFails(addDoc(col(A), receiptPayload({ uploaderId: B })));
    await assertFails(addDoc(col(A), receiptPayload({ visibility: 'shared' })));
    await assertFails(addDoc(col(A), receiptPayload({ amount: -1 })));
    await assertFails(addDoc(col(STRANGER), receiptPayload({ uploaderId: STRANGER })));
  });

  it('tags: a fixed-set list (dupes / unknown / non-list rejected; [] and multi ok) — criterion 9', async () => {
    await seedHousehold();
    const col = collection(db(A), 'households', HID, 'receipts');
    await assertSucceeds(addDoc(col, receiptPayload({ tags: [] })));
    await assertSucceeds(addDoc(col, receiptPayload({ tags: ['tuition', 'sports'] })));
    await assertFails(addDoc(col, receiptPayload({ tags: ['holidays'] })));
    await assertFails(addDoc(col, receiptPayload({ tags: ['medical', 'medical'] })));
    await assertFails(addDoc(col, receiptPayload({ tags: 'medical' })));
  });

  it('the only legal update is private → shared (criterion 7)', async () => {
    await seedHousehold();
    const id = await seedReceipt({ uploaderId: A });
    const ref = (uid: string) => doc(db(uid), 'households', HID, 'receipts', id);

    // the share write must also freeze the split % (spec 010) and nothing else
    await assertFails(updateDoc(ref(A), { visibility: 'shared', sharedAt: 2 }));
    await assertFails(updateDoc(ref(A), { visibility: 'shared', sharedAt: 2, splitPercentA: 150 }));
    await assertFails(
      updateDoc(ref(A), { visibility: 'shared', sharedAt: 2, splitPercentA: 40, note: 'x' }),
    );
    await assertSucceeds(
      updateDoc(ref(A), { visibility: 'shared', sharedAt: 2, splitPercentA: 40 }),
    );
    // now shared — no further writes
    await assertFails(updateDoc(ref(A), { visibility: 'private', sharedAt: null }));
    await assertFails(updateDoc(ref(A), { amount: 99 }));
    await assertFails(deleteDoc(ref(A)));
  });

  it('a shared receipt cannot be edited or deleted by the other parent either', async () => {
    await seedHousehold();
    const id = await seedReceipt({ uploaderId: A, visibility: 'shared', sharedAt: 2 });
    await assertFails(updateDoc(doc(db(B), 'households', HID, 'receipts', id), { amount: 1 }));
    await assertFails(deleteDoc(doc(db(B), 'households', HID, 'receipts', id)));
  });

  it('the uploader deletes a private receipt', async () => {
    await seedHousehold();
    const id = await seedReceipt({ uploaderId: A, visibility: 'private' });
    await assertFails(deleteDoc(doc(db(B), 'households', HID, 'receipts', id)));
    await assertSucceeds(deleteDoc(doc(db(A), 'households', HID, 'receipts', id)));
  });
});
