import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  getAuth,
  GoogleAuthProvider as FirebaseGoogleAuthProvider,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { AuthError } from './AuthError';
import type { AuthProvider, AuthUser } from './AuthProvider';

// Web client ID (client_type 3) from google-services.json — required by
// @react-native-google-signin even on Android so it can request an ID token
// Firebase Auth accepts. Read lazily (not at module load) so it reflects the
// env at call time rather than whatever was set when this module first ran.
function getWebClientId(): string {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new AuthError(
      'unknown',
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. See specs/001-auth.md.',
    );
  }
  return webClientId;
}

function toAuthUser(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
  };
}

async function getGoogleIdToken(): Promise<string> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) {
      throw new AuthError('signInCancelled');
    }
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new AuthError('unknown', 'Missing Google ID token');
    }
    return response.data.idToken;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    const code = (error as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      throw new AuthError('signInCancelled');
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new AuthError('playServicesUnavailable');
    }
    throw new AuthError('unknown', (error as Error)?.message);
  }
}

export const googleAuthProvider: AuthProvider = {
  async signIn() {
    GoogleSignin.configure({ webClientId: getWebClientId() });
    const idToken = await getGoogleIdToken();
    const credential = FirebaseGoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(getAuth(), credential);
    return toAuthUser(userCredential.user);
  },

  async signOut() {
    await firebaseSignOut(getAuth());
    try {
      await GoogleSignin.signOut();
    } catch {
      // best-effort — Google session cleanup shouldn't block app sign-out
    }
  },

  onAuthStateChanged(listener) {
    return onFirebaseAuthStateChanged(getAuth(), (user) => {
      listener(user ? toAuthUser(user) : null);
    });
  },
};
