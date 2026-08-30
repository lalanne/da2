import { createAuthStore } from '../authStore';
import { AuthError } from '../../auth/AuthError';
import type { AuthProvider, AuthUser } from '../../auth/AuthProvider';
import { ensureUserProfile } from '../../data/userProfileRepository';

jest.mock('../../data/userProfileRepository', () => ({
  ensureUserProfile: jest.fn(),
}));

const mockedEnsureUserProfile = ensureUserProfile as jest.Mock;

const testUser: AuthUser = {
  uid: 'uid-1',
  displayName: 'Ana',
  email: 'ana@example.com',
  photoUrl: null,
};

function fakeProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    signIn: jest.fn(async () => testUser),
    signOut: jest.fn(async () => {}),
    onAuthStateChanged: jest.fn(() => () => {}),
    ...overrides,
  };
}

beforeEach(() => {
  mockedEnsureUserProfile.mockReset();
  mockedEnsureUserProfile.mockResolvedValue(undefined);
});

describe('authStore', () => {
  it('signs in, creates the profile, and stores the user', async () => {
    const provider = fakeProvider();
    const useStore = createAuthStore(provider);

    await useStore.getState().signIn();

    expect(mockedEnsureUserProfile).toHaveBeenCalledWith(testUser);
    expect(useStore.getState().user).toEqual(testUser);
    expect(useStore.getState().error).toBeNull();
  });

  it('leaves state clean when the user cancels sign-in', async () => {
    const provider = fakeProvider({
      signIn: jest.fn(async () => {
        throw new AuthError('signInCancelled');
      }),
    });
    const useStore = createAuthStore(provider);

    await useStore.getState().signIn();

    expect(mockedEnsureUserProfile).not.toHaveBeenCalled();
    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().error).toBeNull();
    expect(useStore.getState().isSigningIn).toBe(false);
  });

  it('surfaces a non-cancellation error without creating a profile', async () => {
    const provider = fakeProvider({
      signIn: jest.fn(async () => {
        throw new AuthError('networkError');
      }),
    });
    const useStore = createAuthStore(provider);

    await useStore.getState().signIn();

    expect(mockedEnsureUserProfile).not.toHaveBeenCalled();
    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().error).toMatch(/network/i);
  });

  it('clears the user on sign-out', async () => {
    const provider = fakeProvider();
    const useStore = createAuthStore(provider);
    useStore.setState({ user: testUser });

    await useStore.getState().signOut();

    expect(provider.signOut).toHaveBeenCalled();
    expect(useStore.getState().user).toBeNull();
  });

  it('reflects the provider auth state on init', () => {
    let capturedListener: ((user: AuthUser | null) => void) | undefined;
    const provider = fakeProvider({
      onAuthStateChanged: jest.fn((listener) => {
        capturedListener = listener;
        return () => {};
      }),
    });
    const useStore = createAuthStore(provider);

    expect(useStore.getState().isInitializing).toBe(true);
    capturedListener?.(testUser);

    expect(useStore.getState().user).toEqual(testUser);
    expect(useStore.getState().isInitializing).toBe(false);
  });
});
