import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from '@react-native-firebase/firestore';
import type { AuthUser } from '../auth/AuthProvider';
import type { UserProfile } from '../models/UserProfile';
import type {
  Child,
  Household,
  InviteCode,
  NewHouseholdInput,
} from '../models/Household';
import { generateInviteCode } from './inviteCode';

export type Unsubscribe = () => void;

export interface HouseholdRepository {
  subscribeToProfile(uid: string, cb: (profile: UserProfile | null) => void): Unsubscribe;
  subscribeToHousehold(id: string, cb: (household: Household | null) => void): Unsubscribe;
  fetchProfile(uid: string): Promise<UserProfile | null>;
  fetchInviteCode(code: string): Promise<InviteCode | null>;
  /** Creates households/{id} + inviteCodes/{code}, then links the creator's profile. */
  createHousehold(user: AuthUser, input: NewHouseholdInput): Promise<void>;
  /** Join step 1+2: redeem the code, then record it on the joiner's profile. */
  claimInviteCode(uid: string, code: string): Promise<void>;
  /** Join step 3 (idempotent): add the joiner to parentIds and set their householdId. */
  linkJoin(uid: string, code: string, householdId: string): Promise<void>;
  regenerateInviteCode(uid: string, householdId: string, oldCode: string): Promise<string>;
}

function db() {
  return getFirestore();
}

async function withRetry<T>(op: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await op();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw lastError;
}

function toMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return typeof value === 'number' ? value : 0;
}

function mapProfile(uid: string, data: Record<string, unknown> | undefined): UserProfile | null {
  if (!data) return null;
  return {
    uid,
    displayName: (data.displayName as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    photoUrl: (data.photoUrl as string | null) ?? null,
    householdId: (data.householdId as string | null) ?? null,
    joinedVia: (data.joinedVia as string | null) ?? null,
    createdAt: toMillis(data.createdAt),
  };
}

function mapHousehold(id: string, data: Record<string, unknown> | undefined): Household | null {
  if (!data) return null;
  return {
    id,
    name: (data.name as string) ?? '',
    parentIds: (data.parentIds as string[]) ?? [],
    children: ((data.children as Child[]) ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      birthdate: c.birthdate ?? null,
    })),
    pendingInviteCode: (data.pendingInviteCode as string | null) ?? null,
    createdBy: (data.createdBy as string) ?? '',
    createdAt: toMillis(data.createdAt),
  };
}

export const householdRepository: HouseholdRepository = {
  subscribeToProfile(uid, cb) {
    return onSnapshot(doc(db(), 'users', uid), (snap) => {
      cb(mapProfile(uid, snap.data() as Record<string, unknown> | undefined));
    });
  },

  subscribeToHousehold(id, cb) {
    return onSnapshot(doc(db(), 'households', id), (snap) => {
      cb(mapHousehold(id, snap.data() as Record<string, unknown> | undefined));
    });
  },

  async fetchProfile(uid) {
    const snap = await getDoc(doc(db(), 'users', uid));
    return mapProfile(uid, snap.data() as Record<string, unknown> | undefined);
  },

  async fetchInviteCode(code) {
    const snap = await getDoc(doc(db(), 'inviteCodes', code));
    const data = snap.data() as Record<string, unknown> | undefined;
    if (!data) return null;
    return {
      code,
      householdId: data.householdId as string,
      createdBy: data.createdBy as string,
      createdAt: toMillis(data.createdAt),
      redeemedBy: (data.redeemedBy as string | null) ?? null,
    };
  },

  async createHousehold(user, input) {
    const householdRef = doc(collection(db(), 'households'));
    const code = generateInviteCode();
    const children: Child[] = input.children.map((c, i) => ({
      id: `${householdRef.id}-c${i}-${generateInviteCode()}`,
      name: c.name.trim(),
      birthdate: c.birthdate,
    }));

    const batch = writeBatch(db());
    batch.set(householdRef, {
      name: input.name.trim(),
      parentIds: [user.uid],
      children,
      pendingInviteCode: code,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db(), 'inviteCodes', code), {
      householdId: householdRef.id,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      redeemedBy: null,
    });
    await batch.commit();

    // Separate write: the users/{uid} rule checks the household exists with
    // this user as parentIds[0], which is only true after the batch commits.
    // Retry once — a failure here leaves an unlinked household that the next
    // create attempt would duplicate.
    await withRetry(() =>
      updateDoc(doc(db(), 'users', user.uid), { householdId: householdRef.id }),
    );
  },

  async claimInviteCode(uid, code) {
    // Step 1 — the gate. Requires knowing the code (document id).
    await updateDoc(doc(db(), 'inviteCodes', code), { redeemedBy: uid });
    // Step 2 — record the code on the joiner's profile so an interrupted
    // join can be finished on next launch without re-entering it.
    await updateDoc(doc(db(), 'users', uid), { joinedVia: code });
  },

  async linkJoin(uid, code, householdId) {
    const batch = writeBatch(db());
    batch.update(doc(db(), 'households', householdId), {
      parentIds: arrayUnion(uid),
      pendingInviteCode: null,
    });
    batch.update(doc(db(), 'users', uid), { householdId });
    await batch.commit();
  },

  async regenerateInviteCode(uid, householdId, oldCode) {
    const newCode = generateInviteCode();
    const batch = writeBatch(db());
    batch.delete(doc(db(), 'inviteCodes', oldCode));
    batch.set(doc(db(), 'inviteCodes', newCode), {
      householdId,
      createdBy: uid,
      createdAt: serverTimestamp(),
      redeemedBy: null,
    });
    batch.update(doc(db(), 'households', householdId), { pendingInviteCode: newCode });
    await batch.commit();
    return newCode;
  },
};
