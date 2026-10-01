import {
  getAuth,
  GoogleAuthProvider as FirebaseGoogleAuthProvider,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
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
    emailVerified: user.emailVerified,
  };
}

export const googleAuthProvider: AuthProvider = {
  // No `setPersistence` call here on purpose: the web SDK already defaults
  // to local persistence, and an `await` before `signInWithPopup` is enough
  // of a gap for Safari (and some Chromium popup-blocker configurations) to
  // stop treating the popup as a direct result of the click, which failed
  // every web sign-in with `auth/popup-blocked`.
  async signIn() {
    try {
      const credential = await signInWithPopup(auth(), new FirebaseGoogleAuthProvider());
      return toAuthUser(credential.user);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new AuthError('signInCancelled');
      }
      if (code === 'auth/popup-blocked') {
        throw new AuthError('popupBlocked');
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
