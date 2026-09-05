import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const CREATOR = 'creator-uid';
const JOINER = 'joiner-uid';
const STRANGER = 'stranger-uid';
const HID = 'household-1';
const CODE = 'ABCD2345';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-da2',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

/** Seeds a one-parent household + its live code + both parents' profiles. */
async function seedOneParentHousehold() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', CREATOR), {
      displayName: 'Javiera',
      email: 'j@example.com',
      photoUrl: null,
      householdId: HID,
      joinedVia: null,
    });
    await setDoc(doc(db, 'users', JOINER), {
      displayName: 'Cristián',
      email: 'c@example.com',
      photoUrl: null,
      householdId: null,
      joinedVia: null,
    });
    await setDoc(doc(db, 'households', HID), {
      name: 'Los García',
      parentIds: [CREATOR],
      children: [{ id: 'c1', name: 'Sofía', birthdate: null }],
      pendingInviteCode: CODE,
      createdBy: CREATOR,
    });
    await setDoc(doc(db, 'inviteCodes', CODE), {
      householdId: HID,
      createdBy: CREATOR,
      redeemedBy: null,
    });
  });
}

function db(uid?: string) {
  return uid
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

describe('firestore.rules — households / inviteCodes (spec 002)', () => {
  describe('household reads', () => {
    it('lets a member read their household but not a stranger', async () => {
      await seedOneParentHousehold();
      await assertSucceeds(getDoc(doc(db(CREATOR), 'households', HID)));
      await assertFails(getDoc(doc(db(STRANGER), 'households', HID)));
    });
  });

  describe('household creation', () => {
    it('lets a user with no household create one with themselves as sole parent', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users', CREATOR), {
          displayName: 'Javiera', email: 'j@example.com', photoUrl: null,
          householdId: null, joinedVia: null,
        });
      });
      await assertSucceeds(
        setDoc(doc(db(CREATOR), 'households', HID), {
          name: 'Los García',
          parentIds: [CREATOR],
          children: [{ id: 'c1', name: 'Sofía', birthdate: null }],
          pendingInviteCode: CODE,
          createdBy: CREATOR,
        }),
      );
    });

    it('rejects creating a household with someone else as parent, or with no children', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'users', CREATOR), {
          displayName: 'Javiera', email: 'j@example.com', photoUrl: null,
          householdId: null, joinedVia: null,
        });
      });
      await assertFails(
        setDoc(doc(db(CREATOR), 'households', HID), {
          name: 'X', parentIds: [STRANGER], children: [{ id: 'c1', name: 'S', birthdate: null }],
          pendingInviteCode: CODE, createdBy: CREATOR,
        }),
      );
      await assertFails(
        setDoc(doc(db(CREATOR), 'households', HID), {
          name: 'X', parentIds: [CREATOR], children: [], pendingInviteCode: CODE, createdBy: CREATOR,
        }),
      );
    });

    it('lets the creator link their new household onto their own profile', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', CREATOR), {
          displayName: 'Javiera', email: 'j@example.com', photoUrl: null,
          householdId: null, joinedVia: null,
        });
        await setDoc(doc(db, 'households', HID), {
          name: 'Los García', parentIds: [CREATOR],
          children: [{ id: 'c1', name: 'Sofía', birthdate: null }],
          pendingInviteCode: CODE, createdBy: CREATOR,
        });
      });
      await assertSucceeds(updateDoc(doc(db(CREATOR), 'users', CREATOR), { householdId: HID }));
      await assertFails(updateDoc(doc(db(CREATOR), 'users', CREATOR), { householdId: 'not-mine' }));
    });

    it('rejects creating a second household when already in one', async () => {
      await seedOneParentHousehold(); // CREATOR already has householdId
      await assertFails(
        setDoc(doc(db(CREATOR), 'households', 'household-2'), {
          name: 'Otro', parentIds: [CREATOR], children: [{ id: 'c1', name: 'S', birthdate: null }],
          pendingInviteCode: 'WXYZ3456', createdBy: CREATOR,
        }),
      );
    });
  });

  describe('invite codes', () => {
    it('allows get by id for any signed-in user but denies listing', async () => {
      await seedOneParentHousehold();
      await assertSucceeds(getDoc(doc(db(JOINER), 'inviteCodes', CODE)));
      await assertFails(getDocs(collection(db(JOINER), 'inviteCodes')));
      await assertFails(getDoc(doc(db(), 'inviteCodes', CODE))); // unauthenticated
    });

    it('lets a non-member redeem an unredeemed code for a one-parent household', async () => {
      await seedOneParentHousehold();
      await assertSucceeds(
        updateDoc(doc(db(JOINER), 'inviteCodes', CODE), { redeemedBy: JOINER }),
      );
    });

    it('rejects redeeming on behalf of someone else, twice, or changing other fields', async () => {
      await seedOneParentHousehold();
      await assertFails(
        updateDoc(doc(db(JOINER), 'inviteCodes', CODE), { redeemedBy: STRANGER }),
      );
      await assertFails(
        updateDoc(doc(db(JOINER), 'inviteCodes', CODE), { redeemedBy: JOINER, householdId: 'evil' }),
      );
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'inviteCodes', CODE), { redeemedBy: 'first-uid' });
      });
      await assertFails(
        updateDoc(doc(db(JOINER), 'inviteCodes', CODE), { redeemedBy: JOINER }),
      );
    });

    it('rejects redeeming a code whose household already has two parents', async () => {
      await seedOneParentHousehold();
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'households', HID), {
          parentIds: [CREATOR, 'other-uid'],
        });
      });
      await assertFails(
        updateDoc(doc(db(JOINER), 'inviteCodes', CODE), { redeemedBy: JOINER }),
      );
    });
  });

  describe('second parent joining', () => {
    it('lets the redeemer append themselves as the second parent', async () => {
      await seedOneParentHousehold();
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'inviteCodes', CODE), { redeemedBy: JOINER });
      });
      await assertSucceeds(
        updateDoc(doc(db(JOINER), 'households', HID), {
          parentIds: arrayUnion(JOINER),
          pendingInviteCode: null,
        }),
      );
    });

    it('rejects appending yourself without having redeemed the code', async () => {
      await seedOneParentHousehold();
      await assertFails(
        updateDoc(doc(db(JOINER), 'households', HID), {
          parentIds: arrayUnion(JOINER),
          pendingInviteCode: null,
        }),
      );
    });

    it('rejects appending a different uid as the second parent', async () => {
      await seedOneParentHousehold();
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'inviteCodes', CODE), { redeemedBy: JOINER });
      });
      await assertFails(
        updateDoc(doc(db(JOINER), 'households', HID), {
          parentIds: [CREATOR, STRANGER],
          pendingInviteCode: null,
        }),
      );
    });

    it('links the joiner profile only to the household their redeemed code points at', async () => {
      await seedOneParentHousehold();
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'inviteCodes', CODE), { redeemedBy: JOINER });
        await updateDoc(doc(ctx.firestore(), 'users', JOINER), { joinedVia: CODE });
      });
      await assertSucceeds(
        updateDoc(doc(db(JOINER), 'users', JOINER), { householdId: HID }),
      );
      await assertFails(
        updateDoc(doc(db(JOINER), 'users', JOINER), { householdId: 'some-other-household' }),
      );
    });
  });

  describe('regenerating the code', () => {
    it('lets the sole parent regenerate, but not once there are two parents', async () => {
      await seedOneParentHousehold();
      await assertSucceeds(
        updateDoc(doc(db(CREATOR), 'households', HID), { pendingInviteCode: 'WXYZ3456' }),
      );
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'households', HID), {
          parentIds: [CREATOR, JOINER],
        });
      });
      await assertFails(
        updateDoc(doc(db(CREATOR), 'households', HID), { pendingInviteCode: 'QRST7788' }),
      );
    });

    it('lets the sole parent delete their old code', async () => {
      await seedOneParentHousehold();
      await assertSucceeds(deleteDoc(doc(db(CREATOR), 'inviteCodes', CODE)));
    });
  });

  describe('co-member profile reads', () => {
    it('lets household members read each other but not outsiders', async () => {
      await seedOneParentHousehold();
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'households', HID), { parentIds: [CREATOR, JOINER] });
        await updateDoc(doc(ctx.firestore(), 'users', JOINER), { householdId: HID });
      });
      await assertSucceeds(getDoc(doc(db(CREATOR), 'users', JOINER)));
      await assertSucceeds(getDoc(doc(db(JOINER), 'users', CREATOR)));
      await assertFails(getDoc(doc(db(STRANGER), 'users', CREATOR)));
    });
  });

  describe('profile identity fields', () => {
    it('rejects changing displayName via a household update', async () => {
      await seedOneParentHousehold();
      await assertFails(
        updateDoc(doc(db(CREATOR), 'users', CREATOR), { displayName: 'Hacked' }),
      );
    });
  });
});
