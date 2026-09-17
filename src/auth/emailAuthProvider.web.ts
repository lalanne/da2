import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload,
  browserLocalPersistence,
  setPersistence,
  type User,
} from 'firebase/auth';
import { webApp } from '../data/firebaseWebApp';
import { mapAuthError } from './mapAuthError';
import type { AuthUser, EmailAuthProvider } from './AuthProvider';

function auth() {
  return getAuth(webApp());
}

// See the native twin for the full rationale — an explicit continue URL is
// now required (Dynamic Links, the old fallback, is shut down). Kept here
// too for parity even though the web SDK is less exposed to this failure.
const ACTION_CODE_SETTINGS = {
  url: 'https://da2-coparenting.web.app',
  handleCodeInApp: false,
};

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

export const emailAuthProvider: EmailAuthProvider = {
  async signUp(name, email, password) {
    try {
      await setPersistence(auth(), browserLocalPersistence);
      const { user } = await createUserWithEmailAndPassword(auth(), email, password);
      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user, ACTION_CODE_SETTINGS);
      return { ...toAuthUser(user), displayName: name };
    } catch (error) {
      throw mapAuthError(error);
    }
  },

  async signIn(email, password) {
    try {
      await setPersistence(auth(), browserLocalPersistence);
      const { user } = await signInWithEmailAndPassword(auth(), email, password);
      return toAuthUser(user);
    } catch (error) {
      throw mapAuthError(error);
    }
  },

  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth(), email, ACTION_CODE_SETTINGS);
    } catch (error) {
      const kind = mapAuthError(error).kind;
      if (kind !== 'wrongCredentials') throw mapAuthError(error);
    }
  },

  async resendVerificationEmail() {
    const user = auth().currentUser;
    if (!user) return;
    try {
      await sendEmailVerification(user, ACTION_CODE_SETTINGS);
    } catch (error) {
      throw mapAuthError(error);
    }
  },

  async reloadCurrentUser() {
    const user = auth().currentUser;
    if (!user) return null;
    await reload(user);
    return toAuthUser(auth().currentUser ?? user);
  },
};
