export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  householdId: string | null;
  /** Invite code this user redeemed to join their household; null for the creator (spec 002). */
  joinedVia: string | null;
  createdAt: number;
}
