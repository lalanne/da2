import type { ReceiptTag } from './Receipt';

/** The agreed split of shared expenses. `defaultPercentA` is `parentIds[0]`'s
 *  share (0–100); `parentIds[1]` gets the rest. `overrides` sets a different
 *  `parentIds[0]` share for specific receipt tags. */
export interface SplitTable {
  defaultPercentA: number;
  overrides: Partial<Record<ReceiptTag, number>>;
}

export type SplitProposalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface SplitProposal extends SplitTable {
  id: string;
  proposerId: string;
  status: SplitProposalStatus;
  createdAt: number;
  resolvedAt: number | null;
  resolvedBy: string | null;
}

export type NewSplitProposalInput = SplitTable;

export type SettlementStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export interface Settlement {
  id: string;
  recordedBy: string;
  status: SettlementStatus;
  /** The parent who paid, and the one who received. Both are household parentIds. */
  payerUid: string;
  payeeUid: string;
  amount: number; // integer, currency minor unit, > 0
  currency: string; // 'CLP' in v1
  note: string | null;
  createdAt: number;
  resolvedAt: number | null;
  resolvedBy: string | null;
}

export interface NewSettlementInput {
  payerUid: string;
  payeeUid: string;
  amount: number;
  currency: string;
  note: string | null;
}

/** Steps the split editor moves in (spec 010 UI). */
export const SPLIT_STEP = 5;
