import { AuthError } from '../AuthError';

describe('AuthError', () => {
  it('uses the default message for its kind when none is given', () => {
    const error = new AuthError('signInCancelled');
    expect(error.kind).toBe('signInCancelled');
    expect(error.message).toMatch(/cancelled/i);
  });

  it('preserves a custom message when provided', () => {
    const error = new AuthError('unknown', 'boom');
    expect(error.message).toBe('boom');
  });
});
