import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload,
} from '@react-native-firebase/auth';
import { mapAuthError } from './mapAuthError';
import type { AuthUser, EmailAuthProvider } from './AuthProvider';

function toAuthUser(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}): AuthUser {
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
      const { user } = await createUserWithEmailAndPassword(getAuth(), email, password);
      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user);
      return toAuthUser({ ...user, displayName: name });
    } catch (error) {
      throw mapAuthError(error);
    }
  },

  async signIn(email, password) {
    try {
      const { user } = await signInWithEmailAndPassword(getAuth(), email, password);
      return toAuthUser(user);
    } catch (error) {
      throw mapAuthError(error);
    }
  },

  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(getAuth(), email);
    } catch (error) {
      // Never let "no such account" leak — the store/UI shows the same
      // confirmation either way (spec 014), so a not-found here is a no-op.
      const kind = mapAuthError(error).kind;
      if (kind !== 'wrongCredentials') throw mapAuthError(error);
    }
  },

  async resendVerificationEmail() {
    const user = getAuth().currentUser;
    if (!user) return;
    try {
      await sendEmailVerification(user);
    } catch (error) {
      throw mapAuthError(error);
    }
  },

  async reloadCurrentUser() {
    const user = getAuth().currentUser;
    if (!user) return null;
    await reload(user);
    return toAuthUser(getAuth().currentUser ?? user);
  },
};
