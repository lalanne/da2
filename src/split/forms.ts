import { strings } from '../i18n/strings';
import { parseAmount } from '../receipts/money';
import { RECEIPT_TAGS, isReceiptTag, type ReceiptTag } from '../models/Receipt';
import type { NewSettlementInput, NewSplitProposalInput } from '../models/Split';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const inRange = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;

export interface SplitFormState {
  defaultPercentA: number;
  /** Only tags the user has added a rule for. */
  overrides: Partial<Record<ReceiptTag, number>>;
}

export function buildSplitProposalInput(f: SplitFormState): Result<NewSplitProposalInput> {
  const e = strings.split.errors;
  if (!inRange(f.defaultPercentA)) return { ok: false, error: e.badPercent };
  const overrides: Partial<Record<ReceiptTag, number>> = {};
  for (const [tag, pct] of Object.entries(f.overrides)) {
    if (!isReceiptTag(tag)) return { ok: false, error: e.badPercent };
    if (pct == null) continue;
    if (!inRange(pct)) return { ok: false, error: e.badPercent };
    overrides[tag] = pct;
  }
  return { ok: true, value: { defaultPercentA: f.defaultPercentA, overrides } };
}

/** Clamp a stepper move to 0…100. */
export function stepPercent(current: number, delta: number): number {
  return Math.max(0, Math.min(100, current + delta));
}

export interface SettlementFormState {
  /** true = "I paid them", false = "they paid me". */
  iPaid: boolean;
  amount: string;
  note: string;
  currency: string;
}

export function buildSettlementInput(
  f: SettlementFormState,
  me: string,
  other: string,
): Result<NewSettlementInput> {
  const e = strings.split.errors;
  const amount = parseAmount(f.amount, f.currency);
  if (amount == null || amount <= 0) return { ok: false, error: e.badAmount };
  return {
    ok: true,
    value: {
      payerUid: f.iPaid ? me : other,
      payeeUid: f.iPaid ? other : me,
      amount,
      currency: f.currency,
      note: f.note.trim() || null,
    },
  };
}

export { RECEIPT_TAGS };
