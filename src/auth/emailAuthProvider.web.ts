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
      await sendEmailVerification(user);
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
      await sendPasswordResetEmail(auth(), email);
    } catch (error) {
      const kind = mapAuthError(error).kind;
      if (kind !== 'wrongCredentials') throw mapAuthError(error);
    }
  },

  async resendVerificationEmail() {
    const user = auth().currentUser;
    if (!user) return;
    try {
      await sendEmailVerification(user);
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
