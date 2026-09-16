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
  /** length 1 or 2; parentIds[0] is the creator. Append-only — spec 015's
   *  self-approval safety argument depends on it never shrinking. */
  parentIds: string[];
  children: Child[];
  /** The live, unredeemed invite code; null once redeemed. */
  pendingInviteCode: string | null;
  /** IANA timezone — canonical for the custody calendar (spec 004). */
  timezone: string;
  /** Spec 015 — display name for the absent co-parent while solo. Once a real
   *  co-parent joins, their profile displayName wins; this is kept, not
   *  deleted, so historical labels still read correctly. */
  coParentName: string | null;
  /** Spec 015 — when parentIds went 1 → 2. The boundary the balance splits on. */
  coParentJoinedAt: number | null;
  createdBy: string;
  createdAt: number;
}

/**
 * Spec 015 — stands in for the co-parent's uid on records created while the
 * household has only one parent (settlement `payerUid`/`payeeUid`, which are
 * uid-typed and have no second uid to point at).
 *
 * Never a real uid, so it can never equal `request.auth.uid`, and the rules
 * reject it appearing in `parentIds`. Because it can only have been written
 * while solo, it is **self-describing**: a settlement carrying it belongs to
 * the solo period, which is exactly what the two-segment balance needs.
 */
export const ABSENT_CO_PARENT = '__coparent__';

/** True when nobody else has joined yet — the spec-015 solo case. */
export function isSoloHousehold(household: Pick<Household, 'parentIds'>): boolean {
  return household.parentIds.length === 1;
}

/** Default household timezone until a settings screen lets a parent change it. */
export const DEFAULT_TIMEZONE = 'America/Santiago';

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
