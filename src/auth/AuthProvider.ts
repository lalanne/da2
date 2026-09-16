export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  /** Spec 014: Google (and later Apple) accounts always come back `true` —
   * this only ever gates email/password sign-ups. */
  emailVerified: boolean;
}

/**
 * Provider-agnostic auth interface. Screens and stores depend only on this;
 * adding Sign in with Apple later means writing a new implementation of this
 * interface, not touching call sites.
 */
export interface AuthProvider {
  signIn(): Promise<AuthUser>;
  signOut(): Promise<void>;
  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void;
}

/**
 * Spec 014 — the credential-based sibling to `AuthProvider` (Google/Apple's
 * parameterless `signIn()`). Kept as a separate interface rather than
 * folded into `AuthProvider` because the shapes genuinely differ (email +
 * password inputs, a reset flow, a verification re-check) — screens and the
 * store depend on both, wired to the same underlying Firebase Auth session.
 *
 * Defined here rather than its own file: a same-named `EmailAuthProvider.ts`
 * next to the implementation's `emailAuthProvider.ts` collides on a
 * case-insensitive filesystem (macOS default) — same lesson as
 * `googleAuthProvider.ts` living next to this file instead of `Google.ts`.
 */
export interface EmailAuthProvider {
  signUp(name: string, email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  sendPasswordReset(email: string): Promise<void>;
  resendVerificationEmail(): Promise<void>;
  /**
   * Firebase doesn't push `emailVerified` changes to the live session —
   * call this after the user says they've clicked the emailed link, to
   * reload and re-check. Returns `null` if nobody is signed in.
   */
  reloadCurrentUser(): Promise<AuthUser | null>;
}
