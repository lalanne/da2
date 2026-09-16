import { create } from 'zustand';
import type { AuthProvider, AuthUser, EmailAuthProvider } from '../auth/AuthProvider';
import { AuthError } from '../auth/AuthError';
import { googleAuthProvider } from '../auth/googleAuthProvider';
import { emailAuthProvider } from '../auth/emailAuthProvider';
import { ensureUserProfile } from '../data/userProfileRepository';

interface AuthState {
  user: AuthUser | null;
  isInitializing: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  // Spec 014 — email/password. Share `isSigningIn`/`error` with `signIn`
  // above: only one auth screen/flow is ever visible at a time.
  signUpWithEmail: (name: string, email: string, password: string) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  resendVerificationEmail: () => Promise<boolean>;
  /** Re-checks `emailVerified` after the user says they clicked the link. */
  refreshEmailVerified: () => Promise<boolean>;
}

export function createAuthStore(provider: AuthProvider, emailProvider: EmailAuthProvider) {
  return create<AuthState>((set) => {
    // One underlying Firebase Auth instance regardless of which provider
    // signed the user in — a single listener covers both.
    provider.onAuthStateChanged((user) => {
      set({ user, isInitializing: false });
    });

    async function run(action: () => Promise<AuthUser | null>): Promise<boolean> {
      set({ isSigningIn: true, error: null });
      try {
        const user = await action();
        if (user) {
          await ensureUserProfile(user);
          set({ user });
        }
        return true;
      } catch (error) {
        if (!(error instanceof AuthError) || error.kind !== 'signInCancelled') {
          set({ error: (error as Error).message });
        }
        return false;
      } finally {
        set({ isSigningIn: false });
      }
    }

    return {
      user: null,
      isInitializing: true,
      isSigningIn: false,
      error: null,

      signIn: async () => {
        await run(() => provider.signIn());
      },

      signOut: async () => {
        await provider.signOut();
        set({ user: null });
      },

      signUpWithEmail: (name, email, password) =>
        run(() => emailProvider.signUp(name, email, password)),

      signInWithEmail: (email, password) => run(() => emailProvider.signIn(email, password)),

      sendPasswordReset: async (email) => {
        set({ isSigningIn: true, error: null });
        try {
          await emailProvider.sendPasswordReset(email);
          return true;
        } catch (error) {
          set({ error: (error as Error).message });
          return false;
        } finally {
          set({ isSigningIn: false });
        }
      },

      resendVerificationEmail: async () => {
        set({ isSigningIn: true, error: null });
        try {
          await emailProvider.resendVerificationEmail();
          return true;
        } catch (error) {
          set({ error: (error as Error).message });
          return false;
        } finally {
          set({ isSigningIn: false });
        }
      },

      refreshEmailVerified: () => run(() => emailProvider.reloadCurrentUser()),
    };
  });
}

export const useAuthStore = createAuthStore(googleAuthProvider, emailAuthProvider);
