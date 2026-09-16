import { mapAuthError } from '../mapAuthError';
import { AuthError } from '../AuthError';

describe('mapAuthError', () => {
  it('passes an existing AuthError through unchanged', () => {
    const original = new AuthError('emailInUse');
    expect(mapAuthError(original)).toBe(original);
  });

  it.each([
    ['auth/wrong-password', 'wrongCredentials'],
    ['auth/user-not-found', 'wrongCredentials'],
    ['auth/invalid-credential', 'wrongCredentials'],
    ['auth/invalid-login-credentials', 'wrongCredentials'],
    ['auth/email-already-in-use', 'emailInUse'],
    ['auth/weak-password', 'weakPassword'],
    ['auth/invalid-email', 'invalidEmail'],
    ['auth/too-many-requests', 'tooManyRequests'],
    ['auth/network-request-failed', 'networkError'],
  ] as const)('maps %s to %s', (code, kind) => {
    const result = mapAuthError({ code });
    expect(result).toBeInstanceOf(AuthError);
    expect(result.kind).toBe(kind);
  });

  it('falls back to unknown for an unrecognized code', () => {
    expect(mapAuthError({ code: 'auth/something-new' }).kind).toBe('unknown');
  });

  it('falls back to unknown for a plain Error with no code', () => {
    expect(mapAuthError(new Error('boom')).kind).toBe('unknown');
  });
});
