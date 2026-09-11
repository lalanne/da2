import type { Receipt } from '../models/Receipt';
import type { Settlement } from '../models/Split';

/**
 * Split `amount` (integer, currency minor unit) by `percentA` into two integers
 * that sum **exactly** to `amount`. `parentIds[0]` gets the rounded share;
 * `parentIds[1]` gets the remainder. Deterministic.
 */
export function receiptShares(amount: number, percentA: number): { a: number; b: number } {
  const a = Math.round((amount * percentA) / 100);
  return { a, b: amount - a };
}

export interface Balance {
  /** Net that `parentIds[0]` owes `parentIds[1]`. Negative → the other way. */
  netAOwesB: number;
}

/**
 * Running balance over **shared** receipts (spec 010): the uploader is assumed
 * to have paid the full amount, so the other parent owes their computed share.
 * Confirmed settlements move the needle; private receipts are ignored.
 */
export function computeBalance(
  receipts: Receipt[],
  settlements: Settlement[],
  parentIds: [string, string],
): Balance {
  const [a, b] = parentIds;
  let netAOwesB = 0;

  for (const r of receipts) {
    if (r.visibility !== 'shared' || r.splitPercentA == null) continue;
    const { a: shareA, b: shareB } = receiptShares(r.amount, r.splitPercentA);
    if (r.uploaderId === a) {
      netAOwesB -= shareB; // A paid; B owes their share
    } else if (r.uploaderId === b) {
      netAOwesB += shareA; // B paid; A owes their share
    }
  }

  for (const s of settlements) {
    if (s.status !== 'confirmed') continue;
    if (s.payerUid === a && s.payeeUid === b) netAOwesB -= s.amount;
    else if (s.payerUid === b && s.payeeUid === a) netAOwesB += s.amount;
  }

  return { netAOwesB };
}
