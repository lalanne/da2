import { create } from 'zustand';
import type { AuthProvider, AuthUser } from '../auth/AuthProvider';
import { AuthError } from '../auth/AuthError';
import { googleAuthProvider } from '../auth/googleAuthProvider';
import { ensureUserProfile } from '../data/userProfileRepository';

interface AuthState {
  user: AuthUser | null;
  isInitializing: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function createAuthStore(provider: AuthProvider) {
  return create<AuthState>((set) => {
    provider.onAuthStateChanged((user) => {
      set({ user, isInitializing: false });
    });

    return {
      user: null,
      isInitializing: true,
      isSigningIn: false,
      error: null,

      signIn: async () => {
        set({ isSigningIn: true, error: null });
        try {
          const user = await provider.signIn();
          await ensureUserProfile(user);
          set({ user });
        } catch (error) {
          if (!(error instanceof AuthError) || error.kind !== 'signInCancelled') {
            set({ error: (error as Error).message });
          }
        } finally {
          set({ isSigningIn: false });
        }
      },

      signOut: async () => {
        await provider.signOut();
        set({ user: null });
      },
    };
  });
}

export const useAuthStore = createAuthStore(googleAuthProvider);
