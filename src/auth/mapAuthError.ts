import { AuthError, type AuthErrorKind } from './AuthError';

/**
 * Firebase's email/password error codes are identical between the native
 * (`@react-native-firebase/auth`) and web (`firebase/auth`) SDKs — one
 * mapping, shared by both `emailAuthProvider.ts` and `.web.ts`.
 *
 * `auth/wrong-password`, `auth/user-not-found` and `auth/invalid-credential`
 * (newer SDKs consolidate the first two into the third) all collapse to the
 * same `wrongCredentials` kind — never reveal which one was wrong.
 */
const CODE_TO_KIND: Record<string, AuthErrorKind> = {
  'auth/wrong-password': 'wrongCredentials',
  'auth/user-not-found': 'wrongCredentials',
  'auth/invalid-credential': 'wrongCredentials',
  'auth/invalid-login-credentials': 'wrongCredentials',
  'auth/email-already-in-use': 'emailInUse',
  'auth/weak-password': 'weakPassword',
  'auth/invalid-email': 'invalidEmail',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'networkError',
};

export function mapAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const code = (error as { code?: string })?.code;
  const kind = (code && CODE_TO_KIND[code]) || 'unknown';
  return new AuthError(kind, kind === 'unknown' ? (error as Error)?.message : undefined);
}
