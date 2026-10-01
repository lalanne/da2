const mockSignInWithPopup = jest.fn();
const mockSetPersistence = jest.fn();
const mockOnAuthStateChanged = jest.fn();
const mockSignOut = jest.fn();
const mockGetAuth = jest.fn(() => ({}));

jest.mock('firebase/auth', () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  GoogleAuthProvider: class {},
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  browserLocalPersistence: 'browserLocalPersistence',
  setPersistence: (...args: unknown[]) => mockSetPersistence(...args),
}));

jest.mock('../../data/firebaseWebApp', () => ({ webApp: jest.fn(() => ({})) }));

import { googleAuthProvider } from '../googleAuthProvider.web';
import { AuthError } from '../AuthError';

beforeEach(() => {
  jest.clearAllMocks();
});

// Regression: Safari (and some Chromium popup-blocker configurations) only
// honors `window.open` as a direct result of a user gesture if nothing async
// runs between the click and the popup call. `setPersistence` does an
// IndexedDB round-trip; awaiting it before `signInWithPopup` introduced that
// gap, so every web sign-in failed with `auth/popup-blocked` — reported from
// a real browser session clicking "Continuar con Google" on da2-coparenting
// .web.app. Local persistence is already the Firebase web SDK's default, so
// the call was redundant as well as the cause.
describe('googleAuthProvider (web) signIn', () => {
  it('calls signInWithPopup without first awaiting setPersistence', async () => {
    mockSignInWithPopup.mockResolvedValue({
      user: { uid: 'uid-1', displayName: 'Ana', email: 'ana@example.com', photoURL: null, emailVerified: true },
    });

    await googleAuthProvider.signIn();

    expect(mockSetPersistence).not.toHaveBeenCalled();
    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
  });

  it('maps auth/popup-blocked to a dedicated, friendly AuthError', async () => {
    mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-blocked' });

    await expect(googleAuthProvider.signIn()).rejects.toMatchObject({ kind: 'popupBlocked' });
  });

  it('still maps popup-closed-by-user to signInCancelled', async () => {
    mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });

    await expect(googleAuthProvider.signIn()).rejects.toMatchObject({ kind: 'signInCancelled' });
  });

  it('throws AuthError, not a raw Firebase error, on success path failures', async () => {
    mockSignInWithPopup.mockRejectedValue({ code: 'auth/network-request-failed' });

    await expect(googleAuthProvider.signIn()).rejects.toBeInstanceOf(AuthError);
  });
});
