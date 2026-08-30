export type AuthErrorKind =
  | 'signInCancelled'
  | 'networkError'
  | 'playServicesUnavailable'
  | 'unknown';

const AUTH_ERROR_MESSAGES: Record<AuthErrorKind, string> = {
  signInCancelled: 'Sign-in was cancelled.',
  networkError: 'Network error. Please try again.',
  playServicesUnavailable: 'Google Play Services is required to sign in.',
  unknown: 'Something went wrong. Please try again.',
};

export class AuthError extends Error {
  readonly kind: AuthErrorKind;

  constructor(kind: AuthErrorKind, message?: string) {
    super(message ?? AUTH_ERROR_MESSAGES[kind]);
    this.kind = kind;
  }
}
