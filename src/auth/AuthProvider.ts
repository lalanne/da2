export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
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
