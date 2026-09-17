// The web twin of emailAuthProvider.test.ts. Kept in sync deliberately —
// both bugs fixed below (see the two "regression" tests) were fixed
// identically on native and web, so both need the same coverage: a fix
// mirrored without a matching test is exactly how a regression slips back in
// on one platform only.

const mockCreateUser = jest.fn();
const mockSignIn = jest.fn();
const mockSendPasswordReset = jest.fn();
const mockSendEmailVerification = jest.fn();
const mockUpdateProfile = jest.fn();
const mockReload = jest.fn();
const mockGetIdToken = jest.fn();
const mockSetPersistence = jest.fn();

let mockCurrentUser: unknown = null;

jest.mock('../../data/firebaseWebApp', () => ({ webApp: jest.fn(() => ({})) }));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ get currentUser() { return mockCurrentUser; } })),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordReset(...args),
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  reload: (...args: unknown[]) => mockReload(...args),
  getIdToken: (...args: unknown[]) => mockGetIdToken(...args),
  setPersistence: (...args: unknown[]) => mockSetPersistence(...args),
  browserLocalPersistence: 'local',
}));

import { emailAuthProvider } from '../emailAuthProvider.web';
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
  mockSetPersistence.mockResolvedValue(undefined);
});

describe('emailAuthProvider.web — signUp', () => {
  it('creates the account, sets the display name, sends verification', async () => {
    mockCreateUser.mockResolvedValue({ user: rawUser });
    mockUpdateProfile.mockResolvedValue(undefined);
    mockSendEmailVerification.mockResolvedValue(undefined);

    const user = await emailAuthProvider.signUp('Ana', 'ana@example.com', 'password123');

    expect(mockCreateUser).toHaveBeenCalledWith(expect.anything(), 'ana@example.com', 'password123');
    expect(mockUpdateProfile).toHaveBeenCalledWith(rawUser, { displayName: 'Ana' });
    // Regression — Dynamic Links shutdown; see the sendPasswordReset test.
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

    await expect(
      emailAuthProvider.signUp('Ana', 'ana@example.com', 'password123'),
    ).rejects.toMatchObject({ kind: 'emailInUse' });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});

describe('emailAuthProvider.web — signIn', () => {
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

describe('emailAuthProvider.web — sendPasswordReset', () => {
  it('resolves normally on success', async () => {
    mockSendPasswordReset.mockResolvedValue(undefined);
    await expect(emailAuthProvider.sendPasswordReset('ana@example.com')).resolves.toBeUndefined();
  });

  // Regression: sendPasswordResetEmail (and sendEmailVerification) with no
  // actionCodeSettings used to fall back to a Dynamic Link to build the
  // default continue-URL. Dynamic Links has been shut down; on native this
  // now throws inside the SDK (a real user hit this in production — see
  // emailAuthProvider.test.ts). Always pass an explicit continue URL, on
  // both platforms, so this can't come back on either one alone.
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
    await expect(
      emailAuthProvider.sendPasswordReset('nobody@example.com'),
    ).resolves.toBeUndefined();
  });

  it('still throws a real error (e.g. invalid email)', async () => {
    mockSendPasswordReset.mockRejectedValue({ code: 'auth/invalid-email' });
    await expect(emailAuthProvider.sendPasswordReset('nope')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('emailAuthProvider.web — resendVerificationEmail', () => {
  it('no-ops when nobody is signed in', async () => {
    mockCurrentUser = null;
    await emailAuthProvider.resendVerificationEmail();
    expect(mockSendEmailVerification).not.toHaveBeenCalled();
  });

  it('resends for the current user with an explicit actionCodeSettings', async () => {
    mockCurrentUser = rawUser;
    mockSendEmailVerification.mockResolvedValue(undefined);
    await emailAuthProvider.resendVerificationEmail();
    expect(mockSendEmailVerification).toHaveBeenCalledWith(
      rawUser,
      expect.objectContaining({ url: expect.any(String) }),
    );
  });
});

describe('emailAuthProvider.web — reloadCurrentUser', () => {
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

    expect(mockReload).toHaveBeenCalled();
    expect(result?.emailVerified).toBe(true);
  });

  // Regression: reload() alone leaves the cached ID token's email_verified
  // claim stale — Firestore rules read the token's claim, not the profile,
  // so every request keeps failing signedIn() until the token happens to
  // rotate on its own. A real user hit this: verified, but stuck on a
  // permanently blank/loading screen right after (see
  // emailAuthProvider.test.ts for the full story).
  it('forces a fresh ID token after reload (regression)', async () => {
    mockCurrentUser = rawUser;
    mockReload.mockResolvedValue(undefined);

    await emailAuthProvider.reloadCurrentUser();

    expect(mockGetIdToken).toHaveBeenCalledWith(expect.anything(), true);
  });
});
