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
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

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

async function seedProposal(data: Record<string, unknown>): Promise<string> {
  let id = '';
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const ref = await addDoc(collection(ctx.firestore(), 'households', HID, 'proposals'), {
      status: 'pending',
      createdAt: 1,
      resolvedAt: null,
      resolvedBy: null,
      ...data,
    });
    id = ref.id;
  });
  return id;
}

function db(uid?: string) {
  return uid
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

const patternPayload = {
  type: 'pattern',
  proposerId: A,
  status: 'pending',
  createdAt: 1,
  resolvedAt: null,
  resolvedBy: null,
  cycle: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
  anchorDate: '2026-09-07',
  changeoverTime: '18:00',
  effectiveFrom: '2026-09-07',
  presetLabel: 'alternating-weeks',
};

describe('firestore.rules — custody proposals (spec 004)', () => {
  describe('read', () => {
    it('members read, non-members do not', async () => {
      await seedHousehold();
      await seedProposal({ ...patternPayload, proposerId: A });
      await assertSucceeds(getDocs(collection(db(A), 'households', HID, 'proposals')));
      await assertSucceeds(getDocs(collection(db(B), 'households', HID, 'proposals')));
      await assertFails(getDocs(collection(db(STRANGER), 'households', HID, 'proposals')));
      await assertFails(getDocs(collection(db(), 'households', HID, 'proposals')));
    });
  });

  describe('create', () => {
    it('a member proposes a pattern for themselves', async () => {
      await seedHousehold();
      await assertSucceeds(
        addDoc(collection(db(A), 'households', HID, 'proposals'), patternPayload),
      );
    });

    it('a member proposes a day override', async () => {
      await seedHousehold();
      await assertSucceeds(
        addDoc(collection(db(B), 'households', HID, 'proposals'), {
          type: 'day-override',
          proposerId: B,
          status: 'pending',
          createdAt: 1,
          resolvedAt: null,
          resolvedBy: null,
          date: '2026-09-12',
          assignedTo: 1,
          startTime: null,
          endTime: null,
        }),
      );
    });

    it('rejects proposing on behalf of the other parent, or already-resolved', async () => {
      await seedHousehold();
      await assertFails(
        addDoc(collection(db(A), 'households', HID, 'proposals'), { ...patternPayload, proposerId: B }),
      );
      await assertFails(
        addDoc(collection(db(A), 'households', HID, 'proposals'), { ...patternPayload, status: 'approved' }),
      );
      await assertFails(
        addDoc(collection(db(A), 'households', HID, 'proposals'), { ...patternPayload, resolvedBy: A }),
      );
    });

    it('rejects a malformed cycle length', async () => {
      await seedHousehold();
      await assertFails(
        addDoc(collection(db(A), 'households', HID, 'proposals'), {
          ...patternPayload,
          cycle: [0, 1, 0],
        }),
      );
    });

    it('a non-member cannot propose', async () => {
      await seedHousehold();
      await assertFails(
        addDoc(collection(db(STRANGER), 'households', HID, 'proposals'), {
          ...patternPayload,
          proposerId: STRANGER,
        }),
      );
    });
  });

  describe('resolve', () => {
    it('the NON-proposing parent can approve or reject', async () => {
      await seedHousehold();
      const id1 = await seedProposal({ ...patternPayload, proposerId: A });
      await assertSucceeds(
        updateDoc(doc(db(B), 'households', HID, 'proposals', id1), {
          status: 'approved',
          resolvedAt: 2,
          resolvedBy: B,
        }),
      );
      const id2 = await seedProposal({ ...patternPayload, proposerId: A });
      await assertSucceeds(
        updateDoc(doc(db(B), 'households', HID, 'proposals', id2), {
          status: 'rejected',
          resolvedAt: 2,
          resolvedBy: B,
        }),
      );
    });

    it('the PROPOSING parent cannot approve their own (criterion 5)', async () => {
      await seedHousehold();
      const id = await seedProposal({ ...patternPayload, proposerId: A });
      await assertFails(
        updateDoc(doc(db(A), 'households', HID, 'proposals', id), {
          status: 'approved',
          resolvedAt: 2,
          resolvedBy: A,
        }),
      );
    });

    it('rejects resolving with the wrong resolvedBy, a non-pending target, or extra fields', async () => {
      await seedHousehold();
      const id = await seedProposal({ ...patternPayload, proposerId: A });
      await assertFails(
        updateDoc(doc(db(B), 'households', HID, 'proposals', id), {
          status: 'approved',
          resolvedAt: 2,
          resolvedBy: A, // not the resolver
        }),
      );
      await assertFails(
        updateDoc(doc(db(B), 'households', HID, 'proposals', id), {
          status: 'approved',
          resolvedAt: 2,
          resolvedBy: B,
          effectiveFrom: '2030-01-01', // tampering with the payload
        }),
      );
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'households', HID, 'proposals', id), { status: 'approved' });
      });
      await assertFails(
        updateDoc(doc(db(B), 'households', HID, 'proposals', id), {
          status: 'rejected',
          resolvedAt: 3,
          resolvedBy: B,
        }),
      );
    });

    it('a stranger cannot resolve', async () => {
      await seedHousehold();
      const id = await seedProposal({ ...patternPayload, proposerId: A });
      await assertFails(
        updateDoc(doc(db(STRANGER), 'households', HID, 'proposals', id), {
          status: 'approved',
          resolvedAt: 2,
          resolvedBy: STRANGER,
        }),
      );
    });
  });

  describe('cancel', () => {
    it('the proposer cancels while pending; the other parent cannot cancel', async () => {
      await seedHousehold();
      const id = await seedProposal({ ...patternPayload, proposerId: A });
      await assertFails(
        updateDoc(doc(db(B), 'households', HID, 'proposals', id), { status: 'cancelled', resolvedAt: 2 }),
      );
      await assertSucceeds(
        updateDoc(doc(db(A), 'households', HID, 'proposals', id), { status: 'cancelled', resolvedAt: 2 }),
      );
    });
  });

  it('nobody can delete a proposal', async () => {
    await seedHousehold();
    const id = await seedProposal({ ...patternPayload, proposerId: A });
    const { deleteDoc } = await import('firebase/firestore');
    await assertFails(deleteDoc(doc(db(A), 'households', HID, 'proposals', id)));
  });
});
