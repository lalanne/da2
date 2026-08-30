export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  householdId: string | null;
  createdAt: number;
}
