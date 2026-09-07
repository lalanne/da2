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
  deleteDoc,
  doc,
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

function db(uid?: string) {
  return uid
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

const eventPayload = (over: Record<string, unknown> = {}) => ({
  title: 'Dentista',
  type: 'doctor',
  childIds: ['c1'],
  date: '2026-10-12',
  allDay: false,
  startTime: '15:00',
  endTime: null,
  location: null,
  notes: null,
  recurrence: null,
  createdBy: A,
  createdAt: 1,
  updatedBy: A,
  updatedAt: 1,
  ...over,
});

async function seedEvent(over: Record<string, unknown> = {}): Promise<string> {
  let id = '';
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const ref = await addDoc(collection(ctx.firestore(), 'households', HID, 'events'), eventPayload(over));
    id = ref.id;
  });
  return id;
}

describe('firestore.rules — events (spec 005)', () => {
  it('members read, others do not (criterion 6)', async () => {
    await seedHousehold();
    await seedEvent();
    await assertSucceeds(getDocs(collection(db(A), 'households', HID, 'events')));
    await assertFails(getDocs(collection(db(STRANGER), 'households', HID, 'events')));
    await assertFails(getDocs(collection(db(), 'households', HID, 'events')));
  });

  it('either member creates an event; a non-member cannot', async () => {
    await seedHousehold();
    await assertSucceeds(
      addDoc(collection(db(B), 'households', HID, 'events'), eventPayload({ createdBy: B, updatedBy: B })),
    );
    await assertFails(
      addDoc(collection(db(STRANGER), 'households', HID, 'events'), eventPayload({ createdBy: STRANGER, updatedBy: STRANGER })),
    );
  });

  it('rejects a create with a missing title or a mismatched createdBy', async () => {
    await seedHousehold();
    await assertFails(
      addDoc(collection(db(A), 'households', HID, 'events'), eventPayload({ title: '' })),
    );
    await assertFails(
      addDoc(collection(db(A), 'households', HID, 'events'), eventPayload({ createdBy: B })),
    );
  });

  it('recurrence is allowed only on training events (criterion 8)', async () => {
    await seedHousehold();
    await assertFails(
      addDoc(collection(db(A), 'households', HID, 'events'), eventPayload({
        type: 'doctor',
        recurrence: { freq: 'weekly', until: '2026-12-15' },
      })),
    );
    await assertSucceeds(
      addDoc(collection(db(A), 'households', HID, 'events'), eventPayload({
        type: 'training',
        recurrence: { freq: 'weekly', until: '2026-12-15' },
      })),
    );
  });

  it('an edit cannot change createdBy / createdAt and must set updatedBy to the editor (criterion 7)', async () => {
    await seedHousehold();
    const id = await seedEvent();

    await assertSucceeds(
      updateDoc(doc(db(B), 'households', HID, 'events', id), {
        ...eventPayload(),
        startTime: '16:00',
        updatedBy: B,
        updatedAt: 2,
      }),
    );
    await assertFails(
      updateDoc(doc(db(B), 'households', HID, 'events', id), {
        ...eventPayload(),
        createdBy: B, // tampering
        updatedBy: B,
      }),
    );
    await assertFails(
      updateDoc(doc(db(B), 'households', HID, 'events', id), {
        ...eventPayload(),
        updatedBy: A, // not the editor
      }),
    );
  });

  it('either member deletes; a stranger cannot', async () => {
    await seedHousehold();
    const id = await seedEvent();
    await assertFails(deleteDoc(doc(db(STRANGER), 'households', HID, 'events', id)));
    await assertSucceeds(deleteDoc(doc(db(B), 'households', HID, 'events', id)));
  });
});
