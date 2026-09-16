import { strings } from '../i18n/strings';

export type AuthErrorKind =
  | 'signInCancelled'
  | 'networkError'
  | 'playServicesUnavailable'
  // Spec 014 — email/password:
  | 'wrongCredentials' // wrong password OR unknown email, deliberately merged
  | 'emailInUse'
  | 'weakPassword'
  | 'invalidEmail'
  | 'tooManyRequests'
  | 'unknown';

const AUTH_ERROR_MESSAGES: Record<AuthErrorKind, string> = {
  signInCancelled: strings.auth.errors.signInCancelled,
  networkError: strings.auth.errors.networkError,
  playServicesUnavailable: strings.auth.errors.playServicesUnavailable,
  wrongCredentials: strings.auth.errors.wrongCredentials,
  emailInUse: strings.auth.errors.emailInUse,
  weakPassword: strings.auth.errors.weakPassword,
  invalidEmail: strings.auth.errors.invalidEmail,
  tooManyRequests: strings.auth.errors.tooManyRequests,
  unknown: strings.auth.errors.unknown,
};

export class AuthError extends Error {
  readonly kind: AuthErrorKind;

  constructor(kind: AuthErrorKind, message?: string) {
    super(message ?? AUTH_ERROR_MESSAGES[kind]);
    this.kind = kind;
  }
}
