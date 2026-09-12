import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { webApp } from './firebaseWebApp';
import type { AuthUser } from '../auth/AuthProvider';
import type { UserProfile } from '../models/UserProfile';
import {
  DEFAULT_TIMEZONE,
  type Child,
  type Household,
  type InviteCode,
  type NewHouseholdInput,
} from '../models/Household';
import { generateInviteCode } from './inviteCode';
import type { HouseholdRepository } from './householdRepository';

function db() {
  return getFirestore(webApp());
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

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapHousehold(id: string, data: Record<string, unknown> | undefined): Household | null {
  if (!data) return null;
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    parentIds: asArray<string>(data.parentIds).filter((v) => typeof v === 'string'),
    children: asArray<Partial<Child>>(data.children).map((c) => ({
      id: String(c?.id ?? ''),
      name: String(c?.name ?? ''),
      birthdate: typeof c?.birthdate === 'string' ? c.birthdate : null,
    })),
    pendingInviteCode:
      typeof data.pendingInviteCode === 'string' ? data.pendingInviteCode : null,
    timezone: typeof data.timezone === 'string' ? data.timezone : DEFAULT_TIMEZONE,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdAt: toMillis(data.createdAt),
  };
}

export const householdRepository: HouseholdRepository = {
  subscribeToProfile(uid, cb, onError) {
    return onSnapshot(
      doc(db(), 'users', uid),
      (snap) => cb(mapProfile(uid, snap.data() as Record<string, unknown> | undefined)),
      (error: unknown) => onError?.(error),
    );
  },

  subscribeToHousehold(id, cb, onError) {
    return onSnapshot(
      doc(db(), 'households', id),
      (snap) => cb(mapHousehold(id, snap.data() as Record<string, unknown> | undefined)),
      (error: unknown) => onError?.(error),
    );
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

  async createHousehold(user: AuthUser, input: NewHouseholdInput) {
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
      timezone: DEFAULT_TIMEZONE,
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

    await withRetry(() =>
      updateDoc(doc(db(), 'users', user.uid), { householdId: householdRef.id }),
    );
  },

  async claimInviteCode(uid, code) {
    await updateDoc(doc(db(), 'inviteCodes', code), { redeemedBy: uid });
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
