import { strings } from '../i18n/strings';

export type AuthErrorKind =
  | 'signInCancelled'
  | 'networkError'
  | 'playServicesUnavailable'
  | 'unknown';

const AUTH_ERROR_MESSAGES: Record<AuthErrorKind, string> = {
  signInCancelled: strings.auth.errors.signInCancelled,
  networkError: strings.auth.errors.networkError,
  playServicesUnavailable: strings.auth.errors.playServicesUnavailable,
  unknown: strings.auth.errors.unknown,
};

export class AuthError extends Error {
  readonly kind: AuthErrorKind;

  constructor(kind: AuthErrorKind, message?: string) {
    super(message ?? AUTH_ERROR_MESSAGES[kind]);
    this.kind = kind;
  }
}
