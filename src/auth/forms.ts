import { strings } from '../i18n/strings';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const MIN_PASSWORD_LENGTH = 8;

// Deliberately simple — not a strict RFC 5322 validator. Firebase itself
// rejects a genuinely malformed address server-side; this just catches an
// obviously-empty or missing-@ typo before a round trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export interface SignUpFields {
  name: string;
  email: string;
  password: string;
}

export function buildSignUpInput(fields: SignUpFields): Result<SignUpFields> {
  const e = strings.auth.email;
  const name = fields.name.trim();
  const email = fields.email.trim();
  if (!name) return { ok: false, error: e.missingName };
  if (!email || !isValidEmail(email)) {
    return { ok: false, error: strings.auth.errors.invalidEmail };
  }
  if (fields.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: e.passwordTooShort };
  }
  return { ok: true, value: { name, email, password: fields.password } };
}

export interface SignInFields {
  email: string;
  password: string;
}

export function buildSignInInput(fields: SignInFields): Result<SignInFields> {
  const email = fields.email.trim();
  if (!email || !isValidEmail(email)) {
    return { ok: false, error: strings.auth.errors.invalidEmail };
  }
  if (!fields.password) {
    return { ok: false, error: strings.auth.errors.wrongCredentials };
  }
  return { ok: true, value: { email, password: fields.password } };
}

export function buildResetInput(email: string): Result<string> {
  const trimmed = email.trim();
  if (!trimmed || !isValidEmail(trimmed)) {
    return { ok: false, error: strings.auth.errors.invalidEmail };
  }
  return { ok: true, value: trimmed };
}
