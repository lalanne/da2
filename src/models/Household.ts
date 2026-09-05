export interface Child {
  /** Client-generated, stable for the life of the household. Used by specs 004/005. */
  id: string;
  name: string;
  /** ISO yyyy-mm-dd, or null if unknown. */
  birthdate: string | null;
}

export interface Household {
  id: string;
  name: string;
  /** length 1 or 2; parentIds[0] is the creator. */
  parentIds: string[];
  children: Child[];
  /** The live, unredeemed invite code; null once redeemed. */
  pendingInviteCode: string | null;
  createdBy: string;
  createdAt: number;
}

export interface InviteCode {
  /** The code string — also the Firestore document id. */
  code: string;
  householdId: string;
  createdBy: string;
  createdAt: number;
  /** uid of the parent who redeemed it, or null. */
  redeemedBy: string | null;
}

export interface NewChildInput {
  name: string;
  birthdate: string | null;
}

export interface NewHouseholdInput {
  name: string;
  children: NewChildInput[];
}
