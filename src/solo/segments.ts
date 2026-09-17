import type { Receipt } from '../models/Receipt';
import type { Settlement } from '../models/Split';
import { ABSENT_CO_PARENT } from '../models/Household';
import { computeBalance, type Balance } from '../split/shares';

/**
 * Spec 015 requirement 5 — the two-segment balance.
 *
 * A payment recorded while solo moves the balance directly, so if those were
 * permanently unchallengeable the first parent could author the whole ledger
 * before inviting. There is no clean fix — the balance is *inherently* one
 * parent's bookkeeping until both are present (they could equally skew it by
 * not recording money they received). So the app is honest about it instead
 * of pretending to resolve it: once a co-parent joins, the solo-period ledger
 * is shown **separately**, labelled as one parent's record, and accepting the
 * split table going forward never retroactively blesses it.
 */
export interface BalanceSegments {
  /**
   * The solo period, or null when there wasn't one (a household that never
   * ran solo, or one still solo — both render as a single figure, exactly as
   * before this spec).
   */
  solo: Balance | null;
  /** Everything else: while solo, that's the whole ledger; after a join, the agreed period. */
  agreed: Balance;
}

/** A settlement recorded while solo — self-identified by the sentinel uid. */
export function isSoloSettlement(settlement: Settlement): boolean {
  return (
    settlement.payerUid === ABSENT_CO_PARENT || settlement.payeeUid === ABSENT_CO_PARENT
  );
}

/** A receipt that entered the shared ledger before the co-parent joined. */
export function isSoloReceipt(receipt: Receipt, coParentJoinedAt: number | null): boolean {
  if (coParentJoinedAt == null) return false;
  return receipt.sharedAt != null && receipt.sharedAt < coParentJoinedAt;
}

export function computeBalanceSegments(
  receipts: Receipt[],
  settlements: Settlement[],
  parentIds: [string, string],
  coParentJoinedAt: number | null,
): BalanceSegments {
  // No recorded join → no solo period to separate out. This is also the case
  // for households that predate spec 015 (the pilot's), which correctly keep
  // rendering a single figure.
  if (coParentJoinedAt == null) {
    return { solo: null, agreed: computeBalance(receipts, settlements, parentIds) };
  }

  const soloReceipts = receipts.filter((r) => isSoloReceipt(r, coParentJoinedAt));
  const soloSettlements = settlements.filter(isSoloSettlement);

  if (soloReceipts.length === 0 && soloSettlements.length === 0) {
    return { solo: null, agreed: computeBalance(receipts, settlements, parentIds) };
  }

  const [a] = parentIds;
  return {
    // Side B was the sentinel at the time these were written, so the solo
    // segment must be computed against it for settlements to match.
    solo: computeBalance(soloReceipts, soloSettlements, [a, ABSENT_CO_PARENT]),
    agreed: computeBalance(
      receipts.filter((r) => !isSoloReceipt(r, coParentJoinedAt)),
      settlements.filter((s) => !isSoloSettlement(s)),
      parentIds,
    ),
  };
}
