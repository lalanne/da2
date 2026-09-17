const mockCreateUser = jest.fn();
const mockSignIn = jest.fn();
const mockSendPasswordReset = jest.fn();
const mockSendEmailVerification = jest.fn();
const mockUpdateProfile = jest.fn();
const mockReload = jest.fn();
const mockGetIdToken = jest.fn();

let mockCurrentUser: unknown = null;

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({ get currentUser() { return mockCurrentUser; } })),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordReset(...args),
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  reload: (...args: unknown[]) => mockReload(...args),
  getIdToken: (...args: unknown[]) => mockGetIdToken(...args),
}));

import { emailAuthProvider } from '../emailAuthProvider';
import { AuthError } from '../AuthError';

const rawUser = {
  uid: 'uid-1',
  displayName: null,
  email: 'ana@example.com',
  photoURL: null,
  emailVerified: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = null;
});

describe('emailAuthProvider.signUp', () => {
  it('creates the account, sets the display name, sends verification', async () => {
    mockCreateUser.mockResolvedValue({ user: rawUser });
    mockUpdateProfile.mockResolvedValue(undefined);
    mockSendEmailVerification.mockResolvedValue(undefined);

    const user = await emailAuthProvider.signUp('Ana', 'ana@example.com', 'password123');

    expect(mockCreateUser).toHaveBeenCalledWith(expect.anything(), 'ana@example.com', 'password123');
    expect(mockUpdateProfile).toHaveBeenCalledWith(rawUser, { displayName: 'Ana' });
    // Regression — see the sendPasswordReset test for why this matters.
    expect(mockSendEmailVerification).toHaveBeenCalledWith(
      rawUser,
      expect.objectContaining({ url: expect.any(String) }),
    );
    expect(user).toEqual({
      uid: 'uid-1',
      displayName: 'Ana',
      email: 'ana@example.com',
      photoUrl: null,
      emailVerified: false,
    });
  });

  it('maps an email-already-in-use failure', async () => {
    mockCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });

    await expect(emailAuthProvider.signUp('Ana', 'ana@example.com', 'password123')).rejects.toMatchObject({
      kind: 'emailInUse',
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});

describe('emailAuthProvider.signIn', () => {
  it('signs in and maps the returned user', async () => {
    mockSignIn.mockResolvedValue({ user: { ...rawUser, displayName: 'Ana', emailVerified: true } });

    const user = await emailAuthProvider.signIn('ana@example.com', 'password123');

    expect(mockSignIn).toHaveBeenCalledWith(expect.anything(), 'ana@example.com', 'password123');
    expect(user.emailVerified).toBe(true);
  });

  it('collapses wrong-password / user-not-found to wrongCredentials', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' });

    await expect(emailAuthProvider.signIn('ana@example.com', 'bad')).rejects.toMatchObject({
      kind: 'wrongCredentials',
    });
  });
});

describe('emailAuthProvider.sendPasswordReset', () => {
  it('resolves normally on success', async () => {
    mockSendPasswordReset.mockResolvedValue(undefined);
    await expect(emailAuthProvider.sendPasswordReset('ana@example.com')).resolves.toBeUndefined();
  });

  // Regression: calling this with no actionCodeSettings throws inside the
  // native SDK now that Dynamic Links (the old fallback) is shut down —
  // surfaces to a real user as a mangled "Cannot read property 'replace' of
  // undefined", not a real error code. Always pass an explicit continue URL.
  it('always passes an explicit actionCodeSettings (regression)', async () => {
    mockSendPasswordReset.mockResolvedValue(undefined);
    await emailAuthProvider.sendPasswordReset('ana@example.com');
    expect(mockSendPasswordReset).toHaveBeenCalledWith(
      expect.anything(),
      'ana@example.com',
      expect.objectContaining({ url: expect.any(String) }),
    );
  });

  it('swallows a not-found error (never reveal account existence)', async () => {
    mockSendPasswordReset.mockRejectedValue({ code: 'auth/user-not-found' });
    await expect(emailAuthProvider.sendPasswordReset('nobody@example.com')).resolves.toBeUndefined();
  });

  it('still throws a real error (e.g. invalid email)', async () => {
    mockSendPasswordReset.mockRejectedValue({ code: 'auth/invalid-email' });
    await expect(emailAuthProvider.sendPasswordReset('nope')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('emailAuthProvider.resendVerificationEmail', () => {
  it('no-ops when nobody is signed in', async () => {
    mockCurrentUser = null;
    await emailAuthProvider.resendVerificationEmail();
    expect(mockSendEmailVerification).not.toHaveBeenCalled();
  });

  it('resends for the current user', async () => {
    mockCurrentUser = rawUser;
    mockSendEmailVerification.mockResolvedValue(undefined);
    await emailAuthProvider.resendVerificationEmail();
    expect(mockSendEmailVerification).toHaveBeenCalledWith(rawUser, {
      url: 'https://da2-coparenting.web.app',
      handleCodeInApp: false,
    });
  });
});

describe('emailAuthProvider.reloadCurrentUser', () => {
  it('returns null when nobody is signed in', async () => {
    mockCurrentUser = null;
    const result = await emailAuthProvider.reloadCurrentUser();
    expect(result).toBeNull();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('reloads and returns the (possibly now-verified) user', async () => {
    mockCurrentUser = rawUser;
    mockReload.mockImplementation(async () => {
      mockCurrentUser = { ...rawUser, emailVerified: true };
    });

    const result = await emailAuthProvider.reloadCurrentUser();
    // Regression: reload() alone leaves the cached ID token's
    // email_verified claim stale — every Firestore request keeps failing
    // signedIn() until the token is force-refreshed. This bit a real user
    // in production: verification succeeded, but they were stuck on a
    // permanently blank/loading screen afterward because every listener
    // kept silently retrying against the stale claim.
    expect(mockGetIdToken).toHaveBeenCalledWith(expect.anything(), true);

    expect(mockReload).toHaveBeenCalled();
    expect(result?.emailVerified).toBe(true);
  });
});
