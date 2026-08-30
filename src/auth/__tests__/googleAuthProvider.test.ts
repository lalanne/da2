const mockHasPlayServices = jest.fn();
const mockGoogleSignIn = jest.fn();
const mockGoogleSignOut = jest.fn();
const mockConfigure = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (...args: unknown[]) => mockConfigure(...args),
    hasPlayServices: (...args: unknown[]) => mockHasPlayServices(...args),
    signIn: (...args: unknown[]) => mockGoogleSignIn(...args),
    signOut: (...args: unknown[]) => mockGoogleSignOut(...args),
  },
  isCancelledResponse: (response: { type: string }) => response.type === 'cancelled',
  isSuccessResponse: (response: { type: string }) => response.type === 'success',
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' },
}));

const mockSignInWithCredential = jest.fn();
const mockCredential = jest.fn((idToken: string) => ({ idToken }));

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  GoogleAuthProvider: { credential: (idToken: string) => mockCredential(idToken) },
  onAuthStateChanged: jest.fn(),
  signInWithCredential: (...args: unknown[]) => mockSignInWithCredential(...args),
  signOut: jest.fn(),
}));

import { googleAuthProvider } from '../googleAuthProvider';
import { AuthError } from '../AuthError';

const ORIGINAL_ENV = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-client-id';
  mockHasPlayServices.mockResolvedValue(true);
});

afterAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = ORIGINAL_ENV;
});

describe('googleAuthProvider.signIn', () => {
  it('exchanges a Google ID token for a Firebase user', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'id-token' } });
    mockSignInWithCredential.mockResolvedValue({
      user: { uid: 'uid-1', displayName: 'Ana', email: 'ana@example.com', photoURL: null },
    });

    const user = await googleAuthProvider.signIn();

    expect(mockCredential).toHaveBeenCalledWith('id-token');
    expect(user).toEqual({ uid: 'uid-1', displayName: 'Ana', email: 'ana@example.com', photoUrl: null });
  });

  it('throws a signInCancelled AuthError when the user cancels', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled' });

    await expect(googleAuthProvider.signIn()).rejects.toMatchObject({ kind: 'signInCancelled' });
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });

  it('throws when the web client id is not configured', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    await expect(googleAuthProvider.signIn()).rejects.toBeInstanceOf(AuthError);
    expect(mockGoogleSignIn).not.toHaveBeenCalled();
  });
});
