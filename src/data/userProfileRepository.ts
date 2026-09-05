import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import type { AuthUser } from '../auth/AuthProvider';
import type { UserProfile } from '../models/UserProfile';

function usersCollectionDoc(uid: string) {
  return doc(getFirestore(), 'users', uid);
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(usersCollectionDoc(uid));
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

/**
 * Creates the users/{uid} profile on first sign-in only. Existing profiles
 * are left untouched so repeat sign-ins don't clobber fields set by later
 * specs (e.g. householdId from spec 002).
 */
export async function ensureUserProfile(user: AuthUser): Promise<void> {
  const existing = await fetchUserProfile(user.uid);
  if (existing) return;

  const profile = {
    displayName: user.displayName,
    email: user.email,
    photoUrl: user.photoUrl,
    householdId: null,
    joinedVia: null,
    createdAt: serverTimestamp(),
  };
  await setDoc(usersCollectionDoc(user.uid), profile);
}
