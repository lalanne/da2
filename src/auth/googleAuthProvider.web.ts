import {
  getAuth,
  GoogleAuthProvider as FirebaseGoogleAuthProvider,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence,
  type User,
} from 'firebase/auth';
import { webApp } from '../data/firebaseWebApp';
import { AuthError } from './AuthError';
import type { AuthProvider, AuthUser } from './AuthProvider';

function auth() {
  return getAuth(webApp());
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
  };
}

export const googleAuthProvider: AuthProvider = {
  async signIn() {
    await setPersistence(auth(), browserLocalPersistence);
    try {
      const credential = await signInWithPopup(auth(), new FirebaseGoogleAuthProvider());
      return toAuthUser(credential.user);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new AuthError('signInCancelled');
      }
      if (code === 'auth/network-request-failed') {
        throw new AuthError('networkError');
      }
      throw new AuthError('unknown', (error as Error)?.message);
    }
  },

  async signOut() {
    await firebaseSignOut(auth());
  },

  onAuthStateChanged(listener) {
    return onFirebaseAuthStateChanged(auth(), (user) => {
      listener(user ? toAuthUser(user) : null);
    });
  },
};
