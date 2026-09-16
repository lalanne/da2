import { buildResetInput, buildSignInInput, buildSignUpInput, isValidEmail } from '../forms';
import { strings } from '../../i18n/strings';

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('ana@example.com')).toBe(true);
  });

  it('rejects missing @ or domain', () => {
    expect(isValidEmail('ana')).toBe(false);
    expect(isValidEmail('ana@')).toBe(false);
    expect(isValidEmail('ana@example')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('buildSignUpInput', () => {
  const valid = { name: 'Ana', email: 'ana@example.com', password: 'password123' };

  it('accepts valid fields, trimming name and email', () => {
    const result = buildSignUpInput({ ...valid, name: '  Ana  ', email: ' ana@example.com ' });
    expect(result).toEqual({ ok: true, value: valid });
  });

  it('rejects a missing name', () => {
    const result = buildSignUpInput({ ...valid, name: '  ' });
    expect(result).toEqual({ ok: false, error: strings.auth.email.missingName });
  });

  it('rejects an invalid email', () => {
    const result = buildSignUpInput({ ...valid, email: 'not-an-email' });
    expect(result).toEqual({ ok: false, error: strings.auth.errors.invalidEmail });
  });

  it('rejects a password under 8 characters', () => {
    const result = buildSignUpInput({ ...valid, password: 'short1' });
    expect(result).toEqual({ ok: false, error: strings.auth.email.passwordTooShort });
  });
});

describe('buildSignInInput', () => {
  it('accepts a valid email + non-empty password', () => {
    const result = buildSignInInput({ email: 'ana@example.com', password: 'x' });
    expect(result).toEqual({ ok: true, value: { email: 'ana@example.com', password: 'x' } });
  });

  it('rejects an invalid email', () => {
    const result = buildSignInInput({ email: 'nope', password: 'x' });
    expect(result).toEqual({ ok: false, error: strings.auth.errors.invalidEmail });
  });

  it('rejects an empty password', () => {
    const result = buildSignInInput({ email: 'ana@example.com', password: '' });
    expect(result).toEqual({ ok: false, error: strings.auth.errors.wrongCredentials });
  });
});

describe('buildResetInput', () => {
  it('accepts and trims a valid email', () => {
    expect(buildResetInput(' ana@example.com ')).toEqual({ ok: true, value: 'ana@example.com' });
  });

  it('rejects an invalid email', () => {
    expect(buildResetInput('nope')).toEqual({ ok: false, error: strings.auth.errors.invalidEmail });
  });
});
