import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload,
  getIdToken,
} from '@react-native-firebase/auth';
import { mapAuthError } from './mapAuthError';
import type { AuthUser, EmailAuthProvider } from './AuthProvider';

// Required as of 2026 — Firebase's action-link emails (verify/reset) used to
// fall back to a Dynamic Link for the "continue" URL when none was given;
// Dynamic Links has since been shut down, and calling sendEmailVerification /
// sendPasswordResetEmail with no actionCodeSettings now throws inside the
// native SDK on iOS (surfaces as a mangled "Cannot read property 'replace'
// of undefined" — nothing to do with our own code). Always pass an explicit
// continue URL; `handleCodeInApp: false` means Firebase's own hosted page
// handles the link, then redirects here.
const ACTION_CODE_SETTINGS = {
  url: 'https://da2-coparenting.web.app',
  handleCodeInApp: false,
};

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
      await sendEmailVerification(user, ACTION_CODE_SETTINGS);
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
      await sendPasswordResetEmail(getAuth(), email, ACTION_CODE_SETTINGS);
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
      await sendEmailVerification(user, ACTION_CODE_SETTINGS);
    } catch (error) {
      throw mapAuthError(error);
    }
  },

  async reloadCurrentUser() {
    const user = getAuth().currentUser;
    if (!user) return null;
    await reload(user);
    // `reload()` refreshes the local user *profile* (this is what flips
    // `emailVerified` to true) but NOT the cached ID token — Firestore rules
    // read `request.auth.token.email_verified`, a claim baked into that
    // token when it was minted (still `false`, from before verification).
    // Without forcing a fresh token here, every Firestore request keeps
    // failing signedIn() until the SDK happens to rotate the token on its
    // own (up to ~1h) — silently, since our listeners swallow and retry
    // errors, so it just looks like a permanently stuck loading spinner.
    await getIdToken(getAuth().currentUser ?? user, true);
    return toAuthUser(getAuth().currentUser ?? user);
  },
};
