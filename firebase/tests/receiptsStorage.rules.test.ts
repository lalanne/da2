import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';

let testEnv: RulesTestEnvironment;

const A = 'parent-a';
const B = 'parent-b';
const STRANGER = 'stranger';
const HID = 'household-1';
const RID = 'receipt-1';
const PATH = `households/${HID}/receipts/${A}/${RID}.jpg`;

const IMAGE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // jpeg magic bytes

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-da2',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});
afterAll(async () => testEnv.cleanup());
afterEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
});

async function seed(receipt: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'households', HID), {
      name: 'Los García',
      parentIds: [A, B],
      children: [],
      pendingInviteCode: null,
      createdBy: A,
    });
    await setDoc(doc(ctx.firestore(), 'households', HID, 'receipts', RID), {
      uploaderId: A,
      storagePath: PATH,
      fileType: 'image',
      amount: 1000,
      currency: 'CLP',
      category: 'medical',
      expenseDate: '2026-09-01',
      note: null,
      childId: null,
      visibility: 'private',
      sharedAt: null,
      createdAt: 1,
      ...receipt,
    });
  });
}

const storage = (uid?: string) =>
  (uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext()).storage();

const opts = { contentType: 'image/jpeg' };

describe('storage.rules — receipt files (spec 003, criterion 6)', () => {
  it('the uploader (a member) can write and read their own file', async () => {
    await seed();
    await assertSucceeds(uploadBytes(ref(storage(A), PATH), IMAGE, opts));
    await assertSucceeds(getBytes(ref(storage(A), PATH)));
  });

  it('the co-parent cannot read it while private, can once shared', async () => {
    await seed({ visibility: 'private' });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), PATH), IMAGE, opts);
    });
    await assertFails(getBytes(ref(storage(B), PATH)));

    await seed({ visibility: 'shared', sharedAt: 2 });
    await assertSucceeds(getBytes(ref(storage(B), PATH)));
  });

  it('a non-member and an unauthenticated client can never read', async () => {
    await seed({ visibility: 'shared', sharedAt: 2 });
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), PATH), IMAGE, opts);
    });
    await assertFails(getBytes(ref(storage(STRANGER), PATH)));
    await assertFails(getBytes(ref(storage(), PATH)));
  });

  it('the co-parent cannot write to the uploader\'s path', async () => {
    await seed();
    await assertFails(uploadBytes(ref(storage(B), PATH), IMAGE, opts));
  });

  it('rejects a disallowed content type and an oversize file', async () => {
    await seed();
    await assertFails(
      uploadBytes(ref(storage(A), PATH), IMAGE, { contentType: 'application/zip' }),
    );
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    await assertFails(uploadBytes(ref(storage(A), PATH), big, opts));
  });
});
