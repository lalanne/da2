import { createAuthStore } from '../authStore';
import { AuthError } from '../../auth/AuthError';
import type { AuthProvider, AuthUser, EmailAuthProvider } from '../../auth/AuthProvider';
import { ensureUserProfile } from '../../data/userProfileRepository';
import { strings } from '../../i18n/strings';

jest.mock('../../data/userProfileRepository', () => ({
  ensureUserProfile: jest.fn(),
}));

const mockedEnsureUserProfile = ensureUserProfile as jest.Mock;

const testUser: AuthUser = {
  uid: 'uid-1',
  displayName: 'Ana',
  email: 'ana@example.com',
  photoUrl: null,
  emailVerified: true,
};

function fakeProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    signIn: jest.fn(async () => testUser),
    signOut: jest.fn(async () => {}),
    onAuthStateChanged: jest.fn(() => () => {}),
    ...overrides,
  };
}

function fakeEmailProvider(overrides: Partial<EmailAuthProvider> = {}): EmailAuthProvider {
  return {
    signUp: jest.fn(async () => testUser),
    signIn: jest.fn(async () => testUser),
    sendPasswordReset: jest.fn(async () => {}),
    resendVerificationEmail: jest.fn(async () => {}),
    reloadCurrentUser: jest.fn(async () => testUser),
    ...overrides,
  };
}

beforeEach(() => {
  mockedEnsureUserProfile.mockReset();
  mockedEnsureUserProfile.mockResolvedValue(undefined);
});

describe('authStore — Google sign-in', () => {
  it('signs in, creates the profile, and stores the user', async () => {
    const provider = fakeProvider();
    const useStore = createAuthStore(provider, fakeEmailProvider());

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
    const useStore = createAuthStore(provider, fakeEmailProvider());

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
    const useStore = createAuthStore(provider, fakeEmailProvider());

    await useStore.getState().signIn();

    expect(mockedEnsureUserProfile).not.toHaveBeenCalled();
    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().error).toBe(strings.auth.errors.networkError);
  });

  it('clears the user on sign-out', async () => {
    const provider = fakeProvider();
    const useStore = createAuthStore(provider, fakeEmailProvider());
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
    const useStore = createAuthStore(provider, fakeEmailProvider());

    expect(useStore.getState().isInitializing).toBe(true);
    capturedListener?.(testUser);

    expect(useStore.getState().user).toEqual(testUser);
    expect(useStore.getState().isInitializing).toBe(false);
  });
});

describe('authStore — email/password (spec 014)', () => {
  it('signs up, creates the profile, and stores the (unverified) user', async () => {
    const unverified = { ...testUser, emailVerified: false };
    const emailProvider = fakeEmailProvider({ signUp: jest.fn(async () => unverified) });
    const useStore = createAuthStore(fakeProvider(), emailProvider);

    const ok = await useStore.getState().signUpWithEmail('Ana', 'ana@example.com', 'password123');

    expect(ok).toBe(true);
    expect(emailProvider.signUp).toHaveBeenCalledWith('Ana', 'ana@example.com', 'password123');
    expect(mockedEnsureUserProfile).toHaveBeenCalledWith(unverified);
    expect(useStore.getState().user).toEqual(unverified);
  });

  it('surfaces email-already-in-use without creating a profile', async () => {
    const emailProvider = fakeEmailProvider({
      signUp: jest.fn(async () => {
        throw new AuthError('emailInUse');
      }),
    });
    const useStore = createAuthStore(fakeProvider(), emailProvider);

    const ok = await useStore.getState().signUpWithEmail('Ana', 'ana@example.com', 'password123');

    expect(ok).toBe(false);
    expect(mockedEnsureUserProfile).not.toHaveBeenCalled();
    expect(useStore.getState().error).toBe(strings.auth.errors.emailInUse);
  });

  it('signs in with email/password and stores the user', async () => {
    const emailProvider = fakeEmailProvider();
    const useStore = createAuthStore(fakeProvider(), emailProvider);

    const ok = await useStore.getState().signInWithEmail('ana@example.com', 'password123');

    expect(ok).toBe(true);
    expect(emailProvider.signIn).toHaveBeenCalledWith('ana@example.com', 'password123');
    expect(useStore.getState().user).toEqual(testUser);
  });

  it('surfaces one merged error for wrong credentials', async () => {
    const emailProvider = fakeEmailProvider({
      signIn: jest.fn(async () => {
        throw new AuthError('wrongCredentials');
      }),
    });
    const useStore = createAuthStore(fakeProvider(), emailProvider);

    const ok = await useStore.getState().signInWithEmail('ana@example.com', 'wrong');

    expect(ok).toBe(false);
    expect(useStore.getState().error).toBe(strings.auth.errors.wrongCredentials);
  });

  it('sends a password reset without touching the user/profile', async () => {
    const emailProvider = fakeEmailProvider();
    const useStore = createAuthStore(fakeProvider(), emailProvider);

    const ok = await useStore.getState().sendPasswordReset('ana@example.com');

    expect(ok).toBe(true);
    expect(emailProvider.sendPasswordReset).toHaveBeenCalledWith('ana@example.com');
    expect(mockedEnsureUserProfile).not.toHaveBeenCalled();
  });

  it('resends the verification email', async () => {
    const emailProvider = fakeEmailProvider();
    const useStore = createAuthStore(fakeProvider(), emailProvider);

    const ok = await useStore.getState().resendVerificationEmail();

    expect(ok).toBe(true);
    expect(emailProvider.resendVerificationEmail).toHaveBeenCalled();
  });

  it('refreshes emailVerified after the user confirms they clicked the link', async () => {
    const verified = { ...testUser, emailVerified: true };
    const emailProvider = fakeEmailProvider({ reloadCurrentUser: jest.fn(async () => verified) });
    const useStore = createAuthStore(fakeProvider(), emailProvider);
    useStore.setState({ user: { ...testUser, emailVerified: false } });

    const ok = await useStore.getState().refreshEmailVerified();

    expect(ok).toBe(true);
    expect(useStore.getState().user).toEqual(verified);
  });

  it('refreshEmailVerified keeps user unset when nobody is signed in (null result)', async () => {
    const emailProvider = fakeEmailProvider({ reloadCurrentUser: jest.fn(async () => null) });
    const useStore = createAuthStore(fakeProvider(), emailProvider);

    const ok = await useStore.getState().refreshEmailVerified();

    expect(ok).toBe(true);
    expect(useStore.getState().user).toBeNull();
  });

  it('refreshEmailVerified reflects a still-unverified result', async () => {
    const stillUnverified = { ...testUser, emailVerified: false };
    const emailProvider = fakeEmailProvider({
      reloadCurrentUser: jest.fn(async () => stillUnverified),
    });
    const useStore = createAuthStore(fakeProvider(), emailProvider);
    useStore.setState({ user: stillUnverified });

    await useStore.getState().refreshEmailVerified();

    expect(useStore.getState().user).toEqual(stillUnverified);
  });
});
